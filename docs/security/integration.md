# Security Features Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

New security dependencies added:
- `redis` / `ioredis` - Rate limiting backend
- `cookie-parser` - Cookie handling
- `dompurify` + `jsdom` - HTML sanitization
- `express-validator` - Additional validation utilities

### 2. Configure Redis

Add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

Start Redis:
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 3. Update Database Schema

```bash
npx prisma generate
npx prisma db push
# or create migration:
npx prisma migrate dev --name add_security_features
```

New tables added:
- `audit_logs` - Security audit trail

New columns in `users`:
- `isEmailVerified`
- `emailVerificationToken`
- `emailVerificationExpires`
- `passwordResetToken`
- `passwordResetExpires`
- `refreshTokens`

## Using Security Middleware

### Input Validation

```javascript
import { validateRequest, stationSchema } from './middleware/validation.js';

// Validate request body
app.post('/api/stations', 
    validateRequest(stationSchema), 
    async (req, res) => {
        // req.validatedData contains validated data
        const station = await prisma.station.create({
            data: req.validatedData
        });
        res.json(station);
    }
);

// Validate URL parameters
import { validateParams, idParamSchema } from './middleware/validation.js';

app.get('/api/stations/:id',
    validateParams(idParamSchema),
    async (req, res) => {
        // req.params.id is validated as CUID
    }
);

// Validate query parameters
import { validateQuery } from './middleware/validation.js';
import { z } from 'zod';

const stationQuerySchema = z.object({
    region: z.string().optional(),
    riskCategory: z.enum(['Low', 'Medium', 'High', 'Critical']).optional()
});

app.get('/api/stations',
    validateQuery(stationQuerySchema),
    async (req, res) => {
        // req.validatedQuery contains validated query params
    }
);
```

### Rate Limiting

```javascript
import { 
    tenantRateLimit, 
    userRateLimit, 
    ipRateLimit, 
    authRateLimit 
} from './middleware/rateLimitRedis.js';

// Per-tenant rate limiting (1000 requests, 100/sec refill)
app.get('/api/stations', 
    authenticateToken,
    tenantContext,
    tenantRateLimit,
    handler
);

// Per-user rate limiting (100 requests, 10/sec refill)
app.post('/api/upload',
    authenticateToken,
    userRateLimit,
    handler
);

// IP-based rate limiting (300 requests per 15 min)
app.use('/api/', ipRateLimit);

// Auth endpoint protection (5 attempts per 15 min)
app.use('/api/auth', authRateLimit);

// Custom rate limit
import { tokenBucketRateLimit } from './middleware/rateLimitRedis.js';

const customLimit = tokenBucketRateLimit({
    capacity: 50,
    refillRate: 5,
    refillInterval: 1000,
    keyPrefix: 'custom_limit',
    identifierFn: (req) => req.user.id
});

app.post('/api/expensive-operation', customLimit, handler);
```

### CSRF Protection

Already configured globally. Clients must:

1. Get token from GET request:
```javascript
const response = await fetch('/api/stations', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
const csrfToken = response.headers.get('x-csrf-token');
```

2. Include token in POST/PUT/DELETE:
```javascript
await fetch('/api/stations', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken,
        'X-Session-Id': userId,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
});
```

### Audit Logging

Sensitive operations are logged automatically. To log custom events:

```javascript
import { logSecurityEvent } from './middleware/auditLog.js';

// Log a security event
await logSecurityEvent('SUSPICIOUS_ACTIVITY', {
    severity: 'WARNING',
    userId: req.user.id,
    ipAddress: req.ip,
    action: 'Multiple failed password attempts',
    metadata: { attempts: 5 }
});
```

Query audit logs:

```javascript
// Get user's audit trail
const logs = await prisma.auditLog.findMany({
    where: { userId: 'user_id' },
    orderBy: { createdAt: 'desc' },
    take: 100
});

// Get failed authentication attempts
const failedLogins = await prisma.auditLog.findMany({
    where: {
        action: 'Authentication attempt',
        status: 401,
        createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
    }
});
```

### Request Sanitization

Already configured globally. All inputs are sanitized automatically.

To sanitize HTML content:

```javascript
import { sanitizeHTML } from './middleware/sanitization.js';

const cleanHTML = sanitizeHTML(userInput);
// Only allows: b, i, em, strong, a, p, br tags
```

## Creating New Endpoints

Follow this pattern for maximum security:

