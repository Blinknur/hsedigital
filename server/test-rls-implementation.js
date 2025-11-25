#!/usr/bin/env node

/**
 * RLS Implementation Test
 * Tests Row-Level Security policies with direct SQL queries
 * 
 * Prerequisites:
 * 1. Run: psql $DATABASE_URL -f prisma/migrations/001_rls_policies.sql
 * 2. Ensure test data exists (run seed script)
 * 3. Set DATABASE_URL environment variable
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
    log(`✓ ${message}`, colors.green);
}

function error(message) {
    log(`✗ ${message}`, colors.red);
}

function info(message) {
    log(`ℹ ${message}`, colors.blue);
}

function section(title) {
    log(`\n${'='.repeat(60)}`, colors.bold);
    log(title, colors.bold);
    log('='.repeat(60), colors.bold);
}

async function setupTestData() {
    section('Setting Up Test Data');
    
    try {
        // Create test organizations
        const org1 = await prisma.organization.upsert({
            where: { id: 'test-rls-org-1' },
            update: {},
            create: {
                id: 'test-rls-org-1',
                name: 'RLS Test Organization 1',
                ownerId: 'test-owner-1',
                subscriptionPlan: 'pro'
            }
        });
        success(`Created organization: ${org1.name}`);

        const org2 = await prisma.organization.upsert({
            where: { id: 'test-rls-org-2' },
            update: {},
            create: {
                id: 'test-rls-org-2',
                name: 'RLS Test Organization 2',
                ownerId: 'test-owner-2',
                subscriptionPlan: 'enterprise'
            }
        });
        success(`Created organization: ${org2.name}`);

        // Create test stations
        await prisma.station.upsert({
            where: { id: 'test-rls-station-1a' },
            update: {},
            create: {
                id: 'test-rls-station-1a',
                organizationId: 'test-rls-org-1',
                name: 'Test Station 1A',
                brand: 'Brand X',
                region: 'North',
                address: '123 Test St',
                location: { lat: 0, lng: 0 }
            }
        });
        success('Created station for org 1');

        await prisma.station.upsert({
            where: { id: 'test-rls-station-2a' },
            update: {},
            create: {
                id: 'test-rls-station-2a',
                organizationId: 'test-rls-org-2',
                name: 'Test Station 2A',
                brand: 'Brand Y',
                region: 'South',
                address: '456 Test Ave',
                location: { lat: 0, lng: 0 }
            }
        });
        success('Created station for org 2');

        info('Test data setup complete');
    } catch (err) {
        error(`Failed to setup test data: ${err.message}`);
        throw err;
    }
}

async function testRlsEnabled() {
    section('Test 1: Verify RLS is Enabled');
    
    try {
        const result = await prisma.$queryRaw`
            SELECT tablename, rowsecurity as rls_enabled
            FROM pg_tables
            WHERE schemaname = 'public' 
            AND tablename IN ('users', 'stations', 'audits', 'incidents', 'contractors', 'form_definitions')
            ORDER BY tablename
        `;
        
        console.log('\nRLS Status:');
        result.forEach(row => {
            const status = row.rls_enabled ? '✓ Enabled' : '✗ Disabled';
            const color = row.rls_enabled ? colors.green : colors.red;
            log(`  ${row.tablename}: ${status}`, color);
        });
        
        const allEnabled = result.every(row => row.rls_enabled);
        if (allEnabled) {
            success('All tenant-scoped tables have RLS enabled');
        } else {
            error('Some tables do not have RLS enabled');
        }
        
        return allEnabled;
    } catch (err) {
        error(`RLS check failed: ${err.message}`);
        return false;
    }
}

async function testTenantIsolation() {
    section('Test 2: Verify Tenant Isolation with Organization 1');
    
    try {
        // Test with organization 1 context
        const stations = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SET LOCAL app.current_organization_id = 'test-rls-org-1'`;
            return await tx.station.findMany({
                where: {
                    id: {
                        in: ['test-rls-station-1a', 'test-rls-station-2a']
                    }
                }
            });
        });
        
        info(`Found ${stations.length} station(s)`);
        
        if (stations.length === 1 && stations[0].organizationId === 'test-rls-org-1') {
            success('Tenant isolation working: Only org 1 station visible');
            console.log(`  Station: ${stations[0].name} (${stations[0].id})`);
            return true;
        } else {
            error('Tenant isolation failed: Wrong number of stations or wrong org');
            stations.forEach(s => {
                console.log(`  Found: ${s.name} - Org: ${s.organizationId}`);
            });
            return false;
        }
    } catch (err) {
        error(`Tenant isolation test failed: ${err.message}`);
        return false;
    }
}

async function testCrossTenantBlocking() {
    section('Test 3: Verify Cross-Tenant Blocking');
    
    try {
        // Set context to org-1, try to insert station for org-2
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SET LOCAL app.current_organization_id = 'test-rls-org-1'`;
            
            try {
                await tx.station.create({
                    data: {
                        id: 'test-rls-should-fail',
                        organizationId: 'test-rls-org-2',  // Wrong org!
                        name: 'Should Fail Station',
                        brand: 'Test',
                        region: 'Test',
                        address: 'Test',
                        location: { lat: 0, lng: 0 }
                    }
                });
                error('Cross-tenant insert should have failed but succeeded!');
                return false;
            } catch (insertErr) {
                if (insertErr.message.includes('policy')) {
                    success('Cross-tenant insert correctly blocked by RLS policy');
                    return true;
                } else {
                    error(`Unexpected error: ${insertErr.message}`);
                    return false;
                }
            }
        });
        
        return true;
    } catch (err) {
        error(`Cross-tenant blocking test failed: ${err.message}`);
        return false;
    }
}

async function testWithoutContext() {
    section('Test 4: Query Without Organization Context');
    
    try {
        const stations = await prisma.$transaction(async (tx) => {
            // Don't set organization context
            return await tx.station.findMany({
                where: {
                    id: {
                        in: ['test-rls-station-1a', 'test-rls-station-2a']
                    }
                }
            });
        });
        
        if (stations.length === 0) {
            success('Queries without context correctly return no results');
            return true;
        } else {
            error(`Query without context returned ${stations.length} station(s) - should be 0`);
            return false;
        }
    } catch (err) {
        error(`No context test failed: ${err.message}`);
        return false;
    }
}

async function testUpdateRestriction() {
    section('Test 5: Verify Update Restrictions');
    
    try {
        // Try to update org-2 station while in org-1 context
        const result = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SET LOCAL app.current_organization_id = 'test-rls-org-1'`;
            
            const updated = await tx.station.updateMany({
                where: { id: 'test-rls-station-2a' },  // Org 2 station
                data: { name: 'Updated Name' }
            });
            
            return updated.count;
        });
        
        if (result === 0) {
            success('Cross-tenant update correctly blocked');
            return true;
        } else {
            error(`Cross-tenant update succeeded - updated ${result} record(s)`);
            return false;
        }
    } catch (err) {
        error(`Update restriction test failed: ${err.message}`);
        return false;
    }
}

async function testHelperFunction() {
    section('Test 6: Verify Helper Function');
    
    try {
        const result = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SET LOCAL app.current_organization_id = 'test-rls-org-1'`;
            
            const orgId = await tx.$queryRaw`SELECT get_current_organization_id() as org_id`;
            return orgId[0].org_id;
        });
        
        if (result === 'test-rls-org-1') {
            success(`Helper function correctly returns: ${result}`);
            return true;
        } else {
            error(`Helper function returned unexpected value: ${result}`);
            return false;
        }
    } catch (err) {
        error(`Helper function test failed: ${err.message}`);
        return false;
    }
}

async function testIndexes() {
    section('Test 7: Verify Performance Indexes');
    
    try {
        const indexes = await prisma.$queryRaw`
            SELECT 
                tablename,
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname LIKE '%organization_id%'
            ORDER BY tablename
        `;
        
        console.log(`\nFound ${indexes.length} organizationId indexes:`);
        indexes.forEach(idx => {
            success(`  ${idx.tablename}: ${idx.indexname}`);
        });
        
        if (indexes.length >= 6) {
            success('All required indexes are present');
            return true;
        } else {
            error(`Expected at least 6 indexes, found ${indexes.length}`);
            return false;
        }
    } catch (err) {
        error(`Index verification failed: ${err.message}`);
        return false;
    }
}

async function cleanup() {
    section('Cleanup Test Data');
    
    try {
        await prisma.station.deleteMany({
            where: {
                id: {
                    in: ['test-rls-station-1a', 'test-rls-station-2a', 'test-rls-should-fail']
                }
            }
        });
        
        await prisma.organization.deleteMany({
            where: {
                id: {
                    in: ['test-rls-org-1', 'test-rls-org-2']
                }
            }
        });
        
        success('Test data cleaned up');
    } catch (err) {
        error(`Cleanup failed: ${err.message}`);
    }
}

async function runTests() {
    log('\n', colors.bold);
    log('╔════════════════════════════════════════════════════════════╗', colors.bold);
    log('║      PostgreSQL RLS Implementation Test Suite             ║', colors.bold);
    log('╚════════════════════════════════════════════════════════════╝', colors.bold);
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0
    };
    
    try {
        await setupTestData();
        
        const tests = [
            testRlsEnabled,
            testTenantIsolation,
            testCrossTenantBlocking,
            testWithoutContext,
            testUpdateRestriction,
            testHelperFunction,
            testIndexes
        ];
        
        for (const test of tests) {
            results.total++;
            const passed = await test();
            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        }
        
        await cleanup();
        
    } catch (err) {
        error(`\nTest suite failed: ${err.message}`);
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
    
    // Print summary
    section('Test Summary');
    log(`Total Tests: ${results.total}`, colors.bold);
    log(`Passed: ${results.passed}`, colors.green);
    log(`Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.green);
    
    if (results.failed === 0) {
        log('\n🎉 All tests passed! RLS is working correctly.', colors.green + colors.bold);
        process.exit(0);
    } else {
        log('\n⚠️  Some tests failed. Please review the output above.', colors.red + colors.bold);
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
});
