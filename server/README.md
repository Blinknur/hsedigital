# Advanced Alerting System

## Overview

The HSE Digital platform includes an advanced alerting system with multi-channel support for critical events. The system provides intelligent alert deduplication, escalation policies, and integrations with Slack, PagerDuty, and email.

## Features

### Multi-Channel Support
- **Slack**: Rich formatted messages with severity-based colors and detailed metadata
- **PagerDuty**: Critical alert routing with deduplication keys
- **Email**: HTML-formatted alert emails with full context

### Alert Types

#### 1. Error Rate Monitoring
Tracks sustained high error rates across the platform:
- **WARNING** (10+ errors in 1 minute) → Slack
- **ERROR** (50+ errors in 5 minutes) → Slack + Email
- **CRITICAL** (100+ errors in 5 minutes) → Slack + Email + PagerDuty

#### 2. Quota Breach Detection
Monitors tenant-specific quota usage:
- **WARNING** (80% of quota) → Slack + Email
- **ERROR** (90% of quota) → Slack + Email
- **CRITICAL** (100% of quota) → Slack + Email + PagerDuty

#### 3. Database Connection Pool Exhaustion
Tracks database connection pool capacity:
- **WARNING** (70% capacity) → Slack
- **ERROR** (85% capacity) → Slack + Email
- **CRITICAL** (95% capacity) → Slack + Email + PagerDuty

#### 4. Redis Cluster Failures
Immediate alerts for Redis connection issues:
- **CRITICAL** → Slack + Email + PagerDuty

### Intelligent Alert Deduplication

The system uses Redis-based deduplication with the following features:
- 1-hour deduplication window for identical alerts
- Severity escalation: Higher severity alerts override existing deduplicated alerts
- Per-alert-type and per-tenant isolation

### Escalation Policies

For ERROR and CRITICAL alerts:
- Automatic escalation after 15 minutes if unresolved
- Escalated alerts sent to all channels (Slack + Email + PagerDuty)
- Manual escalation cancellation via API

## Configuration

### Environment Variables

```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty Integration  
PAGERDUTY_INTEGRATION_KEY=your-integration-key

# Email Alerts (comma-separated recipients)
ALERT_EMAIL_RECIPIENTS=admin@example.com,ops@example.com

# Database Pool Monitoring
DATABASE_POOL_MAX=10
```

## API Endpoints

### Get Alert Statistics
```http
GET /api/alerting/stats
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "totalActiveAlerts": 5,
  "byType": {
    "error_rate": 2,
    "quota_breach": 3
  },
  "bySeverity": {
    "WARNING": 2,
    "ERROR": 2,
    "CRITICAL": 1
  }
}
```

### Send Test Alert
```http
POST /api/alerting/test
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "type": "test",
  "severity": "WARNING",
  "title": "Test Alert",
  "message": "This is a test",
  "metadata": {
    "test": true
  }
}
```

### Cancel Escalation
```http
POST /api/alerting/cancel-escalation
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "alertKey": "error_rate:global:High Error Rate Detected"
}
```

## Integration Points

### Automatic Integration

The alerting system is automatically integrated with:

1. **Global Error Handler** - Tracks all 500-level errors
2. **Quota Service** - Monitors quota breaches at 80%, 90%, and 100%
3. **Prisma Client** - Tracks database errors and slow queries
4. **Redis Client** - Detects connection failures
5. **Unhandled Rejections** - Captures unhandled promise rejections

### Manual Usage

```javascript
import { advancedAlertingService } from './services/alertingService.js';

// Track custom errors
await advancedAlertingService.trackErrorRate(error);

// Check quota breach
await advancedAlertingService.checkQuotaBreach(
    organizationId,
    'stations',
    current: 95,
    limit: 100,
    percentage: 95
);

// Check database pool
await advancedAlertingService.checkDatabasePoolExhaustion(
    activeConnections: 9,
    maxConnections: 10
);

// Check Redis failure
await advancedAlertingService.checkRedisFailure(error);

// Send custom alert
await advancedAlertingService.sendAlert({
    type: 'custom',
    severity: 'ERROR',
    title: 'Custom Alert',
    message: 'Something went wrong',
    metadata: { key: 'value' },
    channels: ['slack', 'email'],
    tenantId: 'org-123'
});
```

## Slack Message Format

Alerts sent to Slack include:
- Severity emoji (ℹ️, ⚠️, 🔴, 🚨)
- Alert title and message
- Tenant ID (if applicable)
- Detailed metadata fields
- Environment and timestamp
- Color-coded attachments

## PagerDuty Integration

PagerDuty alerts include:
- Unique deduplication key for alert grouping
- Severity mapping (info, warning, error, critical)
- Source identification (hse-digital)
- Component identification (tenant ID or platform)
- Custom details with full context

## Monitoring and Observability

All alert activity is logged via Pino with:
- Structured logging for alert sends
- Debug logs for deduplication
- Error logs for failed alert deliveries
- Performance tracking for alert processing

## Best Practices

1. **Test Integrations**: Use the test endpoint to verify Slack, PagerDuty, and email configurations
2. **Monitor Alert Volume**: Check alert statistics regularly to identify noisy alerts
3. **Tune Thresholds**: Adjust escalation policies based on your operational requirements
4. **Cancel Escalations**: Use the cancel-escalation endpoint when issues are resolved
5. **Review Deduplications**: Check logs to ensure deduplication is working as expected

## Troubleshooting

### Alerts Not Sending

1. Check environment variables are set correctly
2. Verify Slack webhook URL is valid
3. Confirm PagerDuty integration key is active
4. Check email service configuration (SMTP settings)
5. Review application logs for alert sending errors

### Too Many Alerts

1. Review alert thresholds in `ESCALATION_POLICIES`
2. Increase deduplication window (`MAX_DEDUP_TIME_MS`)
3. Adjust error rate tracking window
4. Consider suppressing low-severity alerts during known issues

### Missing Alerts

1. Verify Redis connectivity (alerts use Redis for deduplication)
2. Check alert statistics to see if alerts are being deduplicated
3. Review application error logs
4. Ensure monitoring middleware is active
