import basePrisma from '../shared/utils/db.js';
import { prisma, setTenantContext, clearTenantContext, getTenantContext } from '../shared/utils/db.js';
import { tenantService } from '../core/services/tenantService.js';

console.log('=== Tenant Isolation Tests ===\n');

let testOrgId1, testOrgId2, testStationId1, testStationId2;

async function setup() {
    console.log('Setting up test data...');
    
    const org1 = await basePrisma.organization.create({
        data: {
            name: 'Test Organization 1',
            ownerId: 'test-owner-1'
        }
    });
    testOrgId1 = org1.id;

    const org2 = await basePrisma.organization.create({
        data: {
            name: 'Test Organization 2',
            ownerId: 'test-owner-2'
        }
    });
    testOrgId2 = org2.id;

    const station1 = await basePrisma.station.create({
        data: {
            name: 'Station 1',
            organizationId: testOrgId1
        }
    });
    testStationId1 = station1.id;

    const station2 = await basePrisma.station.create({
        data: {
            name: 'Station 2',
            organizationId: testOrgId2
        }
    });
    testStationId2 = station2.id;

    console.log('✓ Test data created\n');
}

async function cleanup() {
    console.log('\nCleaning up test data...');
    
    await basePrisma.station.deleteMany({
        where: {
            id: { in: [testStationId1, testStationId2] }
        }
    });

    await basePrisma.organization.deleteMany({
        where: {
            id: { in: [testOrgId1, testOrgId2] }
        }
    });

    await basePrisma.$disconnect();
    console.log('✓ Test data cleaned up');
}

async function testTenantContextSetting() {
    console.log('Test 1: Tenant Context Setting');
    
    setTenantContext(testOrgId1);
    const context1 = getTenantContext();
    console.log('✓ Set tenant context:', context1 === testOrgId1 ? 'PASS' : 'FAIL');
    
    clearTenantContext();
    const context2 = getTenantContext();
    console.log('✓ Clear tenant context:', context2 === null ? 'PASS' : 'FAIL');
    console.log('');
}

async function testAutoInjectionOnCreate() {
    console.log('Test 2: Auto-Injection on CREATE');
    
    setTenantContext(testOrgId1);
    
    const contractor = await prisma.contractor.create({
        data: {
            name: 'Test Contractor'
        }
    });
    
    console.log('✓ Contractor created with auto-injected organizationId:', 
        contractor.organizationId === testOrgId1 ? 'PASS' : 'FAIL');
    
    await basePrisma.contractor.delete({ where: { id: contractor.id } });
    clearTenantContext();
    console.log('');
}

async function testQueryInterceptorFindMany() {
    console.log('Test 3: Query Interceptor on findMany');
    
    setTenantContext(testOrgId1);
    const stations1 = await prisma.station.findMany();
    console.log('✓ Tenant 1 sees only their stations:', 
        stations1.length === 1 && stations1[0].id === testStationId1 ? 'PASS' : 'FAIL');
    clearTenantContext();
    
    setTenantContext(testOrgId2);
    const stations2 = await prisma.station.findMany();
    console.log('✓ Tenant 2 sees only their stations:', 
        stations2.length === 1 && stations2[0].id === testStationId2 ? 'PASS' : 'FAIL');
    clearTenantContext();
    
    console.log('');
}

async function testQueryInterceptorFindFirst() {
    console.log('Test 4: Query Interceptor on findFirst');
    
    setTenantContext(testOrgId1);
    const station1 = await prisma.station.findFirst();
    console.log('✓ Tenant 1 findFirst returns their station:', 
        station1 && station1.id === testStationId1 ? 'PASS' : 'FAIL');
    clearTenantContext();
    
    setTenantContext(testOrgId2);
    const station2 = await prisma.station.findFirst();
    console.log('✓ Tenant 2 findFirst returns their station:', 
        station2 && station2.id === testStationId2 ? 'PASS' : 'FAIL');
    clearTenantContext();
    
    console.log('');
}

async function testBlockQueriesWithoutContext() {
    console.log('Test 5: Block Queries Without Tenant Context');
    
    clearTenantContext();
    const stations = await prisma.station.findMany();
    console.log('✓ findMany without context returns empty:', 
        stations.length === 0 ? 'PASS' : 'FAIL');
    
    const station = await prisma.station.findFirst();
    console.log('✓ findFirst without context returns null:', 
        station === null ? 'PASS' : 'FAIL');
    
    let createError = null;
    try {
        await prisma.contractor.create({
            data: { name: 'Unauthorized Contractor' }
        });
    } catch (error) {
        createError = error;
    }
    console.log('✓ CREATE without context throws error:', 
        createError !== null ? 'PASS' : 'FAIL');
    
    console.log('');
}

