# Tenant Data Export and Migration System

Comprehensive tenant data management system supporting full data export, GDPR-compliant deletion, tenant cloning for staging environments, and robust import/rollback capabilities.

## Features

### 1. Data Export
- **JSON Format**: Complete tenant data in structured JSON
- **CSV Format**: Individual CSV files for each data model
- **ZIP Archives**: Compressed exports in JSON, CSV, or both formats
- **Selective Export**: Option to include/exclude audit logs
- **Metadata Tracking**: Export timestamps, version, and tenant info

### 2. GDPR-Compliant Data Deletion
- **Automatic Audit Logging**: All deletions logged for compliance
- **Automatic Backups**: Creates backup before deletion (configurable)
- **Cascade Deletion**: Properly handles all related data
- **Compliance Metadata**: Tracks GDPR requests with timestamps
- **Secure Storage**: Backup files stored in isolated directory

### 3. Tenant Cloning
- **Staging Environments**: Clone production tenants for testing
- **Selective Cloning**: Choose what data to include
- **ID Remapping**: Automatic mapping of old to new IDs
- **Safe User Handling**: Cloned users get temporary passwords
- **Email Prefixing**: Prevents email conflicts

### 4. Data Import
- **Validation**: Pre-import validation of data structure
- **Dry Run Mode**: Test imports without committing
- **Create or Update**: Import into new or existing tenants
- **ID Mapping**: Tracks relationships during import
- **Transaction Safety**: All-or-nothing import operations

### 5. Rollback and Recovery
- **Rollback Points**: Create snapshots before changes
- **Quick Restore**: Fast recovery from failed operations
- **State Preservation**: Exact state restoration
- **Disaster Recovery**: Built-in backup strategy

## Installation

Dependencies are already installed via package.json:

```bash
npm install json2csv csv-parser archiver
```

## File Structure

```
server/
├── services/
│   └── tenantMigrationService.js    # Core migration logic
├── routes/
│   └── tenantMigration.js           # API endpoints
├── middleware/
│   └── validation.js                # Request validation schemas
├── tests/
│   └── tenantMigration.test.js      # Test suite
└── TENANT_MIGRATION_API.md          # API documentation
```

## Service Functions

### exportTenantToJSON(tenantId, options)
Exports complete tenant data to JSON format.

**Parameters:**
- `tenantId`: Organization ID
- `options.includeAuditLogs`: Include audit logs (default: true)

**Returns:** Object with metadata, organization, and all related data

**Example:**
```javascript
import { exportTenantToJSON } from './services/tenantMigrationService.js';

const data = await exportTenantToJSON('clx123', { includeAuditLogs: true });
console.log(`Exported ${data.users.length} users`);
```

### exportTenantToCSV(tenantId, options)
Exports tenant data as CSV files.

**Parameters:**
- `tenantId`: Organization ID
- `options.includeAuditLogs`: Include audit logs (default: true)

**Returns:** Object with CSV strings for each data model

### exportTenantToZip(tenantId, outputPath, format, options)
Creates compressed ZIP archive of tenant data.

**Parameters:**
- `tenantId`: Organization ID
- `outputPath`: File path for ZIP file
- `format`: 'json', 'csv', or 'both'
- `options.includeAuditLogs`: Include audit logs

**Returns:** Promise resolving to output path

### deleteTenantData(tenantId, options)
GDPR-compliant deletion of all tenant data.

**Parameters:**
- `tenantId`: Organization ID
- `options.gdprCompliant`: Log GDPR request (default: true)
- `options.createBackup`: Create backup before deletion (default: true)

**Returns:** Object with success status, deleted counts, and backup path

**Example:**
```javascript
import { deleteTenantData } from './services/tenantMigrationService.js';

const result = await deleteTenantData('clx123', {
  gdprCompliant: true,
  createBackup: true
});

console.log(`Deleted ${result.deletedRecords.users.count} users`);
console.log(`Backup: ${result.backupPath}`);
```

### cloneTenant(sourceTenantId, targetName, options)
Creates a copy of an existing tenant.

**Parameters:**
- `sourceTenantId`: Source organization ID
- `targetName`: Name for new organization
- `options.includeUsers`: Clone users (default: false)
- `options.includeAudits`: Clone audit records (default: false)
- `options.includeAuditLogs`: Clone audit logs (default: false)
- `options.ownerId`: Owner for new tenant (optional)

**Returns:** Object with new organization and ID mappings

**Example:**
```javascript
import { cloneTenant } from './services/tenantMigrationService.js';

const result = await cloneTenant('clx123', 'Staging Environment', {
  includeUsers: false,
  includeAudits: false
});

console.log(`New tenant ID: ${result.organization.id}`);
console.log(`Cloned ${Object.keys(result.idMapping.stations).length} stations`);
```

### validateImportData(data)
Validates import data structure.

**Parameters:**
- `data`: Import data object

**Returns:** Object with `valid` boolean and `errors` array

### importTenantData(importData, options)
Imports tenant data with validation.

**Parameters:**
- `importData`: Data to import
- `options.targetTenantId`: Existing tenant ID (if not creating new)
- `options.createNew`: Create new organization (default: false)
- `options.dryRun`: Validate only (default: false)

**Returns:** Object with success status, organization, and import counts

**Example:**
```javascript
import { importTenantData } from './services/tenantMigrationService.js';

// Dry run first
const dryRun = await importTenantData(data, {
  createNew: true,
  dryRun: true
});

if (dryRun.success) {
  // Actual import
  const result = await importTenantData(data, {
    createNew: true,
    dryRun: false
  });
  console.log(`Imported ${result.counts.users} users`);
}
```

