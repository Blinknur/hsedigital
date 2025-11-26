# Background Job Processing System

## Overview

This system implements a robust background job processing infrastructure using Bull queue with Redis. It handles asynchronous tasks including email delivery, report generation, data exports, webhook retries, and tenant onboarding workflows.

## Architecture

### Components

1. **Queue Configuration** (`queues/queueConfig.js`)
   - Centralized Redis configuration
   - Default job options with exponential backoff
   - Automatic job cleanup policies
   - Error handling and logging

2. **Queues** (`queues/index.js`)
   - **Email Queue**: High-priority email delivery (5 attempts)
   - **Report Queue**: Report generation with 5-minute timeout
   - **Data Export Queue**: Large data exports with 10-minute timeout
   - **Webhook Queue**: Webhook delivery with exponential backoff (5 attempts)
   - **Tenant Onboarding Queue**: New tenant provisioning workflow
   - **Cleanup Queue**: Maintenance and cleanup tasks

3. **Job Processors** (`jobs/`)
   - Separate processor for each job type
   - Configurable concurrency
   - Progress tracking
   - Automatic retry with exponential backoff
   - Comprehensive error logging

4. **Job Monitoring Dashboard** (`routes/jobs.js`)
   - Bull Board integration for visual monitoring
   - REST API for job management
   - Queue statistics and metrics
   - Job retry and removal capabilities

## Configuration

### Environment Variables

```bash
# Redis Configuration
QUEUE_REDIS_HOST=localhost
QUEUE_REDIS_PORT=6379
QUEUE_REDIS_PASSWORD=

# Queue Settings
QUEUE_CONCURRENCY=5          # Number of concurrent jobs per processor
QUEUE_MAX_RETRIES=3          # Default max retry attempts
QUEUE_BACKOFF_DELAY=5000     # Base delay for exponential backoff (ms)
```

### Queue-Specific Settings

Each queue can be configured with custom options:

```javascript
{
  priority: 1-5,              // Lower number = higher priority
  attempts: 3,                // Max retry attempts
  timeout: 300000,            // Job timeout in ms
  backoff: {
    type: 'exponential',
    delay: 5000
  }
}
```

## Usage

### Adding Jobs Programmatically

#### Email Job

```javascript
import { queueEmail } from './services/queueService.js';

await queueEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our platform</h1>',
  text: 'Welcome to our platform',
  from: 'noreply@hse.digital'
});
```

#### Report Generation

```javascript
import { queueReport } from './services/queueService.js';

await queueReport({
  type: 'audits',              // audits, incidents, work-permits, compliance
  organizationId: 'org-123',
  filters: { status: 'Completed' },
  format: 'json',              // json or csv
  userId: 'user-123',
  notifyEmail: 'user@example.com'
});
```

#### Data Export

```javascript
import { queueDataExport } from './services/queueService.js';

await queueDataExport({
  organizationId: 'org-123',
  entities: ['stations', 'audits', 'incidents', 'work-permits', 'contractors', 'users'],
  format: 'json',
  userId: 'user-123',
  notifyEmail: 'user@example.com'
});
```

#### Webhook Delivery

```javascript
import { queueWebhook } from './services/queueService.js';

await queueWebhook({
  url: 'https://api.example.com/webhook',
  payload: { event: 'incident.created', data: incidentData },
  secret: 'webhook-secret',
  eventType: 'incident.created',
  organizationId: 'org-123'
});
```

#### Tenant Onboarding

```javascript
import { queueTenantOnboarding } from './services/queueService.js';

await queueTenantOnboarding({
  organizationName: 'Acme Corp',
  adminEmail: 'admin@acme.com',
  adminName: 'John Doe',
  tier: 'professional',
  stripeCustomerId: 'cus_123',
  stripeSubscriptionId: 'sub_123'
});
```

### REST API Endpoints

#### Monitor Dashboard

Access the visual monitoring dashboard at:
```
GET /api/jobs/dashboard
```

Requires authentication. Provides a web UI for monitoring all queues.

#### Queue Statistics

```bash
GET /api/jobs/stats
```

