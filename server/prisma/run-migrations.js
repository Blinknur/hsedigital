import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const MIGRATIONS = [
    '20240101000000_add_user_auth_fields',
    '20240101000001_add_organization_stripe_fields',
    '20240101000002_add_tenant_indexes'
];

async function runMigration(migrationName, direction = 'up') {
    const migrationPath = path.join(__dirname, 'migrations', migrationName);
    const sqlFile = direction === 'up' ? 'migration.sql' : 'down.sql';
    const sqlPath = path.join(migrationPath, sqlFile);

    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ Migration file not found: ${sqlPath}`);
        return false;
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    try {
        console.log(`${direction === 'up' ? '⬆️' : '⬇️'} Running ${migrationName} (${direction})...`);
        await prisma.$executeRawUnsafe(sql);
        console.log(`✅ Successfully executed ${migrationName} (${direction})`);
        return true;
    } catch (error) {
        console.error(`❌ Error executing ${migrationName} (${direction}):`, error.message);
        return false;
    }
}

async function applyMigrations() {
    console.log('🚀 Applying migrations...\n');
    
    for (const migration of MIGRATIONS) {
        const success = await runMigration(migration, 'up');
        if (!success) {
            console.error('\n❌ Migration failed. Stopping...');
            process.exit(1);
        }
    }
    
    console.log('\n✅ All migrations applied successfully!');
}

async function rollbackMigrations() {
    console.log('🔄 Rolling back migrations...\n');
    
    for (const migration of [...MIGRATIONS].reverse()) {
        const success = await runMigration(migration, 'down');
        if (!success) {
            console.error('\n❌ Rollback failed. Stopping...');
            process.exit(1);
        }
    }
    
    console.log('\n✅ All migrations rolled back successfully!');
}

async function main() {
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'up':
            case 'apply':
                await applyMigrations();
                break;
            case 'down':
            case 'rollback':
                await rollbackMigrations();
                break;
            default:
                console.log('Usage:');
                console.log('  node run-migrations.js up       - Apply all migrations');
                console.log('  node run-migrations.js down     - Rollback all migrations');
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