### createRollbackPoint(tenantId)
Creates backup snapshot for rollback.

**Parameters:**
- `tenantId`: Organization ID

**Returns:** Object with rollbackId and backup path

### rollbackTenant(tenantId, rollbackPath)
Restores tenant from rollback point.

**Parameters:**
- `tenantId`: Organization ID
- `rollbackPath`: Path to rollback backup file

**Returns:** Object with success status

## API Endpoints

All endpoints require Admin role authentication.

### Export Endpoints
- `GET /api/tenant-migration/export/json` - Export as JSON
- `GET /api/tenant-migration/export/csv` - Export as CSV
- `GET /api/tenant-migration/export/zip` - Download ZIP archive

### Management Endpoints
- `DELETE /api/tenant-migration/delete/:tenantId` - GDPR deletion
- `POST /api/tenant-migration/clone` - Clone tenant
- `POST /api/tenant-migration/import/validate` - Validate import
- `POST /api/tenant-migration/import` - Import data

### Rollback Endpoints
- `POST /api/tenant-migration/rollback/create/:tenantId` - Create rollback
- `POST /api/tenant-migration/rollback/restore/:tenantId` - Restore rollback

See [TENANT_MIGRATION_API.md](./TENANT_MIGRATION_API.md) for detailed API documentation.

## Usage Workflows

### Workflow 1: Exporting Tenant Data

```bash
# Export as JSON
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/tenant-migration/export/json?tenantId=clx123"

# Export as ZIP with both JSON and CSV
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/tenant-migration/export/zip?tenantId=clx123&format=both" \
  -o export.zip
```

### Workflow 2: GDPR Data Deletion

```bash
# Delete with backup and GDPR logging
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gdprCompliant": true, "createBackup": true}' \
  "http://localhost:3001/api/tenant-migration/delete/clx123"
```

### Workflow 3: Cloning for Staging

```bash
# Clone tenant without users or audits
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceTenantId": "clx123",
    "targetName": "Staging Environment",
    "includeUsers": false,
    "includeAudits": false
  }' \
  "http://localhost:3001/api/tenant-migration/clone"
```

### Workflow 4: Safe Data Migration

```bash
# 1. Create rollback point
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/tenant-migration/rollback/create/clx123"

# Response: {"rollbackId": "rollback-clx123-1234567890", "backupPath": "..."}

# 2. Validate import data
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d @import-data.json \
  "http://localhost:3001/api/tenant-migration/import/validate"

# 3. Dry run import
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "importData": {...},
    "targetTenantId": "clx123",
    "dryRun": true
  }' \
  "http://localhost:3001/api/tenant-migration/import"

# 4. Actual import
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "importData": {...},
    "targetTenantId": "clx123",
    "dryRun": false
  }' \
  "http://localhost:3001/api/tenant-migration/import"

# 5. If something goes wrong, rollback
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rollbackPath": "/path/to/rollback-clx123-1234567890.zip"}' \
  "http://localhost:3001/api/tenant-migration/rollback/restore/clx123"
```

## Testing

Run the test suite:

```bash
# Set test tenant ID
export TEST_TENANT_ID=your-test-tenant-id

# Run tests
node server/tests/tenantMigration.test.js
```

## Security

- **Authentication Required**: All endpoints require valid JWT token
- **Admin Role Only**: Only Admin users can access migration endpoints
- **Tenant Isolation**: All operations respect tenant boundaries
- **Audit Logging**: All operations logged in audit trail
- **Rate Limiting**: Protected by tenant rate limiter
- **Input Validation**: Zod schemas validate all inputs
- **Transaction Safety**: Database operations use transactions

## GDPR Compliance

The system is designed to meet GDPR requirements:

1. **Right to Data Portability**: Export endpoints provide complete data in machine-readable format
2. **Right to Erasure**: Delete endpoint removes all tenant data
3. **Audit Trail**: All operations logged with timestamps and metadata
4. **Data Minimization**: Selective export options
5. **Consent Documentation**: GDPR deletion requests logged
6. **Backup Retention**: Configurable backup policies

## Performance Considerations

- **Large Exports**: Streaming for large datasets
- **Compression**: ZIP exports use maximum compression
- **Transactions**: All imports/deletions use database transactions
- **Pagination**: Consider pagination for very large tenants
- **Async Operations**: All operations are asynchronous

## Backup Storage

Backups are stored in:
- `backups/exports/` - Temporary export files
- `backups/gdpr-deletions/` - GDPR deletion backups
- `backups/rollback/` - Rollback snapshots

These directories are excluded from git via `.gitignore`.

## Error Handling

All functions include comprehensive error handling:
- Database errors logged and propagated
- File system errors handled gracefully
- Validation errors provide detailed feedback
- Transaction rollback on failures

## Monitoring

All operations emit structured logs:
```javascript
logger.info({ tenantId, counts }, 'Tenant data exported');
logger.error({ tenantId, error }, 'Export failed');
```

Monitor these logs for:
- Export/import volumes
- GDPR deletion requests
- Failed operations
- Performance metrics

## Future Enhancements

Potential improvements:
- Incremental backups
- Scheduled exports
- S3/cloud storage integration
- Export encryption
- Multi-tenant batch operations
- Progress tracking for large operations
- Export scheduling and automation
- Data anonymization options

## Support

For issues or questions:
1. Check API documentation
2. Review test examples
3. Check server logs
4. Review audit logs for operation history

## License

This feature is part of the HSE.Digital platform.