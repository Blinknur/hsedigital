# Tenant Migration API Documentation

Complete API for tenant data export, import, cloning, GDPR deletion, and rollback operations.

## Authentication

All endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- Admin role access

## Endpoints

### 1. Export Tenant Data (JSON)

Export complete tenant data in JSON format.

**Endpoint:** `GET /api/tenant-migration/export/json`

**Query Parameters:**
- `tenantId` (required): Organization ID to export
- `includeAuditLogs` (optional): Include audit logs (default: true)

**Response:**
```json
{
  "metadata": {
    "exportedAt": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "tenantId": "clx123...",
    "tenantName": "Acme Corp"
  },
  "organization": {
    "id": "clx123...",
    "name": "Acme Corp",
    "ownerId": "user123",
    "subscriptionPlan": "pro",
    "subscriptionStatus": "active"
  },
  "users": [...],
  "stations": [...],
  "contractors": [...],
  "audits": [...],
  "forms": [...],
  "incidents": [...],
  "workPermits": [...],
  "auditLogs": [...]
}
```

### 2. Export Tenant Data (CSV)

Export tenant data as multiple CSV files.

**Endpoint:** `GET /api/tenant-migration/export/csv`

**Query Parameters:**
- `tenantId` (required): Organization ID to export
- `includeAuditLogs` (optional): Include audit logs (default: true)

**Response:**
```json
{
  "metadata": "CSV string",
  "organization": "CSV string",
  "users": "CSV string",
  "stations": "CSV string",
  "contractors": "CSV string",
  "audits": "CSV string",
  "forms": "CSV string",
  "incidents": "CSV string",
  "workPermits": "CSV string",
  "auditLogs": "CSV string"
}
```

### 3. Export Tenant Data (ZIP Archive)

Download tenant data as a compressed ZIP file.

**Endpoint:** `GET /api/tenant-migration/export/zip`

**Query Parameters:**
- `tenantId` (required): Organization ID to export
- `format` (optional): Export format - `json`, `csv`, or `both` (default: json)
- `includeAuditLogs` (optional): Include audit logs (default: true)

**Response:** Binary ZIP file download

### 4. GDPR-Compliant Tenant Deletion

Delete all tenant data with optional backup and GDPR audit logging.

**Endpoint:** `DELETE /api/tenant-migration/delete/:tenantId`

**Path Parameters:**
- `tenantId`: Organization ID to delete

**Request Body:**
```json
{
  "gdprCompliant": true,
  "createBackup": true
}
```

**Response:**
```json
{
  "success": true,
  "deletedRecords": {
    "auditLogs": { "count": 150 },
    "workPermits": { "count": 45 },
    "incidents": { "count": 23 },
    "audits": { "count": 89 },
    "forms": { "count": 12 },
    "contractors": { "count": 34 },
    "stations": { "count": 56 },
    "users": { "count": 28 },
    "organization": { "id": "clx123...", "name": "Acme Corp" }
  },
  "backupPath": "/path/to/backup/tenant-clx123-1234567890.zip"
}
```

### 5. Clone Tenant for Staging

Create a copy of a tenant for staging/testing environments.

**Endpoint:** `POST /api/tenant-migration/clone`

**Request Body:**
```json
{
  "sourceTenantId": "clx123...",
  "targetName": "Acme Corp - Staging",
  "includeUsers": false,
  "includeAudits": false,
  "includeAuditLogs": false,
  "ownerId": "user456"
}
```

**Response:**
```json
{
  "organization": {
    "id": "clx789...",
    "name": "Acme Corp - Staging",
    "ownerId": "user456",
    "subscriptionPlan": "pro",
    "subscriptionStatus": "active"
  },
  "idMapping": {
    "organization": { "clx123...": "clx789..." },
    "users": {},
    "stations": { "station1": "newStation1", ... },
    "contractors": { "contractor1": "newContractor1", ... },
    "forms": { "form1": "newForm1", ... }
  }
}
```

### 6. Validate Import Data

Validate import data structure before importing.

**Endpoint:** `POST /api/tenant-migration/import/validate`