Response:
```json
{
  "email": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 0,
    "paused": 0,
    "total": 160
  },
  "reports": { ... },
  ...
}
```

#### List Jobs

```bash
GET /api/jobs/:queueName/jobs?status=waiting&limit=50
```

Status options: `waiting`, `active`, `completed`, `failed`, `delayed`

#### Get Job Details

```bash
GET /api/jobs/:queueName/jobs/:jobId
```

#### Retry Failed Job

```bash
POST /api/jobs/:queueName/jobs/:jobId/retry
```

#### Remove Job

```bash
DELETE /api/jobs/:queueName/jobs/:jobId
```

#### Clean Queue

```bash
POST /api/jobs/:queueName/clean
Content-Type: application/json

{
  "grace": 3600000,           // Keep jobs from last hour
  "status": "completed"       // completed, failed
}
```

#### Create Email Job

```bash
POST /api/jobs/email
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<p>Hello!</p>",
  "text": "Hello!",
  "from": "noreply@hse.digital",
  "priority": 2
}
```

#### Create Report Job

```bash
POST /api/jobs/reports
Content-Type: application/json

{
  "type": "audits",
  "filters": { "status": "Completed" },
  "format": "json",
  "notifyEmail": "user@example.com"
}
```

#### Create Data Export Job

```bash
POST /api/jobs/data-exports
Content-Type: application/json

{
  "entities": ["stations", "audits", "incidents"],
  "format": "json",
  "notifyEmail": "user@example.com"
}
```

#### Create Webhook Job

```bash
POST /api/jobs/webhooks
Content-Type: application/json

{
  "url": "https://api.example.com/webhook",
  "payload": { "event": "test" },
  "secret": "webhook-secret",
  "eventType": "test.event"
}
```

#### Create Tenant Onboarding Job

```bash
POST /api/jobs/tenant-onboarding
Content-Type: application/json

{
  "organizationName": "Acme Corp",
  "adminEmail": "admin@acme.com",
  "adminName": "John Doe",
  "tier": "professional"
}
```

## Retry Strategies

### Exponential Backoff

Failed jobs automatically retry with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: 5 seconds
- Attempt 3: 25 seconds
- Attempt 4: 125 seconds
- Attempt 5: 625 seconds

### Queue-Specific Retries

- **Email**: 5 attempts (important for deliverability)
- **Reports**: 3 attempts (resource-intensive)
- **Data Exports**: 2 attempts (very resource-intensive)
- **Webhooks**: 5 attempts with 10s base delay (external dependencies)
- **Tenant Onboarding**: 3 attempts (critical but idempotent)

## Monitoring

### Logs

All job events are logged with structured logging:

```javascript
// Job added
{ jobId: '123', queue: 'email', to: 'user@example.com' }

// Job processing
{ jobId: '123', queue: 'email', status: 'processing' }

// Job completed
{ jobId: '123', queue: 'email', status: 'completed', duration: 1500 }

// Job failed
{ jobId: '123', queue: 'email', status: 'failed', error: '...', attempts: 3 }
```

### Metrics

Queue metrics are exposed for monitoring:
- Jobs waiting in queue
- Jobs currently processing
- Jobs completed
- Jobs failed
- Processing rate
- Average job duration

### Alerts

Configure alerts for:
- High queue depth (> 100 jobs waiting)
- High failure rate (> 10% in 5 minutes)
- Stalled jobs (stuck for > 30 seconds)
- Redis connection failures

## Job Lifecycle

1. **Job Created**: Added to queue with options
2. **Job Waiting**: In queue, waiting for available processor
3. **Job Active**: Being processed by a worker
4. **Job Progress**: Updates progress (0-100%)
5. **Job Completed**: Successfully finished, returns result
6. **Job Failed**: Error occurred, scheduled for retry
7. **Job Retry**: Retrying after backoff delay
8. **Job Permanently Failed**: Max retries exceeded
9. **Job Removed**: Cleaned up after retention period

## Best Practices

### 1. Use Appropriate Queues
- Use email queue for all email delivery
- Use report queue for synchronous report generation
- Use data export queue for large data dumps
- Use webhook queue for all external HTTP calls

