# Security Hardening Documentation

## Overview

This document describes the comprehensive security hardening measures implemented in the HSE.Digital backend platform.

## Security Layers

### 1. Input Validation (Zod Schemas)

**Implementation**: `server/middleware/validation.js`

All API endpoints validate incoming data using Zod schemas before processing:

```javascript
import { validateRequest, stationSchema } from './middleware/validation.js';

app.post('/api/stations', validateRequest(stationSchema), handler);
```

**Schemas Available**:
- `stationSchema` - Station creation/updates
- `auditSchema` - Audit operations
- `incidentSchema` - Incident reporting
- `workPermitSchema` - Work permit requests
- `contractorSchema` - Contractor management
- `organizationSchema` - Organization settings
- `userUpdateSchema` - User profile updates
- `aiPromptSchema` - AI prompt validation
- `idParamSchema` - URL parameter validation

**Benefits**:
- Type-safe inputs prevent unexpected data types
- Prevents buffer overflow attacks via size limits
- Validates email formats, CUIDs, enums
- Returns detailed validation errors to clients

### 2. SQL Injection Prevention

**Implementation**: Multi-layered approach

**Layer 1 - Parameterized Queries (Prisma ORM)**:
```javascript
await prisma.station.findMany({
    where: { 
        organizationId: req.tenantId,
        region: req.query.region  // Safely parameterized
    }
});
```

All database queries use Prisma's parameterized query builder, making SQL injection impossible.

**Layer 2 - Input Sanitization**:
```javascript
import { sanitizeRequest } from './middleware/sanitization.js';

app.use(sanitizeRequest());
```

Detects and blocks SQL injection patterns:
- `UNION`, `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`
- Comment sequences: `--`, `/*`, `*/`
- Stored procedure calls: `xp_`, `sp_`

**Layer 3 - Request Validation**:
String inputs are validated before reaching business logic.

### 3. CSRF Protection

**Implementation**: `server/middleware/csrf.js`

Custom token-based CSRF protection with in-memory session tracking:

```javascript
import { generateCSRFMiddleware } from './middleware/csrf.js';

app.use(generateCSRFMiddleware());
```

**How it works**:
1. GET requests receive a CSRF token in `X-CSRF-Token` header
2. POST/PUT/DELETE requests must include token in:
   - `X-CSRF-Token` header, OR
   - `_csrf` field in request body
3. Tokens are tied to session IDs (user ID or custom session)
4. Tokens expire after 1 hour
5. Background cleanup removes expired tokens

**Client Integration**:
```javascript
// Get token from initial GET request
const csrfToken = response.headers['x-csrf-token'];

// Include in subsequent POST requests
fetch('/api/stations', {
    method: 'POST',
    headers: {
        'X-CSRF-Token': csrfToken,
        'X-Session-Id': userId
    },
    body: JSON.stringify(data)
});
```

### 4. Rate Limiting (Redis Token Bucket)

**Implementation**: `server/middleware/rateLimitRedis.js`

Distributed rate limiting using Redis and token bucket algorithm:

**Rate Limit Tiers**:

| Tier | Capacity | Refill Rate | Window | Applied To |
|------|----------|-------------|--------|------------|
| Tenant | 1000 | 100/sec | Rolling | Organization ID |
| User | 100 | 10/sec | Rolling | User ID |
| IP | 300 | 20/min | 15 min fixed | IP Address |
| Auth | 5 | 1/min | 15 min fixed | IP + Email |

**Token Bucket Algorithm**:
1. Each identifier gets a bucket with capacity N tokens
2. Each request consumes 1 token
3. Tokens refill at rate R per interval I
4. When bucket is empty, requests are rejected with 429
5. Response includes `X-RateLimit-*` headers

**Usage**:
```javascript
import { tenantRateLimit, userRateLimit, ipRateLimit, authRateLimit } from './middleware/rateLimitRedis.js';

// Tenant-level protection
app.get('/api/stations', tenantRateLimit, handler);

// User-level protection
app.post('/api/upload', userRateLimit, handler);

// IP-level protection (all API routes)
app.use('/api/', ipRateLimit);

// Auth endpoint protection
app.use('/api/auth', authRateLimit);
```

**Redis Configuration**:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Benefits**:
- Distributed across multiple server instances
- Prevents DDoS attacks
- Prevents brute force authentication
- Fair resource allocation per tenant
- Graceful degradation on Redis failure

### 5. Request Sanitization

**Implementation**: `server/middleware/sanitization.js`

Strips dangerous characters and patterns from all inputs:

```javascript
app.use(sanitizeRequest());
```

**XSS Prevention**:
- Escapes: `<`, `>`, `"`, `'`, `/`
- Removes: `<script>`, `<iframe>`, `<embed>`, `<object>`
- Blocks: `javascript:`, `vbscript:`, `data:text/html`
- Strips event handlers: `onclick=`, `onerror=`, etc.

**Deep Object Sanitization**:
Recursively sanitizes nested objects and arrays:
```javascript
{
    name: "<script>alert('xss')</script>",
    metadata: {
        description: "<img onerror=alert(1)>"
    }
}
// Becomes:
{
    name: "&lt;script&gt;alert('xss')&lt;&#x2F;script&gt;",
    metadata: {
        description: "&lt;img onerror=alert(1)&gt;"
    }
}
```

