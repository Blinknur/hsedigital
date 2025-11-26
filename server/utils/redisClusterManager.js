import Redis from 'ioredis';
import { logger } from './logger.js';
import { getCurrentRegion, getFailoverRegions } from '../config/multiRegion.js';

class RedisClusterManager {
  constructor() {
    this.primaryCluster = null;
    this.replicaClusters = new Map();
    this.sentinelClients = new Map();
    this.clusterHealth = new Map();
    this.healthCheckInterval = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    const currentRegion = getCurrentRegion();
    const mode = process.env.REDIS_MODE || 'standalone';

    if (mode === 'cluster') {
      await this.initializeCluster(currentRegion);
    } else if (mode === 'sentinel') {
      await this.initializeSentinel(currentRegion);
    } else {
      await this.initializeStandalone(currentRegion);
    }

    const failoverRegions = getFailoverRegions(currentRegion.id);
    for (const region of failoverRegions) {
      if (region.redis.nodes.length > 0) {
        await this.initializeReplicaCluster(region);
      }
    }

    this.startHealthChecks();
    this.isInitialized = true;
    
    logger.info({
      mode,
      region: currentRegion.name,
      replicas: this.replicaClusters.size,
    }, 'Redis cluster manager initialized');
  }

  async initializeStandalone(region) {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error('Redis connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    this.primaryCluster = new Redis(config);
    this.setupClientEventHandlers(this.primaryCluster, 'primary');
    this.clusterHealth.set('primary', { healthy: true, lastCheck: Date.now() });
    
    logger.info('Redis standalone client initialized');
  }

  async initializeCluster(region) {
    if (region.redis.nodes.length === 0) {
      logger.warn('No Redis cluster nodes configured, falling back to standalone');
      await this.initializeStandalone(region);
      return;
    }

    const nodes = region.redis.nodes.map(node => {
      const [host, port] = node.split(':');
      return { host, port: parseInt(port) };
    });

    this.primaryCluster = new Redis.Cluster(nodes, {
      redisOptions: {
        password: process.env.REDIS_PASSWORD || undefined,
      },
      clusterRetryStrategy: (times) => {
        if (times > 10) {
          logger.error('Redis cluster connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      enableReadyCheck: true,
      scaleReads: 'slave',
    });

    this.setupClientEventHandlers(this.primaryCluster, 'primary');
    this.clusterHealth.set('primary', { healthy: true, lastCheck: Date.now() });
    
    logger.info({ nodes: nodes.length }, 'Redis cluster initialized');
  }

  async initializeSentinel(region) {
    if (region.redis.sentinels.length === 0) {
      logger.warn('No Redis sentinels configured, falling back to standalone');
      await this.initializeStandalone(region);
      return;
    }

    const config = {
      sentinels: region.redis.sentinels,
      name: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
      password: process.env.REDIS_PASSWORD || undefined,
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error('Redis sentinel connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      enableReadyCheck: true,
    };

    this.primaryCluster = new Redis(config);
    this.setupClientEventHandlers(this.primaryCluster, 'primary');
    this.clusterHealth.set('primary', { healthy: true, lastCheck: Date.now() });
    
    logger.info({ sentinels: region.redis.sentinels.length }, 'Redis sentinel initialized');
  }

  async initializeReplicaCluster(region) {
    const key = `replica-${region.id}`;
    
    try {
      let client;
      
      if (region.redis.nodes.length > 0) {
        const nodes = region.redis.nodes.map(node => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port) };
        });
        
        client = new Redis.Cluster(nodes, {
          redisOptions: {
            password: process.env.REDIS_PASSWORD || undefined,
          },
          clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
          scaleReads: 'slave',
        });
      } else {
        logger.debug({ region: region.id }, 'No replica cluster nodes configured');
        return;
      }

      this.setupClientEventHandlers(client, key);
      this.replicaClusters.set(key, client);
      this.clusterHealth.set(key, { healthy: true, lastCheck: Date.now() });
      
      logger.info({ region: region.name }, 'Replica Redis cluster initialized');
    } catch (error) {
      logger.error({ region: region.id, error: error.message }, 'Failed to initialize replica cluster');
    }
  }

  setupClientEventHandlers(client, name) {
    client.on('error', (err) => {
      logger.error({ name, error: err.message }, 'Redis client error');
      this.markUnhealthy(name);
    });

    client.on('connect', () => {
      logger.info({ name }, 'Redis client connected');
      this.markHealthy(name);
    });

    client.on('ready', () => {
      logger.info({ name }, 'Redis client ready');
      this.markHealthy(name);
    });

    client.on('reconnecting', () => {
      logger.warn({ name }, 'Redis client reconnecting');
    });

    client.on('close', () => {
      logger.warn({ name }, 'Redis client connection closed');
      this.markUnhealthy(name);
    });
  }

  getPrimaryClient() {
    return this.primaryCluster;
  }

  getClient(regionPreference = null) {
    if (regionPreference) {
      const replicaKey = `replica-${regionPreference}`;
      const replica = this.replicaClusters.get(replicaKey);
      const health = this.clusterHealth.get(replicaKey);
      
      if (replica && health?.healthy) {
        return replica;
      }
    }

    const primaryHealth = this.clusterHealth.get('primary');
    if (primaryHealth?.healthy) {
      return this.primaryCluster;
    }

    for (const [key, client] of this.replicaClusters.entries()) {
      const health = this.clusterHealth.get(key);
      if (health?.healthy) {
        logger.warn({ fallback: key }, 'Using replica cluster as primary is unhealthy');
        return client;
      }
    }

    logger.error('No healthy Redis clusters available');
    return this.primaryCluster;
  }

  async executeCommand(command, args, options = {}) {
    const { regionPreference, retryOnFailure = true } = options;
    const client = this.getClient(regionPreference);

    try {
      return await client[command](...args);
    } catch (error) {
      logger.error({ command, error: error.message }, 'Redis command failed');
      
      if (retryOnFailure && client !== this.primaryCluster) {
        logger.info('Retrying command on primary cluster');
        return await this.primaryCluster[command](...args);
      }
      
      throw error;
    }
  }

  async get(key, options) {
    return await this.executeCommand('get', [key], options);
  }

  async set(key, value, options) {
    return await this.executeCommand('set', [key, value], options);
  }

  async setex(key, seconds, value, options) {
    return await this.executeCommand('setex', [key, seconds, value], options);
  }

  async del(key, options) {
    return await this.executeCommand('del', [key], options);
  }

  async incr(key, options) {
    return await this.executeCommand('incr', [key], options);
  }

  async expire(key, seconds, options) {
    return await this.executeCommand('expire', [key, seconds], options);
  }

  async hget(key, field, options) {
    return await this.executeCommand('hget', [key, field], options);
  }

  async hset(key, field, value, options) {
    return await this.executeCommand('hset', [key, field, value], options);
  }

  async hgetall(key, options) {
    return await this.executeCommand('hgetall', [key], options);
  }

  multi() {
    return this.primaryCluster.multi();
  }

  pipeline() {
    return this.primaryCluster.pipeline();
  }

  markUnhealthy(clientKey) {
    if (this.clusterHealth.has(clientKey)) {
      this.clusterHealth.set(clientKey, {
        healthy: false,
        lastCheck: Date.now(),
      });
      logger.warn({ clientKey }, 'Redis client marked as unhealthy');
    }
  }

  markHealthy(clientKey) {
    if (this.clusterHealth.has(clientKey)) {
      this.clusterHealth.set(clientKey, {
        healthy: true,
        lastCheck: Date.now(),
      });
    }
  }

  async checkHealth(client, clientKey) {
    try {
      await client.ping();
      this.markHealthy(clientKey);
      return true;
    } catch (error) {
      logger.error({ clientKey, error: error.message }, 'Redis health check failed');
      this.markUnhealthy(clientKey);
      return false;
    }
  }

  startHealthChecks() {
    const interval = parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL || '30000');
    
    this.healthCheckInterval = setInterval(async () => {
      const checks = [this.checkHealth(this.primaryCluster, 'primary')];
      
      for (const [key, client] of this.replicaClusters.entries()) {
        checks.push(this.checkHealth(client, key));
      }
      
      await Promise.all(checks);
      
      const healthyCount = Array.from(this.clusterHealth.values()).filter(h => h.healthy).length;
      logger.debug({
        total: this.clusterHealth.size,
        healthy: healthyCount,
        unhealthy: this.clusterHealth.size - healthyCount,
      }, 'Redis health check completed');
    }, interval);
  }

  async disconnect() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const disconnectPromises = [];
    
    if (this.primaryCluster) {
      disconnectPromises.push(
        this.primaryCluster.quit().catch(err =>
          logger.error({ err }, 'Error disconnecting primary Redis client')
        )
      );
    }

    for (const [key, client] of this.replicaClusters.entries()) {
      disconnectPromises.push(
        client.quit().catch(err =>
          logger.error({ key, err }, 'Error disconnecting replica Redis client')
        )
      );
    }

    await Promise.all(disconnectPromises);
    logger.info('All Redis clients disconnected');
  }

  getHealthStatus() {
    const status = {
      clusters: [],
      healthy: 0,
      unhealthy: 0,
    };

    for (const [key, health] of this.clusterHealth.entries()) {
      status.clusters.push({
        name: key,
        healthy: health.healthy,
        lastCheck: health.lastCheck,
      });
      
      if (health.healthy) {
        status.healthy++;
      } else {
        status.unhealthy++;
      }
    }

    return status;
  }
}

export const redisClusterManager = new RedisClusterManager();