### 2. Set Realistic Timeouts
- Email: 30 seconds
- Reports: 5 minutes
- Data Exports: 10 minutes
- Webhooks: 30 seconds

### 3. Handle Idempotency
- Ensure jobs can be retried safely
- Use unique identifiers to prevent duplicates
- Check for existing results before processing

### 4. Monitor Queue Depth
- Alert if queues grow beyond expected size
- Scale processors if consistently high
- Investigate if jobs are failing repeatedly

### 5. Clean Up Old Jobs
- Completed jobs: Keep for 1 day
- Failed jobs: Keep for 7 days
- Use the clean endpoint regularly

### 6. Implement Circuit Breakers
- For webhook delivery to external services
- Temporarily pause queues if external service is down
- Resume when service recovers

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection:
```bash
redis-cli -h localhost -p 6379 ping
```

2. Verify processors are running:
```bash
# Check server logs for "processor started" messages
```

3. Check queue status:
```bash
GET /api/jobs/stats
```

### High Failure Rate

1. Check error logs for patterns
2. Verify external dependencies (SMTP, webhooks)
3. Check resource limits (memory, CPU)
4. Review job timeout settings

### Stalled Jobs

1. Check Redis memory usage
2. Verify no long-running synchronous operations
3. Check processor concurrency settings
4. Review timeout configurations

### Memory Issues

1. Reduce concurrency
2. Implement job data pagination
3. Clean old jobs more aggressively
4. Monitor Redis memory usage

## Performance Tuning

### Concurrency

Adjust based on system resources:
```bash
# Low resources
QUEUE_CONCURRENCY=2

# Medium resources
QUEUE_CONCURRENCY=5

# High resources
QUEUE_CONCURRENCY=10
```

### Redis Optimization

```bash
# Increase Redis memory limit
maxmemory 2gb

# Use appropriate eviction policy
maxmemory-policy allkeys-lru
```

### Job Data Size

- Keep job data small (<100KB)
- Store large data in database/files
- Pass references instead of full objects

## Security

### Authentication

All job management endpoints require authentication:
```javascript
app.use('/api/jobs', authenticateToken, tenantContext, jobsRoutes);
```

### Tenant Isolation

Jobs are isolated by organization:
- Jobs can only be accessed by their tenant
- Cross-tenant job access is prevented
- Dashboard shows only tenant's jobs

### Webhook Security

Webhooks include HMAC signatures:
```javascript
const signature = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${JSON.stringify(payload)}`)
  .digest('hex');
```

Recipients should verify signatures before processing.

## Integration Examples

### Send Welcome Email After Signup

```javascript
// In auth route
app.post('/api/auth/signup', async (req, res) => {
  const user = await createUser(req.body);
  
  await queueEmail({
    to: user.email,
    subject: 'Welcome to HSE.Digital',
    html: renderWelcomeEmail(user),
    text: `Welcome ${user.name}!`
  });
  
  res.json({ success: true });
});
```

### Generate Report on Schedule

```javascript
// In cron job or scheduler
import { queueReport } from './services/queueService.js';

cron.schedule('0 0 * * 0', async () => {
  const orgs = await prisma.organization.findMany();
  
  for (const org of orgs) {
    await queueReport({
      type: 'compliance',
      organizationId: org.id,
      format: 'pdf',
      notifyEmail: org.adminEmail
    });
  }
});
```

### Webhook on Incident Creation

```javascript
// In incident creation route
app.post('/api/incidents', async (req, res) => {
  const incident = await prisma.incident.create({ data: req.body });
  
  const webhooks = await prisma.webhook.findMany({
    where: { 
      organizationId: req.tenantId,
      events: { has: 'incident.created' }
    }
  });
  
  for (const webhook of webhooks) {
    await queueWebhook({
      url: webhook.url,
      payload: { event: 'incident.created', data: incident },
      secret: webhook.secret,
      eventType: 'incident.created',
      organizationId: req.tenantId
    });
  }
  
  res.json(incident);
});
```
