# Distributed Tracing with OpenTelemetry

This document describes the distributed tracing implementation using OpenTelemetry for the HSE.Digital backend.

## Overview

The system implements comprehensive distributed tracing across:
- HTTP requests (Express.js)
- Database queries (Prisma/PostgreSQL)
- Redis operations (ioredis)
- External API calls (Stripe, Email, AI services)
- Custom business logic

## Architecture

### Components

1. **Tracing SDK** (`utils/tracing.js`)
   - Initializes OpenTelemetry SDK
   - Configures OTLP exporter (sends to Jaeger)
   - Implements tenant-aware sampling strategy
   - Provides helper functions for manual instrumentation

2. **Middleware** (`middleware/tracing.js`)
   - Wraps HTTP requests in spans
   - Enriches spans with user/tenant context
   - Adds trace IDs to response headers
   - Fetches tenant tier for sampling decisions

3. **Instrumented Clients**
   - `tracedPrismaClient.js`: Wraps Prisma operations
   - `tracedRedis.js`: Wraps Redis operations
   - `tracedStripeService.js`: Wraps Stripe API calls
   - `tracedEmailService.js`: Wraps email delivery
   - `tracedAiService.js`: Wraps AI service requests

## Sampling Strategy

### Tenant-Aware Sampling

Different subscription tiers have different sampling rates:

| Tier | Sample Rate | Description |
|------|-------------|-------------|
| Enterprise | 100% (1.0) | All requests traced |
| Professional | 50% (0.5) | Half of requests traced |
| Starter | 10% (0.1) | 1 in 10 requests traced |
| Free | 1% (0.01) | 1 in 100 requests traced |
| Default | 10% (0.1) | Unknown tenants |

### Path-Based Sampling

Critical paths have higher sampling rates regardless of tenant tier:

| Path | Sample Rate | Reason |
|------|-------------|---------|
| `/api/health` | 0% | Too noisy |
| `/metrics` | 0% | Too noisy |
| `/api/webhooks` | 100% | Critical for payments |
| `/api/billing` | 100% | Critical for revenue |
| `/api/ai/generate` | 100% | High-cost operations |
| `/api/auth` | 50% | Security monitoring |
| Default | 10% | General requests |

### Combined Strategy

The sampler uses `Math.max(pathRate, tierRate)` to ensure:
- Critical paths are always sampled highly
- Enterprise customers get full tracing
- Noise from health checks is eliminated

## Configuration

### Environment Variables

```env
# Enable/disable tracing
OTEL_ENABLED=true

# Service identification
OTEL_SERVICE_NAME=hse-digital-backend

# Jaeger OTLP endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Optional: Custom headers for authentication
OTEL_EXPORTER_OTLP_HEADERS={"x-api-key":"your-key"}

# Sampling rates by tenant tier
TRACE_SAMPLE_RATE_ENTERPRISE=1.0
TRACE_SAMPLE_RATE_PROFESSIONAL=0.5
TRACE_SAMPLE_RATE_STARTER=0.1
TRACE_SAMPLE_RATE_FREE=0.01
TRACE_SAMPLE_RATE_DEFAULT=0.1
```

### Docker Compose

The `docker-compose.yml` includes Jaeger all-in-one:

```yaml
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"  # UI
    - "4318:4318"    # OTLP HTTP
```

## Trace Attributes

### Automatic Attributes

Every trace includes:

**HTTP Context:**
- `http.method`: GET, POST, PUT, DELETE
- `http.url`: Full URL
- `http.route`: Express route pattern
- `http.status_code`: Response status
- `http.user_agent`: Client user agent
- `http.client_ip`: Client IP address

**User Context (when authenticated):**
- `user.id`: User UUID
- `user.email`: User email
- `user.role`: User role

**Tenant Context (when available):**
- `tenant.id`: Organization UUID
- `tenant.tier`: Subscription plan (enterprise, professional, starter, free)
- `tenant.subscription_status`: active, canceled, past_due, etc.

**Database Context:**
- `db.system`: postgresql
- `db.operation`: findUnique, create, update, etc.
- `db.model`: Prisma model name
- `db.duration_ms`: Query duration
- `db.statement`: Query details (truncated if too long)

**Redis Context:**
- `db.system`: redis
- `db.operation`: get, set, incr, etc.
- `db.redis.key`: Redis key accessed
- `db.duration_ms`: Operation duration

**External API Context:**
- `stripe.operation`: checkout.session.create, etc.
- `stripe.customer_id`: Stripe customer ID
- `stripe.session_id`: Checkout session ID
- `email.operation`: send_magic_link, send_alert
- `email.recipient`: Recipient email (for debugging)
- `ai.provider`: google
- `ai.model`: gemini-2.5-flash
- `ai.prompt_length`: Length of prompt
- `ai.response_length`: Length of response

## Usage

### Automatic Instrumentation

Most operations are automatically traced:

```javascript
// HTTP requests - automatically traced
app.get('/api/stations', authenticateToken, ...tenantContextWithTracing, async (req, res) => {
  // This entire request lifecycle is traced
  const stations = await prisma.station.findMany(); // DB query traced
  res.json(stations);
});
```

### Manual Instrumentation

For custom business logic:

