import express from 'express';
import prisma from '../../shared/utils/db.js';
import Redis from 'ioredis';

const router = express.Router();

let redisClient;

const initClients = () => {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true
    });
  }
};

const checkDatabase = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: 'Database connection failed',
      error: error.message 
    };
  }
};

const checkRedis = async () => {
  try {
    if (redisClient.status !== 'ready') {
      await redisClient.connect();
    }
    await redisClient.ping();
    return { status: 'healthy', message: 'Redis connection successful' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: 'Redis connection failed',
      error: error.message 
    };
  }
};

router.get('/health', async (req, res) => {
  initClients();
  
  const startTime = Date.now();
  const checks = {
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };

  try {
    checks.database = await checkDatabase();
  } catch (error) {
    checks.database = { 
      status: 'unhealthy', 
      error: error.message 
    };
  }

  try {
    checks.redis = await checkRedis();
  } catch (error) {
    checks.redis = { 
      status: 'unhealthy', 
      error: error.message 
    };
  }

  const responseTime = Date.now() - startTime;
  const isHealthy = checks.database.status === 'healthy' && checks.redis.status === 'healthy';
  
  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'hse-digital',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks,
    responseTime: `${responseTime}ms`
  };

  res.status(isHealthy ? 200 : 503).json(response);
});

router.get('/ready', async (req, res) => {
  initClients();
  
  try {
    const dbCheck = await checkDatabase();
    const redisCheck = await checkRedis();
    
    if (dbCheck.status === 'healthy' && redisCheck.status === 'healthy') {
      res.status(200).json({ 
        status: 'ready',
        message: 'Service is ready to accept traffic'
      });
    } else {
      res.status(503).json({ 
        status: 'not ready',
        message: 'Service is not ready',
        database: dbCheck,
        redis: redisCheck
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      error: error.message 
    });
  }
});

router.get('/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    message: 'Service is alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
