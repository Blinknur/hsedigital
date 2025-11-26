import express from 'express';
import { getCurrentRegion, getAllRegions, getRegionForTenant, setTenantRegionPreference } from '../config/multiRegion.js';
import { replicaManager } from '../../shared/utils/databaseReplicaManager.js';
import { redisClusterManager } from '../../shared/utils/redisClusterManager.js';
import { failoverManager } from '../../core/services/failoverManager.js';
import { logger } from '../../shared/utils/logger.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const currentRegion = getCurrentRegion();
    const allRegions = getAllRegions();
    
    const dbHealth = replicaManager.getHealthStatus();
    const redisHealth = redisClusterManager.getHealthStatus();
    const failoverStatus = failoverManager.getStatus();

    res.json({
      currentRegion: {
        id: currentRegion.id,
        name: currentRegion.name,
        primary: currentRegion.primary,
      },
      allRegions: allRegions.map(r => ({
        id: r.id,
        name: r.name,
        primary: r.primary,
        priority: r.priority,
      })),
      health: {
        database: dbHealth,
        redis: redisHealth,
        failover: failoverStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get multi-region status');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.get('/regions', async (req, res) => {
  try {
    const regions = getAllRegions();
    res.json({
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
        primary: r.primary,
        priority: r.priority,
        loadBalancer: r.loadBalancer,
      })),
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get regions');
    res.status(500).json({ error: 'Failed to get regions' });
  }
});

router.get('/tenant/:tenantId/region', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const region = getRegionForTenant(tenantId);
    
    res.json({
      tenantId,
      region: {
        id: region.id,
        name: region.name,
      },
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get tenant region');
    res.status(500).json({ error: 'Failed to get tenant region' });
  }
});

router.post('/tenant/:tenantId/region', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { regionKey } = req.body;

    if (!regionKey) {
      return res.status(400).json({ error: 'regionKey is required' });
    }

    await setTenantRegionPreference(tenantId, regionKey);
    
    logger.info({ tenantId, regionKey }, 'Tenant region preference updated');
    
    res.json({
      tenantId,
      regionKey,
      message: 'Region preference updated successfully',
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to set tenant region preference');
    res.status(400).json({ error: error.message });
  }
});

router.get('/health/database', async (req, res) => {
  try {
    const health = replicaManager.getHealthStatus();
    const isHealthy = health.primary || health.healthy > 0;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: health,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Database health check failed');
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

router.get('/health/redis', async (req, res) => {
  try {
    const health = redisClusterManager.getHealthStatus();
    const isHealthy = health.healthy > 0;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: health,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Redis health check failed');
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

router.get('/health/failover', async (req, res) => {
  try {
    const status = failoverManager.getStatus();
    
    res.json({
      status: 'ok',
      failover: status,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failover status check failed');
    res.status(500).json({ error: error.message });
  }
});

router.post('/failover/manual', async (req, res) => {
  try {
    const { targetRegionId } = req.body;
    
    if (!targetRegionId) {
      return res.status(400).json({ error: 'targetRegionId is required' });
    }

    logger.warn({ targetRegionId }, 'Manual failover initiated');
    
    res.json({
      message: 'Manual failover initiated',
      targetRegionId,
      note: 'This is a placeholder - implement actual failover logic',
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Manual failover failed');
    res.status(500).json({ error: error.message });
  }
});

export default router;