**Request Body:**
```json
{
  "metadata": {
    "version": "1.0",
    "exportedAt": "2024-01-15T10:30:00Z"
  },
  "organization": {
    "name": "Imported Org",
    "ownerId": "user123"
  },
  "users": [],
  "stations": [],
  "contractors": []
}
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

Or if validation fails:
```json
{
  "valid": false,
  "errors": [
    "Missing metadata.version",
    "users must be an array"
  ]
}
```

### 7. Import Tenant Data

Import tenant data with validation and rollback support.

**Endpoint:** `POST /api/tenant-migration/import`

**Request Body:**
```json
{
  "importData": {
    "metadata": { "version": "1.0" },
    "organization": {
      "name": "New Org",
      "ownerId": "user123",
      "subscriptionPlan": "free"
    },
    "users": [...],
    "stations": [...],
    "contractors": [...]
  },
  "targetTenantId": null,
  "createNew": true,
  "dryRun": false
}
```

**Options:**
- `targetTenantId`: Existing tenant ID to import into (required if createNew=false)
- `createNew`: Create new organization (default: false)
- `dryRun`: Validate only without importing (default: false)

**Response:**
```json
{
  "success": true,
  "organization": {
    "id": "clxNew...",
    "name": "New Org"
  },
  "counts": {
    "users": 15,
    "stations": 30,
    "contractors": 20,
    "forms": 5
  }
}
```

### 8. Create Rollback Point

Create a backup snapshot before making changes.

**Endpoint:** `POST /api/tenant-migration/rollback/create/:tenantId`

**Path Parameters:**
- `tenantId`: Organization ID

**Response:**
```json
{
  "rollbackId": "rollback-clx123-1234567890",
  "backupPath": "/path/to/backups/rollback/rollback-clx123-1234567890.zip"
}
```

### 9. Restore from Rollback Point

Restore tenant data from a rollback snapshot.

**Endpoint:** `POST /api/tenant-migration/rollback/restore/:tenantId`

**Path Parameters:**
- `tenantId`: Organization ID

**Request Body:**
```json
{
  "rollbackPath": "/path/to/backups/rollback/rollback-clx123-1234567890.zip"
}
```

**Response:**
```json
{
  "success": true,
  "tenantId": "clx123..."
}
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

HTTP Status Codes:
- `400`: Bad Request (validation errors, missing parameters)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (tenant not found)
- `500`: Internal Server Error

## Usage Examples

### Export and Download Tenant Data

```bash
curl -X GET "http://localhost:3001/api/tenant-migration/export/zip?tenantId=clx123&format=both" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o tenant-export.zip
```

### Clone Tenant for Staging

```bash
curl -X POST "http://localhost:3001/api/tenant-migration/clone" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceTenantId": "clx123",
    "targetName": "Staging Environment",
    "includeUsers": false,
    "includeAudits": false
  }'
```

### GDPR Data Deletion

```bash
curl -X DELETE "http://localhost:3001/api/tenant-migration/delete/clx123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gdprCompliant": true,
    "createBackup": true
  }'
```

### Import with Dry Run

```bash
curl -X POST "http://localhost:3001/api/tenant-migration/import" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "importData": {...},
    "createNew": true,
    "dryRun": true
  }'
```

## Best Practices

1. **Always create rollback points** before major data operations
2. **Use dry run mode** to validate imports before execution
3. **Enable GDPR logging** for all deletion operations
4. **Create backups** before deletions (enabled by default)
5. **Validate import data** before importing
6. **Monitor audit logs** for all migration operations
7. **Test in staging** using the clone feature before production changes
8. **Store rollback paths** securely for disaster recovery

## GDPR Compliance

The tenant deletion endpoint is designed to be GDPR-compliant:

- Automatically creates audit log entries for deletion requests
- Creates automatic backups before deletion (configurable)
- Deletes all related data in correct dependency order
- Logs all operations with timestamps and metadata
- Supports "right to be forgotten" requirements

## Rollback and Recovery

The rollback feature provides:

- Point-in-time snapshots of tenant data
- Quick restoration in case of import errors
- Transactional rollback to previous state
- Minimal downtime during recovery

### Rollback Workflow

1. Create rollback point before changes
2. Perform migration/import operation
3. If issues occur, restore from rollback point
4. All data returns to pre-migration state

## Security Considerations

- All endpoints require Admin role
- JWT token validation on every request
- Tenant isolation enforced throughout
- Backup files stored securely
- Audit logging for all operations
- Rate limiting applied (via tenant rate limiter)