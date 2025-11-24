# HSE.Digital Backend Server

Enterprise backend server for HSE.Digital compliance platform with Stripe subscription management.

## Features

### Subscription Management
- **Stripe Integration**: Full checkout session and customer portal support
- **Webhook Handlers**: Automated subscription lifecycle event processing
- **Plan-Based Feature Flags**: Enforce features based on subscription tier
- **Usage Tracking**: Track resource consumption with quota middleware
- **Multi-Tenant Billing**: Organization-level subscription management

### Subscription Plans
- **Free**: 2 stations, 3 users, 10 audits/month
- **Pro**: 10 stations, 15 users, 100 audits/month, advanced reporting
- **Enterprise**: Unlimited resources, SSO, custom branding, AI insights

## Setup

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `JWT_SECRET`: JWT signing secret
- `CLIENT_URL`: Frontend application URL

### Install Dependencies
```bash
npm install
```

### Database Setup
```bash
npx prisma generate
npx prisma db push
npm run seed
```

### Start Server
```bash
npm run dev
```

## API Endpoints

### Billing & Subscriptions

#### Create Checkout Session
```http
POST /api/billing/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "priceId": "price_xxx"
}
```

#### Create Customer Portal Session
```http
POST /api/billing/portal
Authorization: Bearer {token}
```

#### Get Usage & Quota
```http
GET /api/billing/usage
Authorization: Bearer {token}
```

Returns:
```json
{
  "subscriptionPlan": "pro",
  "subscriptionStatus": "active",
  "currentPeriodEnd": "2024-12-31T23:59:59.000Z",
  "cancelAtPeriodEnd": false,
  "usage": {
    "audit": {
      "limit": 100,
      "used": 45,
      "remaining": 55
    },
    "incident": {
      "limit": 200,
      "used": 12,
      "remaining": 188
    }
  }
}
```

### Webhooks

#### Stripe Webhook Handler
```http
POST /api/webhooks/stripe
Stripe-Signature: {signature}
Content-Type: application/json
```

Handles events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Middleware

### Quota Check
Enforces monthly resource limits based on subscription plan:

```javascript
app.post('/api/audits', authenticateToken, tenantContext, checkQuota('audit'), handler);
```

Returns 429 when quota exceeded:
```json
{
  "error": "Quota exceeded",
  "message": "You have reached your monthly audit limit. Please upgrade your plan.",
  "resourceType": "audit"
}
```

### Feature Gate
Restricts features to specific plans:

```javascript
app.post('/api/ai/generate', authenticateToken, requireFeature('ai_insights'), handler);
```

Returns 403 when feature unavailable:
```json
{
  "error": "Feature not available",
  "message": "This feature requires a higher plan. Current plan: free",
  "feature": "ai_insights",
  "currentPlan": "free"
}
```

### Usage Tracking
Automatically tracks API calls and resource creation:

```javascript
await usageService.track(organizationId, 'audit', auditId);
```

## Stripe Setup

### 1. Create Products & Prices
In Stripe Dashboard, create products for each plan:
- Free tier (no price needed)
- Pro tier (monthly/yearly prices)
- Enterprise tier (monthly/yearly prices)

### 2. Configure Webhook
Add webhook endpoint in Stripe Dashboard:
```
https://your-domain.com/api/webhooks/stripe
```

Select events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 3. Add Metadata to Prices
For each price in Stripe Dashboard, add metadata:
```
plan: pro
```

### 4. Test Webhooks
Use Stripe CLI to forward webhooks locally:
```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

## Database Schema

### Key Tables

**Organization**
- Stripe customer/subscription IDs
- Subscription status and period
- Trial tracking
- Usage records relation

**UsageRecord**
- Track resource consumption
- Indexed by organization and type
- Timestamped for period calculations

**SubscriptionPlan** (reference data)
- Stripe price/product mapping
- Feature flags and limits
- Trial configuration

**WebhookEvent**
- Event deduplication
- Processing status tracking
- Error logging

## Monitoring

### Check Webhook Processing
```sql
SELECT * FROM "WebhookEvent" 
WHERE processed = false 
ORDER BY "createdAt" DESC;
```

### Check Usage Stats
```sql
SELECT 
  "organizationId",
  "resourceType",
  COUNT(*) as total,
  DATE_TRUNC('month', "recordedAt") as month
FROM "UsageRecord"
GROUP BY "organizationId", "resourceType", month
ORDER BY month DESC, total DESC;
```

## Security

- Webhook signature verification required
- JWT authentication on all endpoints
- Multi-tenant data isolation
- Rate limiting on API routes
- Quota enforcement prevents abuse

## Error Handling

All Stripe operations include error handling:
- Network failures gracefully handled
- Webhook events logged for retry
- Email notifications on payment failures
- Automatic downgrade on subscription cancellation
