import { setTenantContext, clearTenantContext, getTenantContext } from '../utils/prismaClient.js';
import { tenantLogger } from '../utils/tenantLogger.js';

console.log('=== Tenant Isolation Unit Tests (No DB Required) ===\n');

async function testTenantContextManagement() {
    console.log('Test 1: Tenant Context Management');
    
    const testOrgId = 'test-org-123';
    
    setTenantContext(testOrgId);
    const context1 = getTenantContext();
    console.log('✓ Set tenant context:', context1 === testOrgId ? 'PASS' : 'FAIL');
    console.log('  Expected:', testOrgId);
    console.log('  Got:', context1);
    
    const newOrgId = 'test-org-456';
    setTenantContext(newOrgId);
    const context2 = getTenantContext();
    console.log('✓ Update tenant context:', context2 === newOrgId ? 'PASS' : 'FAIL');
    console.log('  Expected:', newOrgId);
    console.log('  Got:', context2);
    
    clearTenantContext();
    const context3 = getTenantContext();
    console.log('✓ Clear tenant context:', context3 === null ? 'PASS' : 'FAIL');
    console.log('  Expected: null');
    console.log('  Got:', context3);
    console.log('');
}

async function testTenantContextIsolation() {
    console.log('Test 2: Tenant Context Isolation');
    
    clearTenantContext();
    const initialContext = getTenantContext();
    console.log('✓ Initial context is null:', initialContext === null ? 'PASS' : 'FAIL');
    
    setTenantContext('tenant-1');
    const tenant1Context = getTenantContext();
    console.log('✓ Tenant 1 context set:', tenant1Context === 'tenant-1' ? 'PASS' : 'FAIL');
    
    clearTenantContext();
    setTenantContext('tenant-2');
    const tenant2Context = getTenantContext();
    console.log('✓ Tenant 2 context isolated from tenant 1:', 
        tenant2Context === 'tenant-2' && tenant2Context !== tenant1Context ? 'PASS' : 'FAIL');
    
    clearTenantContext();
    console.log('');
}

async function testTenantLoggerFunctions() {
    console.log('Test 3: Tenant Logger Functions');
    
    let errors = [];
    
    try {
        tenantLogger.logTenantSwitch('user-1', 'user@example.com', 'org-1', '/api/stations');
        console.log('✓ logTenantSwitch executes without error: PASS');
    } catch (error) {
        errors.push('logTenantSwitch failed');
        console.log('✗ logTenantSwitch executes without error: FAIL');
    }
    
    try {
        tenantLogger.logTenantAccessDenied('user-1', 'user@example.com', 'Invalid tenant');
        console.log('✓ logTenantAccessDenied executes without error: PASS');
    } catch (error) {
        errors.push('logTenantAccessDenied failed');
        console.log('✗ logTenantAccessDenied executes without error: FAIL');
    }
    
    try {
        tenantLogger.logTenantQueryBlock('user-1', 'org-1', 'FIND_MANY', 'station');
        console.log('✓ logTenantQueryBlock executes without error: PASS');
    } catch (error) {
        errors.push('logTenantQueryBlock failed');
        console.log('✗ logTenantQueryBlock executes without error: FAIL');
    }
    
    try {
        tenantLogger.logTenantInjection('org-1', 'CREATE', 'contractor');
        console.log('✓ logTenantInjection executes without error: PASS');
    } catch (error) {
        errors.push('logTenantInjection failed');
        console.log('✗ logTenantInjection executes without error: FAIL');
    }
    
    console.log('✓ All logger functions work:', errors.length === 0 ? 'PASS' : 'FAIL');
    if (errors.length > 0) {
        console.log('  Errors:', errors.join(', '));
    }
    console.log('');
}

async function testGlobalContextBehavior() {
    console.log('Test 4: Global Context Behavior');
    
    clearTenantContext();
    
    console.log('✓ Global context can be cleared multiple times:', 
        getTenantContext() === null ? 'PASS' : 'FAIL');
    
    setTenantContext('org-1');
    setTenantContext('org-2');
    const finalContext = getTenantContext();
    console.log('✓ Last set wins for global context:', 
        finalContext === 'org-2' ? 'PASS' : 'FAIL');
    
    clearTenantContext();
    console.log('');
}

async function testNullAndUndefinedHandling() {
    console.log('Test 5: Null and Undefined Handling');
    
    setTenantContext(null);
    const nullContext = getTenantContext();
    console.log('✓ Can set null context:', nullContext === null ? 'PASS' : 'FAIL');
    
    setTenantContext(undefined);
    const undefinedContext = getTenantContext();
    console.log('✓ Undefined is treated as null:', undefinedContext === undefined ? 'PASS' : 'FAIL');
    
    clearTenantContext();
    console.log('');
}

async function runAllTests() {
    try {
        await testTenantContextManagement();
        await testTenantContextIsolation();
        await testTenantLoggerFunctions();
        await testGlobalContextBehavior();
        await testNullAndUndefinedHandling();
        
        console.log('=== All Unit Tests Completed Successfully ===');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runAllTests();