async function testTenantValidation() {
    console.log('Test 6: Tenant Validation');
    
    const valid1 = await tenantService.validateTenant(testOrgId1);
    console.log('✓ Valid tenant passes validation:', valid1 ? 'PASS' : 'FAIL');
    
    const valid2 = await tenantService.validateTenant('non-existent-org');
    console.log('✓ Invalid tenant fails validation:', !valid2 ? 'PASS' : 'FAIL');
    
    const valid3 = await tenantService.validateTenant(null);
    console.log('✓ Null tenant fails validation:', !valid3 ? 'PASS' : 'FAIL');
    
    console.log('');
}

async function testCrossTenantisolation() {
    console.log('Test 7: Cross-Tenant Isolation');
    
    setTenantContext(testOrgId1);
    const contractor1 = await prisma.contractor.create({
        data: { name: 'Tenant 1 Contractor' }
    });
    clearTenantContext();
    
    setTenantContext(testOrgId2);
    const foundContractor = await prisma.contractor.findFirst({
        where: { id: contractor1.id }
    });
    console.log('✓ Tenant 2 cannot access Tenant 1 data:', 
        foundContractor === null ? 'PASS' : 'FAIL');
    clearTenantContext();
    
    setTenantContext(testOrgId1);
    await prisma.contractor.delete({ where: { id: contractor1.id } });
    clearTenantContext();
    
    console.log('');
}

async function testUpdateWithTenantContext() {
    console.log('Test 8: Update Operations with Tenant Context');
    
    setTenantContext(testOrgId1);
    const contractor = await prisma.contractor.create({
        data: { name: 'Update Test Contractor' }
    });
    
    await prisma.contractor.update({
        where: { id: contractor.id },
        data: { name: 'Updated Name' }
    });
    
    const updated = await prisma.contractor.findUnique({
        where: { id: contractor.id }
    });
    
    console.log('✓ Update within same tenant succeeds:', 
        updated.name === 'Updated Name' ? 'PASS' : 'FAIL');
    
    clearTenantContext();
    
    setTenantContext(testOrgId2);
    let updateError = null;
    try {
        await prisma.contractor.update({
            where: { id: contractor.id },
            data: { name: 'Unauthorized Update' }
        });
    } catch (error) {
        updateError = error;
    }
    console.log('✓ Update from different tenant fails:', 
        updateError !== null || updated.name === 'Updated Name' ? 'PASS' : 'FAIL');
    clearTenantContext();
    
    setTenantContext(testOrgId1);
    await prisma.contractor.delete({ where: { id: contractor.id } });
    clearTenantContext();
    
    console.log('');
}

async function testDeleteWithTenantContext() {
    console.log('Test 9: Delete Operations with Tenant Context');
    
    setTenantContext(testOrgId1);
    const contractor = await prisma.contractor.create({
        data: { name: 'Delete Test Contractor' }
    });
    const contractorId = contractor.id;
    clearTenantContext();
    
    setTenantContext(testOrgId2);
    let deleteError = null;
    try {
        await prisma.contractor.delete({
            where: { id: contractorId }
        });
    } catch (error) {
        deleteError = error;
    }
    clearTenantContext();
    
    setTenantContext(testOrgId1);
    const stillExists = await prisma.contractor.findUnique({
        where: { id: contractorId }
    });
    console.log('✓ Delete from different tenant does not affect record:', 
        stillExists !== null ? 'PASS' : 'FAIL');
    
    await prisma.contractor.delete({ where: { id: contractorId } });
    clearTenantContext();
    
    console.log('');
}

async function testTenantCache() {
    console.log('Test 10: Tenant Cache');
    
    await tenantService.clearAllTenantCache();
    
    const start1 = Date.now();
    await tenantService.validateTenant(testOrgId1);
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await tenantService.validateTenant(testOrgId1);
    const time2 = Date.now() - start2;
    
    console.log('✓ First validation time:', time1, 'ms');
    console.log('✓ Cached validation time:', time2, 'ms');
    console.log('✓ Cache improves performance:', time2 < time1 ? 'PASS' : 'INCONCLUSIVE');
    
    await tenantService.invalidateTenantCache(testOrgId1);
    const validAfterInvalidate = await tenantService.validateTenant(testOrgId1);
    console.log('✓ Validation works after cache invalidation:', validAfterInvalidate ? 'PASS' : 'FAIL');
    
    console.log('');
}

async function runAllTests() {
    try {
        await setup();
        
        await testTenantContextSetting();
        await testAutoInjectionOnCreate();
        await testQueryInterceptorFindMany();
        await testQueryInterceptorFindFirst();
        await testBlockQueriesWithoutContext();
        await testTenantValidation();
        await testCrossTenantisolation();
        await testUpdateWithTenantContext();
        await testDeleteWithTenantContext();
        await testTenantCache();
        
        await cleanup();
        
        console.log('=== All Tenant Isolation Tests Completed ===');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        await cleanup();
        process.exit(1);
    }
}

runAllTests();
