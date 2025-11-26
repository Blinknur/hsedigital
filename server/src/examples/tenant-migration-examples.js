import {
  exportTenantToJSON,
  exportTenantToZip,
  cloneTenant,
  validateImportData,
  importTenantData,
  createRollbackPoint,
  deleteTenantData
} from '../services/tenantMigrationService.js';

const EXAMPLE_TENANT_ID = 'your-tenant-id-here';

async function example1_ExportTenantData() {
  console.log('\n=== Example 1: Export Tenant Data ===');
  
  try {
    const jsonData = await exportTenantToJSON(EXAMPLE_TENANT_ID, {
      includeAuditLogs: true
    });
    
    console.log(`✓ Exported tenant: ${jsonData.organization.name}`);
    console.log(`  - ${jsonData.users.length} users`);
    console.log(`  - ${jsonData.stations.length} stations`);
    console.log(`  - ${jsonData.contractors.length} contractors`);
    console.log(`  - ${jsonData.audits.length} audits`);
    
    return jsonData;
  } catch (error) {
    console.error('✗ Export failed:', error.message);
  }
}

async function example2_ExportToZipFile() {
  console.log('\n=== Example 2: Export to ZIP File ===');
  
  try {
    const outputPath = `./backups/exports/tenant-${EXAMPLE_TENANT_ID}-${Date.now()}.zip`;
    
    await exportTenantToZip(EXAMPLE_TENANT_ID, outputPath, 'both', {
      includeAuditLogs: true
    });
    
    console.log(`✓ ZIP archive created: ${outputPath}`);
    console.log('  - Contains both JSON and CSV formats');
  } catch (error) {
    console.error('✗ ZIP creation failed:', error.message);
  }
}

async function example3_CloneTenantForStaging() {
  console.log('\n=== Example 3: Clone Tenant for Staging ===');
  
  try {
    const result = await cloneTenant(
      EXAMPLE_TENANT_ID,
      'Staging Environment - Test',
      {
        includeUsers: false,
        includeAudits: false,
        includeAuditLogs: false
      }
    );
    
    console.log(`✓ Tenant cloned successfully`);
    console.log(`  - New tenant ID: ${result.organization.id}`);
    console.log(`  - New tenant name: ${result.organization.name}`);
    console.log(`  - Cloned ${Object.keys(result.idMapping.stations).length} stations`);
    console.log(`  - Cloned ${Object.keys(result.idMapping.contractors).length} contractors`);
    
    return result.organization.id;
  } catch (error) {
    console.error('✗ Clone failed:', error.message);
  }
}

async function example4_ValidateAndImport() {
  console.log('\n=== Example 4: Validate and Import Data ===');
  
  const importData = {
    metadata: {
      version: '1.0',
      exportedAt: new Date().toISOString()
    },
    organization: {
      name: 'Imported Organization',
      ownerId: 'owner-user-id',
      subscriptionPlan: 'free'
    },
    users: [
      {
        id: 'old-user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        region: 'North',
        assignedStationIds: [],
        isEmailVerified: true
      }
    ],
    stations: [
      {
        id: 'old-station-1',
        name: 'Station 1',
        brand: 'Brand A',
        region: 'North',
        address: '123 Main St',
        riskCategory: 'Low',
        auditFrequency: 'Quarterly',
        isActive: true
      }
    ],
    contractors: [],
    audits: [],
    forms: [],
    incidents: [],
    workPermits: []
  };
  
  const validation = validateImportData(importData);
  console.log(`✓ Validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
  
  if (!validation.valid) {
    console.log(`  Errors: ${validation.errors.join(', ')}`);
    return;
  }
  
  try {
    const dryRunResult = await importTenantData(importData, {
      createNew: true,
      dryRun: true
    });
    
    console.log('✓ Dry run successful - data structure is valid');
    
    console.log('\n  Note: To perform actual import, set dryRun: false');
  } catch (error) {
    console.error('✗ Import validation failed:', error.message);
  }
}

async function example5_SafeMigrationWithRollback() {
  console.log('\n=== Example 5: Safe Migration with Rollback ===');
  
  try {
    console.log('Step 1: Create rollback point...');
    const rollbackPoint = await createRollbackPoint(EXAMPLE_TENANT_ID);
    console.log(`✓ Rollback point created: ${rollbackPoint.rollbackId}`);
    console.log(`  Backup path: ${rollbackPoint.backupPath}`);
    
    console.log('\nStep 2: Perform migration/changes...');
    console.log('  (In real scenario, you would import data here)');
    
    console.log('\nStep 3: If something goes wrong...');
    console.log('  You can restore using:');
    console.log(`  rollbackTenant('${EXAMPLE_TENANT_ID}', '${rollbackPoint.backupPath}')`);
    
  } catch (error) {
    console.error('✗ Rollback example failed:', error.message);
  }
}

async function example6_GDPRCompliantDeletion() {
  console.log('\n=== Example 6: GDPR-Compliant Deletion (DRY RUN) ===');
  
  console.log('⚠️  This is a dry run example - no actual deletion');
  console.log('\nTo delete tenant data with GDPR compliance:');
  console.log('1. Automatic backup is created');
  console.log('2. GDPR deletion request is logged in audit trail');
  console.log('3. All tenant data is deleted in proper order');
  console.log('4. Backup path is returned for retention');
  
  console.log('\nExample call:');
  console.log(`const result = await deleteTenantData('${EXAMPLE_TENANT_ID}', {`);
  console.log('  gdprCompliant: true,');
  console.log('  createBackup: true');
  console.log('});');
  
  console.log('\n⚠️  WARNING: This operation is irreversible (except via backup)');
}

async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Tenant Migration System - Usage Examples             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  console.log(`\nNote: Using tenant ID: ${EXAMPLE_TENANT_ID}`);
  console.log('Replace with actual tenant ID to run examples\n');
  
  await example1_ExportTenantData();
  await example2_ExportToZipFile();
  await example3_CloneTenantForStaging();
  await example4_ValidateAndImport();
  await example5_SafeMigrationWithRollback();
  await example6_GDPRCompliantDeletion();
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Examples completed - See documentation for more      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  example1_ExportTenantData,
  example2_ExportToZipFile,
  example3_CloneTenantForStaging,
  example4_ValidateAndImport,
  example5_SafeMigrationWithRollback,
  example6_GDPRCompliantDeletion
};