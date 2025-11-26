# Queue System Quick Start

## Overview

Background job processing system using Bull queue with Redis for handling:
- ✉️ Email delivery
- 📊 Report generation
- 📦 Data exports
- 🔗 Webhook retries
- 🏢 Tenant onboarding workflows

## Quick Start

### 1. Ensure Redis is Running

```bash
# Check if Redis is running
redis-cli ping

# Or start Redis via Docker
docker-compose up -d redis
```

### 2. Configure Environment

```bash
# Add to server/.env
QUEUE_REDIS_HOST=localhost
QUEUE_REDIS_PORT=6379
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_BACKOFF_DELAY=5000
```

### 3. Access Monitoring Dashboard

The queue monitoring dashboard is available at:
```
http://localhost:3001/api/jobs/dashboard
```

Requires authentication. Provides real-time queue monitoring with Bull Board.

## Common Usage Patterns

### Queue an Email

```javascript
import { queueEmail } from './services/queueService.js';

await queueEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome</h1>',
  text: 'Welcome'
});
```

### Generate a Report

```javascript
import { queueReport } from './services/queueService.js';

await queueReport({
  type: 'audits',
  organizationId: req.tenantId,
  filters: { status: 'Completed' },
  format: 'json',
  notifyEmail: 'user@example.com'
});
```

### Export Data

```javascript
import { queueDataExport } from './services/queueService.js';

await queueDataExport({
  organizationId: req.tenantId,
  entities: ['stations', 'audits', 'incidents'],
  format: 'json',
  notifyEmail: 'user@example.com'
});
```

### Deliver Webhook

```javascript
import { queueWebhook } from './services/queueService.js';

await queueWebhook({
  url: 'https://api.example.com/webhook',
  payload: { event: 'incident.created', data: incident },
  secret: 'webhook-secret',
  eventType: 'incident.created',
  organizationId: req.tenantId
});
```

### Onboard New Tenant

```javascript
import { queueTenantOnboarding } from './services/queueService.js';

await queueTenantOnboarding({
  organizationName: 'Acme Corp',
  adminEmail: 'admin@acme.com',
  adminName: 'John Doe',
  tier: 'professional'
});
```

## REST API Examples

### Get Queue Stats

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/jobs/stats
```

### Create Email Job

```bash
curl -X POST http://localhost:3001/api/jobs/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Test",
    "html": "<p>Hello</p>"
  }'
```

### Get Job Status

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/jobs/email/jobs/123
```

### Retry Failed Job

```bash
curl -X POST http://localhost:3001/api/jobs/email/jobs/123/retry \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Available Queues

1. **email** - Email delivery (priority: 2, attempts: 5)
2. **reports** - Report generation (priority: 3, timeout: 5min)
3. **data-exports** - Data exports (priority: 4, timeout: 10min)
4. **webhooks** - Webhook delivery (priority: 2, attempts: 5)
5. **tenant-onboarding** - New tenant setup (priority: 1, attempts: 3)
6. **cleanup** - Maintenance tasks (priority: 5, attempts: 2)

## Monitoring

### Queue Statistics

Monitor via dashboard or API:
- Jobs waiting in queue
- Jobs currently processing
- Jobs completed
- Jobs failed
- Processing rate

### Logs

All job events are logged:
```
{ jobId: '123', queue: 'email', status: 'processing' }
{ jobId: '123', queue: 'email', status: 'completed' }
{ jobId: '123', queue: 'email', status: 'failed', error: '...' }
```

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection:
```bash
redis-cli ping
```

2. Check server logs:
```bash
docker-compose logs -f app | grep "processor started"
```

3. Check queue stats:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/jobs/stats
```

### High Failure Rate

1. Check error logs
2. Verify external dependencies (SMTP, webhooks)
3. Review timeout settings
4. Check resource limits

### Memory Issues

1. Reduce concurrency: `QUEUE_CONCURRENCY=2`
2. Clean old jobs more frequently
3. Monitor Redis memory usage

## Performance Tuning

### Adjust Concurrency

```bash
# Low resources
QUEUE_CONCURRENCY=2

# Medium resources (default)
QUEUE_CONCURRENCY=5

# High resources
QUEUE_CONCURRENCY=10
```

### Job Retention

Jobs are automatically cleaned:
- Completed: 1 day
- Failed: 7 days

Manual cleanup:
```bash
curl -X POST http://localhost:3001/api/jobs/email/clean \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grace": 3600000, "status": "completed"}'
```

## Documentation

For comprehensive documentation, see: `server/QUEUE_SYSTEM.md`

Topics covered:
- Architecture and components
- Configuration options
- All job types and usage
- REST API reference
- Retry strategies
- Monitoring and alerting
- Best practices
- Integration examples
