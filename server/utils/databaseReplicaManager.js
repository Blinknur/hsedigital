import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { getCurrentRegion, getFailoverRegions } from '../config/multiRegion.js';

class DatabaseReplicaManager {
  constructor() {
    this.clients = new Map();
    this.replicaHealth = new Map();
    this.primaryClient = null;
    this.replicaClients = [];
    this.readReplicaIndex = 0;
    this.healthCheckInterval = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    const currentRegion = getCurrentRegion();
    
    if (currentRegion.database.primary) {
      this.primaryClient = this.createClient(currentRegion.database.primary, 'primary');
      this.clients.set('primary', this.primaryClient);
      logger.info({ region: currentRegion.name }, 'Primary database client initialized');
    }

    if (currentRegion.database.replica) {
      const replicaClient = this.createClient(currentRegion.database.replica, 'replica-1');
      this.replicaClients.push(replicaClient);
      this.clients.set('replica-1', replicaClient);
      this.replicaHealth.set('replica-1', { healthy: true, lastCheck: Date.now() });
      logger.info({ region: currentRegion.name }, 'Read replica initialized');
    }

    const failoverRegions = getFailoverRegions(currentRegion.id);
    for (const region of failoverRegions) {
      if (region.database.replica) {
        const clientKey = `${region.id}-replica`;
        const replicaClient = this.createClient(region.database.replica, clientKey);
        this.replicaClients.push(replicaClient);
        this.clients.set(clientKey, replicaClient);
        this.replicaHealth.set(clientKey, { healthy: true, lastCheck: Date.now() });
        logger.info({ region: region.name }, 'Cross-region read replica initialized');
      }
    }

    this.startHealthChecks();
    this.isInitialized = true;
    
    logger.info({
      primary: !!this.primaryClient,
      replicas: this.replicaClients.length,
      totalClients: this.clients.size,
    }, 'Database replica manager initialized');
  }

  createClient(url, name) {
    const client = new PrismaClient({
      datasources: {
        db: { url }
      },
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    client.$on('error', (e) => {
      logger.error({ name, error: e.message }, 'Database client error');
      this.markUnhealthy(name);
    });

    return client;
  }

  getPrimaryClient() {
    return this.primaryClient;
  }

  getReadClient() {
    if (this.replicaClients.length === 0) {
      return this.primaryClient;
    }

    const healthyReplicas = this.replicaClients.filter((_, index) => {
      const key = Array.from(this.replicaHealth.keys())[index];
      return this.replicaHealth.get(key)?.healthy;
    });

    if (healthyReplicas.length === 0) {
      logger.warn('No healthy read replicas available, falling back to primary');
      return this.primaryClient;
    }

    this.readReplicaIndex = (this.readReplicaIndex + 1) % healthyReplicas.length;
    return healthyReplicas[this.readReplicaIndex];
  }

  async executeRead(operation) {
    const client = this.getReadClient();
    try {
      return await operation(client);
    } catch (error) {
      logger.error({ error: error.message }, 'Read operation failed on replica, retrying on primary');
      return await operation(this.primaryClient);
    }
  }

  async executeWrite(operation) {
    if (!this.primaryClient) {
      throw new Error('No primary database client available');
    }
    return await operation(this.primaryClient);
  }

  markUnhealthy(clientKey) {
    if (this.replicaHealth.has(clientKey)) {
      this.replicaHealth.set(clientKey, {
        healthy: false,
        lastCheck: Date.now(),
      });
      logger.warn({ clientKey }, 'Database client marked as unhealthy');
    }
  }

  markHealthy(clientKey) {
    if (this.replicaHealth.has(clientKey)) {
      this.replicaHealth.set(clientKey, {
        healthy: true,
        lastCheck: Date.now(),
      });
    }
  }

  async checkHealth(client, clientKey) {
    try {
      await client.$queryRaw`SELECT 1`;
      this.markHealthy(clientKey);
      return true;
    } catch (error) {
      logger.error({ clientKey, error: error.message }, 'Health check failed');
      this.markUnhealthy(clientKey);
      return false;
    }
  }

  startHealthChecks() {
    const interval = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000');
    
    this.healthCheckInterval = setInterval(async () => {
      const checks = [];
      
      for (const [key, client] of this.clients.entries()) {
        if (key !== 'primary') {
          checks.push(this.checkHealth(client, key));
        }
      }
      
      await Promise.all(checks);
      
      const healthyCount = Array.from(this.replicaHealth.values()).filter(h => h.healthy).length;
      logger.debug({
        total: this.replicaHealth.size,
        healthy: healthyCount,
        unhealthy: this.replicaHealth.size - healthyCount,
      }, 'Database health check completed');
    }, interval);
  }

  async disconnect() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const disconnectPromises = Array.from(this.clients.values()).map(client =>
      client.$disconnect().catch(err =>
        logger.error({ err }, 'Error disconnecting database client')
      )
    );

    await Promise.all(disconnectPromises);
    logger.info('All database clients disconnected');
  }

  getHealthStatus() {
    const status = {
      primary: !!this.primaryClient,
      replicas: [],
      healthy: 0,
      unhealthy: 0,
    };

    for (const [key, health] of this.replicaHealth.entries()) {
      status.replicas.push({
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

export const replicaManager = new DatabaseReplicaManager();
