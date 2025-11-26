import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { execSync } from 'child_process';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

export default async function globalSetup() {
  console.log('\n🚀 Starting Global Test Setup...\n');

  const startTime = Date.now();

  try {
    if (process.env.CI !== 'true') {
      console.log('📊 Running database migrations...');
      try {
        execSync('npx prisma db push --skip-generate', {
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
        });
        console.log('✅ Database migrations completed\n');
      } catch (error) {
        console.warn('⚠️  Database migration skipped (may already be up to date)\n');
      }
    }

    console.log('🔍 Verifying database connection...');
    const prisma = new PrismaClient({
      datasources: {
        db: { url: TEST_DATABASE_URL }
      }
    });

    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified\n');
    await prisma.$disconnect();

    console.log('🔍 Verifying Redis connection...');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true
    });

    try {
      await redis.connect();
      await redis.ping();
      console.log('✅ Redis connection verified\n');
    } catch (error) {
      console.warn('⚠️  Redis connection failed (some tests may be skipped)\n');
    } finally {
      redis.disconnect();
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Global setup completed in ${duration}ms\n`);

  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  }
}
