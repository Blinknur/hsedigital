# OpenTelemetry Tracing Examples

This document provides practical examples of using distributed tracing in the HSE.Digital backend.

## Quick Start

### 1. Enable Tracing

In your `.env` file:

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=hse-digital-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

### 2. Start Jaeger

```bash
docker-compose up -d jaeger
```

### 3. View Traces

Open http://localhost:16686 in your browser.

## Example 1: Basic HTTP Request Tracing

All HTTP requests are automatically traced:

```javascript
app.get('/api/stations', authenticateToken, ...tenantContextWithTracing, async (req, res) => {
  const stations = await prisma.station.findMany();
  res.json(stations);
});
```

**What gets traced:**
- HTTP method, URL, status code
- User context (id, email, role)
- Tenant context (id, tier)
- Database query duration
- Total request duration

## Example 2: Manual Span for Business Logic

```javascript
import { withSpan, addSpanAttributes } from '../utils/tracing.js';

async function calculateRiskScore(incident) {
  return await withSpan(
    'business.calculate_risk_score',
    {
      'incident.id': incident.id,
      'incident.type': incident.type
    },
    async (span) => {
      const severity = assessSeverity(incident);
      const frequency = calculateFrequency(incident);
      const score = severity * frequency;
      
      addSpanAttributes({
        'risk.severity': severity,
        'risk.frequency': frequency,
        'risk.score': score
      });
      
      return score;
    }
  );
}
```

## Example 3: External API Call (Stripe)

Already instrumented in `tracedStripeService.js`:

```javascript
const session = await createCheckoutSession(planId, orgId, email);
```

**Trace shows:**
- `stripe.operation`: checkout.session.create
- `stripe.session_id`: Checkout session ID
- Duration of Stripe API call
- Any errors that occurred

## Example 4: Email Delivery

Already instrumented in `tracedEmailService.js`:

```javascript
await sendMagicLink(email, token);
```

**Trace shows:**
- `email.operation`: send_magic_link
- `email.recipient`: Recipient email
- Whether email was sent or skipped
- SMTP errors if any

## Example 5: AI Service Request

Already instrumented in `tracedAiService.js`:

```javascript
const result = await generateAIContent(prompt);
```

**Trace shows:**
- `ai.provider`: google
- `ai.model`: gemini-2.5-flash
- `ai.prompt_length`: Character count
- `ai.response_length`: Character count
- Duration of AI request

## Example 6: Adding Custom Events

```javascript
import { withSpan, addSpanEvent } from '../utils/tracing.js';

async function processAudit(auditId) {
  return await withSpan('audit.process', { 'audit.id': auditId }, async () => {
    addSpanEvent('audit_validation_started');
    
    const valid = await validateAudit(auditId);
    
    if (!valid) {
      addSpanEvent('audit_validation_failed', {
        'reason': 'missing_required_fields'
      });
      throw new Error('Invalid audit');
    }
    
    addSpanEvent('audit_validation_passed');
    addSpanEvent('audit_processing_started');
    
    const result = await processValidAudit(auditId);
    
    addSpanEvent('audit_processing_completed', {
      'result.status': result.status
    });
    
    return result;
  });
}
```

## Example 7: Error Handling

```javascript
import { withSpan, recordException } from '../utils/tracing.js';

async function fetchExternalData(url) {
  return await withSpan(
    'external.fetch',
    { 'http.url': url },
    async (span) => {
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        recordException(error, {
          'error.url': url,
          'error.type': error.name
        });
        throw error;
      }
    }
  );
}
```

## Example 8: Database Query Tracing

Automatic with `createTracedPrismaClient()`:

```javascript
const stations = await prisma.station.findMany({
  where: { organizationId: tenantId },
  include: { audits: true }
});
```

**Trace shows:**
- `db.system`: postgresql
- `db.operation`: findMany
- `db.model`: Station
- `db.duration_ms`: Query duration
- `db.statement`: Query details (truncated)

## Example 9: Redis Operation Tracing

Automatic with `createTracedRedis()`:

```javascript
await redis.set(`session:${userId}`, sessionData, 'EX', 3600);
const data = await redis.get(`session:${userId}`);
```

**Trace shows:**
- `db.system`: redis
- `db.operation`: set, get
- `db.redis.key`: Key accessed
- `db.duration_ms`: Operation duration

## Example 10: Nested Spans