**HTML Sanitization** (for rich text):
```javascript
import { sanitizeHTML } from './middleware/sanitization.js';

const clean = sanitizeHTML(userInput);
// Allows: b, i, em, strong, a, p, br
// Strips all other tags and attributes
```

### 6. Content Security Policy

**Implementation**: `server/middleware/security.js`

Comprehensive security headers via Helmet.js:

```javascript
import { securityHeaders, additionalSecurityHeaders } from './middleware/security.js';

app.use(securityHeaders());
app.use(additionalSecurityHeaders);
```

**Headers Set**:
- `Content-Security-Policy`: Restricts resource loading
  - Scripts: self, Stripe
  - Styles: self, Google Fonts
  - Images: self, data, https
  - Frames: self, Stripe
  - Objects: none
  - Upgrade insecure requests (production)
  
- `X-Content-Type-Options: nosniff`: Prevents MIME sniffing
- `X-Frame-Options: DENY`: Prevents clickjacking
- `X-XSS-Protection: 1; mode=block`: Legacy XSS protection
- `Strict-Transport-Security`: Forces HTTPS (HSTS)
  - Max age: 1 year
  - Include subdomains
  - Preload enabled
  
- `Referrer-Policy: strict-origin-when-cross-origin`: Limits referrer info
- `Permissions-Policy`: Disables geolocation, microphone, camera
- `X-Powered-By`: Removed to hide server info

### 7. Security Audit Logging

**Implementation**: `server/middleware/auditLog.js`

Comprehensive logging of all sensitive operations:

**Logged Operations**:
- Authentication (login, register, password reset)
- User management (create, update, delete)
- Audit operations (create, modify, delete)
- Organization changes
- RBAC modifications (roles, permissions)

**Log Storage**:
1. **Database** (`audit_logs` table):
   - Queryable for compliance
   - Indexed for performance
   - Long-term retention
   
2. **File System** (`server/logs/security-audit.log`):
   - Immediate write
   - JSON format
   - Rotation recommended

**Log Format**:
```json
{
    "timestamp": "2024-01-15T10:30:45.123Z",
    "userId": "user_abc123",
    "organizationId": "org_xyz789",
    "action": "Authentication attempt",
    "resource": "/api/auth/login",
    "resourceId": null,
    "method": "POST",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "status": 200,
    "duration": 145,
    "errorMessage": null,
    "metadata": {
        "query": {},
        "bodyKeys": ["email", "password"]
    }
}
```

**Querying Audit Logs**:
```javascript
const logs = await prisma.auditLog.findMany({
    where: {
        userId: 'user_id',
        action: 'Audit deletion',
        createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
        }
    },
    orderBy: { createdAt: 'desc' }
});
```

**Security Event Logging**:
```javascript
import { logSecurityEvent } from './middleware/auditLog.js';

await logSecurityEvent('SUSPICIOUS_LOGIN', {
    severity: 'WARNING',
    userId: 'user_id',
    ipAddress: req.ip,
    reason: 'Multiple failed attempts'
});
```

## Security Best Practices

### Environment Variables
- Never commit `.env` files
- Use strong, unique secrets in production
- Rotate JWT secrets periodically
- Use environment-specific configurations

### Database Security
- Enable SSL for database connections in production
- Use read replicas for reporting queries
- Implement database-level row-level security
- Regular backups with encryption

### Authentication
- Enforce strong password policies (done via Zod schemas)
- Implement account lockout after failed attempts
- Use refresh token rotation
- Session invalidation on password change
- Email verification required

### Network Security
- Use HTTPS in production (enforce via HSTS)
- Configure firewall rules
- Limit database access to application servers
- Use VPC for cloud deployments

### Monitoring & Alerts
- Monitor audit logs for suspicious patterns
- Alert on multiple failed login attempts
- Track rate limit violations
- Monitor for SQL injection attempts
- Set up intrusion detection

### Incident Response
1. Review audit logs to determine scope
2. Revoke compromised tokens
3. Force password resets if needed
4. Patch vulnerabilities immediately
5. Notify affected users if data exposed

## Testing Security

Run security tests:
```bash
npm test -- security.test.js
```

Manual security testing:
```bash
# Test SQL injection
curl -X GET "http://localhost:3001/api/stations?region='; DROP TABLE stations; --" \
  -H "Authorization: Bearer $TOKEN"

# Test XSS
curl -X POST http://localhost:3001/api/stations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(1)</script>", "riskCategory": "Low"}'

# Test rate limiting
for i in {1..100}; do
  curl http://localhost:3001/api/health &
done
```

## Security Checklist

- [x] Input validation on all endpoints
- [x] SQL injection prevention (parameterized queries)
- [x] CSRF protection with tokens
- [x] Rate limiting (per tenant, user, IP)
- [x] Request sanitization (XSS prevention)
- [x] Content Security Policy headers
- [x] Security audit logging
- [x] Authentication & authorization (JWT + RBAC)
- [x] Password hashing (bcrypt)
- [x] Secure session management
- [x] HTTPS enforcement (production)
- [x] Email verification
- [ ] Two-factor authentication (future enhancement)
- [ ] IP whitelisting for admin operations (future enhancement)

## Compliance

This security implementation helps meet requirements for:
- **OWASP Top 10**: Addresses injection, XSS, CSRF, broken authentication
- **GDPR**: Audit logging for data access, secure data handling
- **SOC 2**: Access controls, audit trails, security monitoring
- **ISO 27001**: Information security management practices

## Support

For security concerns or vulnerability reports, contact: security@hse.digital
