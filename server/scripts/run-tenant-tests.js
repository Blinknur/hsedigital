#!/usr/bin/env node

import { execSync } from 'child_process';
import { setTimeout } from 'timers/promises';

async function runTests() {
  console.log('🔧 Setting up test environment...\n');

  try {
    console.log('1️⃣  Checking PostgreSQL...');
    try {
      execSync('pg_isready -h localhost -p 5432', { stdio: 'ignore' });
      console.log('   ✅ PostgreSQL is running\n');
    } catch (error) {
      console.log('   ⚠️  PostgreSQL is not running');
      console.log('   📝 Please start PostgreSQL:');
      console.log('      brew services start postgresql@14');
      console.log('      or: pg_ctl -D /opt/homebrew/var/postgresql@14 start\n');
      process.exit(1);
    }

    console.log('2️⃣  Checking database exists...');
    try {
      const dbUrl = process.env.DATABASE_URL || 'postgresql://hse_admin:dev_password_123@localhost:5432/hse_platform';
      process.env.DATABASE_URL = dbUrl;
      
      execSync('npx prisma db push --skip-generate --accept-data-loss', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: dbUrl }
      });
      console.log('   ✅ Database ready\n');
    } catch (error) {
      console.log('   ❌ Failed to setup database');
      console.log('   Error:', error.message);
      process.exit(1);
    }

    console.log('3️⃣  Running tenant isolation tests...\n');
    execSync('npm run test:integration', { stdio: 'inherit' });

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

runTests();
