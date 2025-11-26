# Features Documentation

Feature-specific documentation and guides.

## Documents

### Reports
- **[Report Generation](./reports.md)** - PDF report generation engine
- **[Reports Quick Start](./reports-quick-start.md)** - Get started with reports in 5 minutes

### Real-time Features
- **[WebSocket Notifications](./websockets.md)** - Real-time notifications system
- **[WebSocket Quick Start](./websockets-quick-start.md)** - WebSocket setup guide
- **[Notifications](./notifications.md)** - Notification system overview

### Background Processing
- **[Queue System](./queue-system.md)** - Bull queue for background jobs
- **[Quota System](./quota-system.md)** - Usage limits and quotas

### Integrations
- **[Stripe Billing](./stripe-billing.md)** - Payment and subscription integration
- **[Stripe Integration Guide](./stripe-integration-guide.md)** - Stripe setup and configuration

### Operations
- **[Tenant Migration](./tenant-migration.md)** - Tenant migration API
- **[E2E Testing](./e2e-testing.md)** - End-to-end testing suite

### Analytics
- **[Analytics Dashboard](./analytics-dashboard.md)** - Analytics and reporting dashboard
- **[Analytics Implementation](./analytics-implementation.md)** - Analytics setup guide

## Quick Reference

### Report Generation
```bash
# Generate audit report
POST /api/reports
{
  "type": "audit",
  "filters": { "stationId": "..." }
}

# Schedule report
POST /api/report-schedules
{
  "reportType": "audit_summary",
  "cronExpression": "0 9 * * MON",
  "recipients": ["admin@example.com"]
}
```

### WebSocket Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: jwtToken },
  query: { organizationId: tenantId }
});

socket.on('audit:updated', (data) => {
  console.log('Audit updated:', data);
});
```

### Background Jobs
```javascript
import { emailQueue } from './queues/emailQueue.js';

// Add job to queue
await emailQueue.add('send-email', {
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'John' }
});
```

### Stripe Integration
```javascript
// Create checkout session
POST /api/billing/create-checkout-session
{
  "priceId": "price_...",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

## Feature Highlights

### Report Generation Engine
- Professional PDF reports with PDFKit
- Embedded charts using Puppeteer + Chart.js
- Tenant-specific branding and templates
- S3 or local filesystem storage
- Scheduled reports with cron expressions
- Email delivery to recipients

### WebSocket Notifications
- Real-time audit updates
- Incident alerts
- Work permit notifications
- Per-tenant message isolation
- Automatic reconnection
- Event subscription management

### Queue System
- Bull queue with Redis backend
- Job types: emails, reports, exports, webhooks
- Bull Board dashboard for monitoring
- Retry logic and error handling
- Job scheduling and priorities

### Stripe Billing
- Subscription management
- Usage-based billing
- Webhook handling
- Customer portal
- Invoice generation

### Quota System
- Per-tenant usage limits
- Feature-based restrictions
- Automatic enforcement
- Usage tracking and alerts

## Quick Links

- [Report Generation Guide](./reports.md)
- [WebSocket Setup](./websockets-quick-start.md)
- [Queue System Documentation](./queue-system.md)
- [Stripe Integration](./stripe-billing.md)