```javascript
import { withSpan } from '../utils/tracing.js';

async function generateReport(reportId) {
  return await withSpan('report.generate', { 'report.id': reportId }, async () => {
    
    const data = await withSpan('report.fetch_data', {}, async () => {
      return await prisma.audit.findMany({
        where: { reportId }
      });
    });
    
    const analysis = await withSpan('report.analyze', {}, async () => {
      return analyzeData(data);
    });
    
    const pdf = await withSpan('report.generate_pdf', {}, async () => {
      return await generatePDF(analysis);
    });
    
    return pdf;
  });
}
```

**Trace shows parent-child relationship:**
```
report.generate (500ms)
  ├─ report.fetch_data (100ms)
  ├─ report.analyze (200ms)
  └─ report.generate_pdf (200ms)
```

## Example 11: Conditional Tracing

```javascript
import { withSpan } from '../utils/tracing.js';

async function expensiveOperation(data) {
  // Only trace if data is large
  if (data.length > 1000) {
    return await withSpan(
      'operation.expensive',
      { 'data.size': data.length },
      async () => {
        return await processLargeData(data);
      }
    );
  }
  
  return await processSmallData(data);
}
```

## Example 12: Trace Context in Logs

```javascript
import { logger } from '../utils/logger.js';
import { getCurrentTraceId } from '../utils/tracing.js';

app.post('/api/process', async (req, res) => {
  const traceId = getCurrentTraceId();
  
  logger.info({
    traceId,
    operation: 'process_started',
    userId: req.user.id
  }, 'Starting process');
  
  // Process...
  
  logger.info({
    traceId,
    operation: 'process_completed'
  }, 'Process completed');
});
```

Now you can search logs by trace ID to see detailed execution alongside traces.

## Example 13: Testing Sampling

```javascript
// Set different tenant tiers to see sampling in action
const org = await prisma.organization.findUnique({
  where: { id: tenantId }
});

// Enterprise: 100% sampled
// Professional: 50% sampled
// Starter: 10% sampled
// Free: 1% sampled

console.log(`Tenant tier: ${org.subscriptionPlan}`);
console.log(`Expected sample rate: ${getSampleRate(org.subscriptionPlan)}`);
```

## Example 14: Performance Monitoring

Identify slow operations:

1. Go to Jaeger UI
2. Search for service: `hse-digital-backend`
3. Filter by: `Min Duration > 1000ms`
4. Look for spans with `db.duration_ms > 1000`
5. Find N+1 queries or slow operations

## Example 15: User Journey Tracing

Trace entire user flow:

```
POST /api/auth/login
  └─ email.send_magic_link (200ms)
  
GET /api/auth/verify?token=...
  ├─ db: User.findUnique (50ms)
  └─ redis.set session (10ms)
  
GET /api/stations
  ├─ redis.get rate_limit (5ms)
  ├─ db: Station.findMany (80ms)
  └─ respond (2ms)
```

## Tips

1. **Use descriptive span names**: `business.calculate_risk` not `calculate`
2. **Add relevant attributes**: Help future debugging
3. **Record events for milestones**: Track progress through operation
4. **Don't over-trace**: Avoid spans for trivial operations
5. **Use sampling**: Control costs in production
6. **Link traces to logs**: Use trace IDs for correlation
7. **Monitor trace volume**: Watch for unexpected growth
8. **Set alerts on trace patterns**: High error rates, slow queries

## Common Patterns

### Pattern 1: Trace Background Jobs

```javascript
async function processBackgroundJob(jobId) {
  return await withSpan(
    'job.process',
    { 'job.id': jobId, 'job.type': 'audit_cleanup' },
    async (span) => {
      // Job processing logic
    }
  );
}
```

### Pattern 2: Trace Webhook Handlers

```javascript
app.post('/api/webhooks/stripe', async (req, res) => {
  // Already wrapped by tracingMiddleware
  // Just add custom attributes
  addSpanAttributes({
    'webhook.type': req.body.type,
    'webhook.id': req.body.id
  });
  
  await handleStripeWebhook(req.body);
});
```

### Pattern 3: Trace Multi-Step Operations

```javascript
async function onboardTenant(data) {
  return await withSpan('tenant.onboard', { 'tenant.name': data.name }, async () => {
    
    addSpanEvent('creating_organization');
    const org = await createOrganization(data);
    
    addSpanEvent('creating_admin_user');
    const admin = await createAdminUser(org.id, data.adminEmail);
    
    addSpanEvent('provisioning_resources');
    await provisionResources(org.id);
    
    addSpanEvent('sending_welcome_email');
    await sendWelcomeEmail(admin.email);
    
    addSpanEvent('onboarding_completed');
    
    return { org, admin };
  });
}
```