```javascript
import { 
    validateRequest, 
    validateParams, 
    mySchema, 
    idParamSchema 
} from './middleware/validation.js';
import { 
    tenantRateLimit 
} from './middleware/rateLimitRedis.js';
import { 
    authenticateToken, 
    tenantContext 
} from './middleware/auth.js';
import { 
    requirePermission 
} from './middleware/rbac.js';

app.post('/api/my-resource',
    // 1. Rate limiting (IP-based already applied globally)
    
    // 2. Authentication
    authenticateToken,
    
    // 3. Tenant context
    tenantContext,
    
    // 4. Tenant-specific rate limiting
    tenantRateLimit,
    
    // 5. Authorization (RBAC)
    requirePermission('myResource', 'write'),
    
    // 6. Input validation
    validateRequest(mySchema),
    
    // 7. Handler (sanitization already applied)
    async (req, res) => {
        // req.validatedData contains sanitized, validated data
        // req.tenantId contains the organization ID
        // req.user contains authenticated user
        
        const resource = await prisma.myResource.create({
            data: {
                organizationId: req.tenantId,
                userId: req.user.id,
                ...req.validatedData
            }
        });
        
        res.status(201).json(resource);
    }
);
```

## Testing Security

### Run Security Tests

```bash
# Run all tests
npm test

# Run only security tests
npm test -- security.test.js
```

### Manual Testing

```bash
# Test SQL injection prevention
curl "http://localhost:3001/api/stations?region=%27%3B+DROP+TABLE+stations%3B+--" \
  -H "Authorization: Bearer $TOKEN"

# Test XSS prevention
curl -X POST http://localhost:3001/api/stations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(1)</script>", "riskCategory": "Low"}'

# Test rate limiting
for i in {1..100}; do
  curl http://localhost:3001/api/health &
done
wait

# Test CSRF protection (should fail without token)
curl -X POST http://localhost:3001/api/stations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "riskCategory": "Low"}'
```

## Monitoring & Maintenance

### Check Rate Limit Stats

```bash
# Connect to Redis
redis-cli

# View all rate limit keys
KEYS rate_limit:*

# Check specific user's bucket
HGETALL rate_limit:user:user_id_here

# Monitor real-time commands
MONITOR
```

### View Audit Logs

```sql
-- Recent security events
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- Failed authentication attempts
SELECT ip_address, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'Authentication attempt'
  AND status = 401
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;

-- User activity
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE user_id = 'user_id_here'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY count DESC;
```

### Log File Rotation

Set up log rotation for `server/logs/security-audit.log`:

```bash
# /etc/logrotate.d/hse-security
/path/to/server/logs/security-audit.log {
    daily
    rotate 90
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
    postrotate
        # Signal application to reopen log file if needed
    endscript
}
```

## Troubleshooting

### Redis Connection Issues

```javascript
// Check Redis connection
import { redis } from './middleware/rateLimitRedis.js';

redis.ping().then(() => {
    console.log('Redis connected');
}).catch(err => {
    console.error('Redis connection failed:', err);
});
```

If Redis is unavailable, rate limiting middleware gracefully degrades (allows requests through).

### CSRF Token Issues

If clients report CSRF errors:
1. Ensure they're getting token from GET request first
2. Verify `X-CSRF-Token` header is included in POST/PUT/DELETE
3. Check `X-Session-Id` header matches across requests
4. Tokens expire after 1 hour - get a fresh token

### Rate Limit Debugging

Add logging to see rate limit details:

```javascript
res.on('finish', () => {
    console.log({
        user: req.user?.id,
        tenant: req.tenantId,
        remaining: res.getHeader('X-RateLimit-Remaining'),
        limit: res.getHeader('X-RateLimit-Limit')
    });
});
```

## Performance Considerations

- **Redis**: Single Redis instance can handle 100K+ ops/sec
- **Rate Limiting**: ~2ms overhead per request
- **Validation**: ~0.5ms overhead per request
- **Sanitization**: ~1ms overhead per request
- **Audit Logging**: Async, no blocking (~5ms in background)

Total security overhead: ~3-4ms per request

## Migration from Old Code

If you have existing endpoints without security:

1. Add rate limiting: `tenantRateLimit` or `userRateLimit`
2. Add validation: Create Zod schema and use `validateRequest()`
3. Ensure using Prisma for all queries (no raw SQL)
4. Check audit logging covers your endpoints
5. Test with security test suite

Example migration:

```javascript
// OLD
app.post('/api/stations', authenticateToken, async (req, res) => {
    const { name, region } = req.body;
    // ... create station
});

// NEW
import { validateRequest, stationSchema } from './middleware/validation.js';
import { tenantRateLimit } from './middleware/rateLimitRedis.js';

app.post('/api/stations', 
    authenticateToken,
    tenantContext,
    tenantRateLimit,
    requirePermission('stations', 'write'),
    validateRequest(stationSchema),
    async (req, res) => {
        const station = await prisma.station.create({
            data: {
                organizationId: req.tenantId,
                ...req.validatedData
            }
        });
        res.status(201).json(station);
    }
);
```

## Production Checklist

- [ ] Redis configured and running
- [ ] Strong JWT secrets in production `.env`
- [ ] Database SSL enabled
- [ ] HTTPS enforced (HSTS headers)
- [ ] Log rotation configured
- [ ] Monitoring for failed auth attempts
- [ ] Alerts for rate limit violations
- [ ] Regular security audit log reviews
- [ ] Backup database including audit logs
- [ ] Test disaster recovery procedures
