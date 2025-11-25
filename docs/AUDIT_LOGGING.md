# Audit Logging System

## Overview

The audit logging system provides comprehensive tracking of all write operations (CREATE, UPDATE, DELETE) across the platform with GDPR-compliant PII handling and automatic retention management.

## Features

- **Automatic Logging**: All write operations are automatically logged via middleware
- **GDPR Compliance**: Sensitive fields (passwords, tokens) are automatically redacted
- **Tenant Isolation**: Logs are scoped to organizations for multi-tenant security
- **Retention Policy**: Configurable automatic cleanup of old logs
- **Rich Filtering**: Filter logs by user, action, entity type, date range
- **IP & User Agent Tracking**: Track request origin for security auditing

## Database Schema

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  action         String   // CREATE, UPDATE, DELETE
  entityType     String   // audit, station, user, etc.
  entityId       String?
  changes        Json?    // { before: {}, after: {} }
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([entityType])
  @@index([createdAt])
}
```

## Usage

### Backend Middleware

Apply audit logging to any route:

```javascript
import { auditLog, captureOriginalEntity } from './middleware/auditLog.js';

// For CREATE operations
app.post('/api/audits', 
  authenticateToken, 
  tenantContext, 
  auditLog('audit'), 
  asyncHandler(async (req, res) => {
    // ... your logic
  })
);

// For UPDATE/DELETE operations (captures before state)
app.put('/api/audits/:id', 
  authenticateToken, 
  tenantContext, 
  captureOriginalEntity('audit'), 
  auditLog('audit'), 
  asyncHandler(async (req, res) => {
    // ... your logic
  })
);
```

### Frontend Component

The ActivityLog component in Settings displays audit logs with filtering:

```tsx
import ActivityLog from './settings/ActivityLog';

<ActivityLog users={users} />
```

### API Endpoints

#### Get Audit Logs
```
GET /api/admin/audit-logs
Query Parameters:
  - userId: Filter by user ID
  - action: Filter by action (CREATE, UPDATE, DELETE)
  - entityType: Filter by entity type
  - startDate: ISO date string
  - endDate: ISO date string
  - page: Page number (default: 1)
  - limit: Results per page (default: 50)

Response:
{
  "logs": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

#### Get Audit Log Statistics
```
GET /api/admin/audit-logs/stats
Query Parameters:
  - startDate: ISO date string
  - endDate: ISO date string

Response:
{
  "totalLogs": 1500,
  "actionCounts": [
    { "action": "CREATE", "count": 500 },
    { "action": "UPDATE", "count": 800 },
    { "action": "DELETE", "count": 200 }
  ],
  "entityTypeCounts": [...],
  "topUsers": [...]
}
```

## GDPR Compliance

### Sensitive Field Redaction

The following fields are automatically redacted from audit logs:
- `password`
- `refreshTokens`
- `emailVerificationToken`
- `passwordResetToken`

Example:
```json
{
  "before": {
    "email": "user@example.com",
    "password": "[REDACTED]"
  },
  "after": {
    "email": "newemail@example.com",
    "password": "[REDACTED]"
  }
}
```

### Data Retention

Configure retention period via environment variable:
```env
AUDIT_LOG_RETENTION_DAYS=365
```

Logs older than the retention period are automatically deleted daily at 2 AM.

### Manual Cleanup

```javascript
import { cleanupOldAuditLogs } from './services/auditLogCleanup.js';

// Manually trigger cleanup
const deletedCount = await cleanupOldAuditLogs();
console.log(`Deleted ${deletedCount} old logs`);
```

## Permissions

Access to audit logs requires the `audit_logs:read` permission, typically granted to:
- Admin role
- Compliance Manager role

## Security Considerations

1. **IP Address Tracking**: Logs include IP addresses for security forensics
2. **User Agent Tracking**: Browser/client information is stored
3. **Tenant Isolation**: Users can only view logs for their organization
4. **Immutable Logs**: Audit logs cannot be edited or deleted (except via retention policy)
5. **Change Tracking**: Both before and after states are captured for updates

## Best Practices

1. **Apply to All Write Operations**: Ensure all CREATE/UPDATE/DELETE endpoints use audit logging
2. **Regular Review**: Monitor audit logs for suspicious activity
3. **Retention Policy**: Set appropriate retention period based on compliance requirements
4. **PII Protection**: Verify sensitive data is redacted before logging
5. **Performance**: Logs are written asynchronously to avoid blocking requests

## Troubleshooting

### Logs Not Appearing

1. Check middleware is applied to route
2. Verify user is authenticated (req.user is set)
3. Check tenant context is set (req.tenantId)
4. Verify database connection

### Performance Issues

1. Ensure indexes are created on audit_logs table
2. Consider archiving old logs instead of deleting
3. Implement log aggregation for high-volume systems

### GDPR Concerns

1. Review sanitizeChanges function for your specific fields
2. Add additional sensitive fields to GDPR_SENSITIVE_FIELDS array
3. Document what PII is stored and why
4. Implement right to erasure for user data

## Example Log Entry

```json
{
  "id": "clx123...",
  "organizationId": "org-1",
  "userId": "user-123",
  "action": "UPDATE",
  "entityType": "audit",
  "entityId": "aud-456",
  "changes": {
    "before": {
      "status": "Scheduled",
      "findings": []
    },
    "after": {
      "status": "Completed",
      "findings": [...]
    }
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```
