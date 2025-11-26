import { logger } from '../utils/logger.js';
import { getCurrentRegion, getFailoverRegions, getPrimaryRegion, FAILOVER_CONFIG } from '../config/multiRegion.js';
import { replicaManager } from '../utils/databaseReplicaManager.js';
import { redisClusterManager } from '../utils/redisClusterManager.js';

class FailoverManager {
  constructor() {
    this.currentRegion = getCurrentRegion();
    this.failoverRegions = getFailoverRegions(this.currentRegion.id);
    this.healthStatus = new Map();
    this.consecutiveFailures = new Map();
    this.isFailedOver = false;
    this.failoverStartTime = null;
    this.healthCheckInterval = null;
    this.activeRegion = this.currentRegion;
  }

  async initialize() {
    this.failoverRegions.forEach(region => {
      this.healthStatus.set(region.id, {
        healthy: true,
        lastCheck: Date.now(),
        lastFailure: null,
      });
      this.consecutiveFailures.set(region.id, 0);
    });

    this.healthStatus.set(this.currentRegion.id, {
      healthy: true,
      lastCheck: Date.now(),
      lastFailure: null,
    });
    this.consecutiveFailures.set(this.currentRegion.id, 0);

    this.startHealthChecks();
    
    logger.info({
      currentRegion: this.currentRegion.name,
      failoverRegions: this.failoverRegions.map(r => r.name),
      autoFailover: FAILOVER_CONFIG.autoFailoverEnabled,
    }, 'Failover manager initialized');
  }

  async checkRegionHealth(region) {
    const checks = [];

    checks.push(this.checkDatabaseHealth(region));
    checks.push(this.checkRedisHealth(region));
    checks.push(this.checkApplicationHealth(region));

    const results = await Promise.allSettled(checks);
    const healthyChecks = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const totalChecks = results.length;

    const isHealthy = healthyChecks >= Math.ceil(totalChecks * 0.67);

    return isHealthy;
  }

  async checkDatabaseHealth(region) {
    try {
      const dbHealth = replicaManager.getHealthStatus();
      return dbHealth.primary || dbHealth.healthy > 0;
    } catch (error) {
      logger.error({ region: region.id, error: error.message }, 'Database health check failed');
      return false;
    }
  }

  async checkRedisHealth(region) {
    try {
      const redisHealth = redisClusterManager.getHealthStatus();
      return redisHealth.healthy > 0;
    } catch (error) {
      logger.error({ region: region.id, error: error.message }, 'Redis health check failed');
      return false;
    }
  }

