# Quota System Documentation

## Overview

The quota system enforces plan-based limits on resources and features. It tracks usage in real-time using Redis and provides middleware for automatic enforcement.

## Architecture

### Components

1. **Config** (`config/quota.json`): Defines limits and features per plan
2. **Service** (`services/quotaService.js`): Core quota logic and Redis tracking
3. **Middleware** (`middleware/quota.js`): Request-level enforcement
4. **API Endpoint** (`/api/usage/current`): Dashboard data retrieval
5. **Frontend Components**: Usage display and upgrade prompts

### Plans

- **Free**: Limited resources, no AI, basic features
- **Starter**: Moderate limits, AI enabled
- **Professional**: High limits, advanced analytics, custom branding
- **Enterprise**: Unlimited resources, all features

## Usage Tracking

### Monthly Counters
Tracked in Redis with automatic expiration:
- `usage:{orgId}:audits:{YYYY-MM}` (35 day TTL)
- `usage:{orgId}:incidents:{YYYY-MM}` (35 day TTL)
- `usage:{orgId}:work_permits:{YYYY-MM}` (35 day TTL)

### Daily Counters
- `usage:{orgId}:{resource}:{YYYY-MM-DD}` (2 day TTL)

### Resource Counts
Real-time counts from database:
- Stations, Users, Contractors, Form Definitions

## Middleware Usage

### Quota Enforcement

```javascript
app.post('/api/stations', 
    authenticateToken, 
    tenantContext, 
    requireQuota('stations'),  // Enforce limit
    asyncHandler(async (req, res) => {
        // Create station
    })
);
```

### Usage Tracking

```javascript
app.post('/api/audits', 
    authenticateToken, 
    tenantContext, 
    requireQuota('audits'),
    trackUsage('audits'),  // Increment counter on success
    asyncHandler(async (req, res) => {
        // Create audit
    })
);
```

### Feature Gates

```javascript
app.post('/api/ai/generate', 
    authenticateToken, 
    tenantContext, 
    requireFeature('ai_assistant'),  // Check feature access
    asyncHandler(async (req, res) => {
        // Generate AI content
    })
);
```

## Admin Override

Admins can bypass quotas by including the header:
```
x-admin-override: true
```

This requires `role === 'Admin'` in the JWT token.

## API Responses

### Quota Exceeded
```json
{
    "error": "Quota exceeded",
    "code": "QUOTA_EXCEEDED",
    "resource": "stations",
    "limit": 5,
    "current": 5,
    "plan": "free",
    "upgrade_required": true
}
```

### Feature Not Available
```json
{
    "error": "Feature not available",
    "code": "FEATURE_NOT_AVAILABLE",
    "feature": "ai_assistant",
    "upgrade_required": true
}
```

### Usage Stats
```json
{
    "plan": {
        "name": "Free",
        "subscriptionPlan": "free"
    },
    "limits": {
        "stations": 5,
        "users": 3,
        "audits_per_month": 10
    },
    "features": {
        "ai_assistant": false,
        "advanced_analytics": false
    },
    "usage": {
        "stations": { "current": 3, "limit": 5 },
        "audits_this_month": { "current": 7, "limit": 10 }
    }
}
```

## Frontend Integration

### Display Usage
```tsx
import UsageDisplay from '@/components/shared/UsageDisplay';

function Dashboard() {
    return <UsageDisplay />;
}
```

### Handle Quota Errors
```tsx
import { isQuotaError } from '@/utils/apiClient';
import QuotaExceededModal from '@/components/shared/QuotaExceededModal';

try {
    await apiClient.post('/api/stations', data);
} catch (error) {
    if (isQuotaError(error)) {
        setQuotaError(error);
        setShowModal(true);
    }
}
```

## Configuration

Edit `config/quota.json` to adjust limits:

```json
{
    "plans": {
        "free": {
            "limits": {
                "stations": 5,
                "audits_per_month": 10
            },
            "features": {
                "ai_assistant": false
            }
        }
    }
}
```

Use `-1` for unlimited resources (enterprise).

## Redis Requirements

Ensure Redis is configured in `.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Testing

Run quota tests:
```bash
npm test -- quota.test.js
```

## Maintenance

### Reset Monthly Usage
```javascript
import { resetMonthlyUsage } from './services/quotaService.js';
await resetMonthlyUsage(organizationId);
```

### Monitor Usage
Check Redis keys:
```bash
redis-cli KEYS "usage:*"
```

## Extending

### Add New Resource Limit
1. Add to `quota.json` limits section
2. Add database count or Redis key in `getCurrentUsage()`
3. Add mapping in `checkQuota()` resourceLimitMap
4. Apply middleware to relevant routes

### Add New Feature
1. Add to `quota.json` features section
2. Apply `requireFeature()` middleware to protected routes
3. Update frontend to check feature availability