```javascript
import { withSpan, addSpanAttributes, addSpanEvent } from '../utils/tracing.js';

async function processData(data) {
  return await withSpan(
    'business.process_data',
    { 'data.size': data.length },
    async (span) => {
      addSpanEvent('validation_started');
      
      // Validate
      const valid = validateData(data);
      
      addSpanAttributes({
        'validation.result': valid,
        'validation.duration_ms': Date.now() - start
      });
      
      if (!valid) {
        recordException(new Error('Validation failed'));
        throw new Error('Invalid data');
      }
      
      addSpanEvent('processing_started');
      
      // Process
      const result = await processValidData(data);
      
      return result;
    }
  );
}
```

### Adding Custom Attributes

```javascript
import { addSpanAttributes } from '../utils/tracing.js';

async function handler(req, res) {
  addSpanAttributes({
    'custom.attribute': 'value',
    'business.metric': 123
  });
  
  // Continue processing...
}
```

### Recording Events

```javascript
import { addSpanEvent } from '../utils/tracing.js';

addSpanEvent('important_milestone', {
  'detail': 'value',
  'count': 10
});
```

### Recording Exceptions

```javascript
import { recordException } from '../utils/tracing.js';

try {
  await riskyOperation();
} catch (error) {
  recordException(error, {
    'operation': 'risky_operation',
    'context': 'additional info'
  });
  throw error;
}
```

## Viewing Traces

### Jaeger UI

1. Start services: `docker-compose up -d`
2. Open browser: http://localhost:16686
3. Select service: `hse-digital-backend`
4. Search by:
   - Time range
   - Min/max duration
   - Tags (e.g., `tenant.tier=enterprise`)
   - Operation name

### Trace Context Propagation

Trace IDs are included in response headers:

```
X-Trace-Id: 1234567890abcdef1234567890abcdef
X-Span-Id: 1234567890abcdef
```

These can be used for:
- Correlating logs with traces
- Debugging specific requests
- Customer support investigations

## Performance Considerations

### Overhead

- Sampling reduces overhead significantly
- Batch span export (every 5 seconds)
- Max queue size: 2048 spans
- Max batch size: 512 spans

### Sampling Math

For a system with:
- 10,000 requests/minute
- 50% from enterprise (1.0 rate)
- 30% from professional (0.5 rate)
- 20% from free (0.01 rate)

Expected spans/minute:
```
(5,000 × 1.0) + (3,000 × 0.5) + (2,000 × 0.01) 
= 5,000 + 1,500 + 20 
= 6,520 spans/minute
= 108 spans/second
```

### Storage

Jaeger storage requirements (approximate):
- 1 span ≈ 1-2 KB
- 6,520 spans/min × 2 KB = ~13 MB/min
- ~780 MB/hour
- ~18.5 GB/day

For production, consider:
- Elasticsearch backend for scalability
- Retention policies (e.g., 7-30 days)
- Separate hot/cold storage

## Troubleshooting

### Traces Not Appearing

1. Check `OTEL_ENABLED=true` in environment
2. Verify Jaeger is running: `docker ps | grep jaeger`
3. Check logs for initialization: `"OpenTelemetry tracing initialized"`
4. Verify endpoint: `OTEL_EXPORTER_OTLP_ENDPOINT`
5. Check sampling - low-tier tenants may not be sampled

### Missing Context

1. Ensure middleware order in `index.js`:
   - `tracingMiddleware` before route handlers
   - `enrichTracingContext` after authentication
   - `tenantContextWithTracing` for tenant routes

2. Check that traced services are used:
   - `createTracedPrismaClient()` not `createInstrumentedPrismaClient()`
   - `tracedStripeService` not `stripeService`
   - `tracedEmailService` not `emailService`

### High Overhead

1. Reduce sampling rates in `.env`
2. Exclude more paths in sampler
3. Disable instrumentation for specific modules:
   ```javascript
   '@opentelemetry/instrumentation-fs': { enabled: false }
   ```

## Best Practices

### DO

- ✅ Use automatic instrumentation when possible
- ✅ Add business context to spans (tenant, user, operation)
- ✅ Record exceptions with context
- ✅ Use sampling to control costs
- ✅ Add events for important milestones
- ✅ Keep span names consistent and meaningful

### DON'T

- ❌ Sample health checks or metrics endpoints
- ❌ Include sensitive data in span attributes
- ❌ Create spans for every small function
- ❌ Disable sampling entirely in production
- ❌ Trace filesystem operations (too noisy)
- ❌ Include raw passwords or tokens in attributes

## Integration with Other Systems

### Logs

Trace IDs are automatically added to logs via Pino:

```javascript
logger.info({ traceId: req.traceId }, 'Processing request');
```

Search logs by trace ID to see detailed execution.

### Metrics

Combine traces with Prometheus metrics:

```javascript
// Metric shows aggregate
databaseQueryDuration.observe({ model: 'Station' }, duration);

// Trace shows individual request detail
addSpanAttributes({ 'db.duration_ms': duration });
```

### Alerts

Use traces to investigate alerts:

1. Alert fires: "High database latency"
2. Find traces with `db.duration_ms > threshold`
3. Inspect full request context
4. Identify slow queries or N+1 problems

## Future Enhancements

- [ ] Span links for async operations
- [ ] Baggage for cross-service context
- [ ] Custom metrics from span data
- [ ] Service graph visualization
- [ ] Anomaly detection from traces
- [ ] Automatic performance regression detection
- [ ] Integration with error tracking
- [ ] Cost analysis by tenant