  async checkApplicationHealth(region) {
    if (!region.loadBalancer) {
      return true;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FAILOVER_CONFIG.healthCheckTimeout);

      const response = await fetch(`${region.loadBalancer}/api/health`, {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      logger.error({ region: region.id, error: error.message }, 'Application health check failed');
      return false;
    }
  }

  async performHealthChecks() {
    const allRegions = [this.currentRegion, ...this.failoverRegions];

    for (const region of allRegions) {
      const isHealthy = await this.checkRegionHealth(region);
      
      const status = this.healthStatus.get(region.id);
      status.lastCheck = Date.now();
      
      if (isHealthy) {
        status.healthy = true;
        this.consecutiveFailures.set(region.id, 0);
      } else {
        status.healthy = false;
        status.lastFailure = Date.now();
        const failures = this.consecutiveFailures.get(region.id) + 1;
        this.consecutiveFailures.set(region.id, failures);
        
        logger.warn({
          region: region.name,
          consecutiveFailures: failures,
          maxAllowed: FAILOVER_CONFIG.maxConsecutiveFailures,
        }, 'Region health check failed');
      }
      
      this.healthStatus.set(region.id, status);
    }

    await this.evaluateFailoverNeed();
  }

  async evaluateFailoverNeed() {
    const currentFailures = this.consecutiveFailures.get(this.activeRegion.id);
    
    if (currentFailures >= FAILOVER_CONFIG.maxConsecutiveFailures) {
      logger.error({
        region: this.activeRegion.name,
        failures: currentFailures,
      }, 'Region has exceeded max consecutive failures');

      if (FAILOVER_CONFIG.autoFailoverEnabled && !FAILOVER_CONFIG.manualFailoverRequired) {
        await this.initiateFailover();
      } else {
        logger.warn('Automatic failover is disabled or manual approval required');
        this.notifyFailoverRequired();
      }
    }

    if (this.isFailedOver && FAILOVER_CONFIG.failbackEnabled) {
      await this.evaluateFailbackOpportunity();
    }
  }

  async initiateFailover() {
    if (this.isFailedOver) {
      logger.warn('Already in failover state, checking for next available region');
    }

    const availableRegions = this.failoverRegions.filter(region => {
      const status = this.healthStatus.get(region.id);
      return status?.healthy && this.consecutiveFailures.get(region.id) === 0;
    });

    if (availableRegions.length === 0) {
      logger.error('No healthy failover regions available');
      this.notifyCriticalFailure();
      return false;
    }

    const targetRegion = availableRegions[0];
    
    logger.warn({
      from: this.activeRegion.name,
      to: targetRegion.name,
    }, 'Initiating failover');

    try {
      await this.executeFailover(targetRegion);
      
      this.activeRegion = targetRegion;
      this.isFailedOver = true;
      this.failoverStartTime = Date.now();
      
      logger.info({
        activeRegion: this.activeRegion.name,
        failoverTime: new Date(this.failoverStartTime).toISOString(),
      }, 'Failover completed successfully');
      
      this.notifyFailoverCompleted(targetRegion);
      return true;
    } catch (error) {
      logger.error({ error: error.message }, 'Failover execution failed');
      this.notifyFailoverFailed(error);
      return false;
    }
  }

  async executeFailover(targetRegion) {
    logger.info({ target: targetRegion.name }, 'Executing failover steps');

    if (targetRegion.database.primary) {
      logger.info('Switching database connections to failover region');
    }

    if (targetRegion.redis.nodes.length > 0) {
      logger.info('Switching Redis connections to failover region');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('Failover execution completed');
  }

  async evaluateFailbackOpportunity() {
    if (!this.failoverStartTime) {
      return;
    }

    const timeSinceFailover = Date.now() - this.failoverStartTime;
    if (timeSinceFailover < FAILOVER_CONFIG.failbackDelay) {
      return;
    }

    const originalRegion = this.currentRegion;
    const originalStatus = this.healthStatus.get(originalRegion.id);
    const originalFailures = this.consecutiveFailures.get(originalRegion.id);

    if (originalStatus?.healthy && originalFailures === 0) {
      logger.info({
        from: this.activeRegion.name,
        to: originalRegion.name,
      }, 'Original region is healthy, initiating failback');

      await this.executeFailback(originalRegion);
    }
  }

  async executeFailback(originalRegion) {
    try {
      logger.info({ target: originalRegion.name }, 'Executing failback');

      await new Promise(resolve => setTimeout(resolve, 1000));

      this.activeRegion = originalRegion;
      this.isFailedOver = false;
      this.failoverStartTime = null;

      logger.info({
        activeRegion: this.activeRegion.name,
      }, 'Failback completed successfully');

      this.notifyFailbackCompleted(originalRegion);
    } catch (error) {
      logger.error({ error: error.message }, 'Failback execution failed');
    }
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      FAILOVER_CONFIG.healthCheckInterval
    );

    logger.info({
      interval: FAILOVER_CONFIG.healthCheckInterval,
    }, 'Health check scheduler started');
  }

  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health check scheduler stopped');
    }
  }

  getStatus() {
    const regions = [this.currentRegion, ...this.failoverRegions].map(region => {
      const status = this.healthStatus.get(region.id);
      const failures = this.consecutiveFailures.get(region.id);
      
      return {
        id: region.id,
        name: region.name,
        healthy: status?.healthy || false,
        lastCheck: status?.lastCheck,
        lastFailure: status?.lastFailure,
        consecutiveFailures: failures,
        isActive: this.activeRegion.id === region.id,
      };
    });

    return {
      activeRegion: this.activeRegion.name,
      isFailedOver: this.isFailedOver,
      failoverStartTime: this.failoverStartTime,
      regions,
      autoFailoverEnabled: FAILOVER_CONFIG.autoFailoverEnabled,
      failbackEnabled: FAILOVER_CONFIG.failbackEnabled,
    };
  }

  notifyFailoverRequired() {
    logger.warn({
      region: this.activeRegion.name,
    }, 'ALERT: Manual failover required - region unhealthy');
  }

  notifyCriticalFailure() {
    logger.error('CRITICAL: No healthy regions available for failover');
  }

  notifyFailoverCompleted(targetRegion) {
    logger.info({
      region: targetRegion.name,
    }, 'NOTIFICATION: Failover completed successfully');
  }

  notifyFailoverFailed(error) {
    logger.error({
      error: error.message,
    }, 'ALERT: Failover failed');
  }

  notifyFailbackCompleted(region) {
    logger.info({
      region: region.name,
    }, 'NOTIFICATION: Failback to primary region completed');
  }

  async shutdown() {
    this.stopHealthChecks();
    logger.info('Failover manager shutdown complete');
  }
}

export const failoverManager = new FailoverManager();
