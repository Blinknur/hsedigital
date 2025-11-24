# Stripe Integration Guide

Complete guide for integrating Stripe subscription billing with HSE.Digital.

## Overview

The platform implements a full subscription management system with:
- Stripe Checkout for payment collection
- Customer Portal for subscription management
- Webhook handlers for automated subscription lifecycle
- Plan-based feature flags and quota enforcement
- Usage tracking with monthly/daily limits
- Multi-tenant billing isolation

## Architecture

### Database Schema

**Organization Table**
- `stripeCustomerId`: Stripe customer ID
- `stripeSubscriptionId`: Current subscription ID
- `subscriptionStatus`: active, past_due, canceled, trialing
- `subscriptionPlan`: free, pro, enterprise
- `currentPeriodEnd`: Subscription renewal date
- `cancelAtPeriodEnd`: Boolean for cancellation status
- `trialEndsAt`: Trial expiration date

**UsageRecord Table**
- Tracks all resource consumption
- Indexed by organization and resource type
- Timestamped for period calculations

**SubscriptionPlan Table**
- Reference data for plan configuration
- Stripe price/product mapping
- Feature flags and limits per plan

**WebhookEvent Table**
- Event deduplication by `eventId`
- Processing status tracking
- Error logging for debugging

## Setup Process

### 1. Stripe Account Configuration

#### Create Products
In Stripe Dashboard → Products:

1. **Pro Plan**
   - Name: "HSE.Digital Pro"
   - Monthly Price: $49/month
   - Yearly Price: $490/year (add as separate price)
   - Metadata: `plan: pro`

2. **Enterprise Plan**
   - Name: "HSE.Digital Enterprise"
   - Monthly Price: $199/month
   - Yearly Price: $1,990/year
   - Metadata: `plan: enterprise`

#### Configure Webhook
In Stripe Dashboard → Developers → Webhooks:

1. Click "Add endpoint"
2. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `.env`

### 2. Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Application URLs
CLIENT_URL=http://localhost:5173
```

### 3. Database Migration

```bash
cd server
npx prisma generate
npx prisma db push
node prisma/seed-plans.js
```

### 4. Test Mode Setup

For local development, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Test checkout
stripe checkout sessions create \
  --mode subscription \
  --customer cus_test \
  --line-items '[{"price":"price_test", "quantity":1}]' \
  --success-url 'http://localhost:5173/#/settings?success=true' \
  --cancel-url 'http://localhost:5173/#/settings?canceled=true'
```

## API Implementation

### Checkout Session Creation

**Endpoint**: `POST /api/billing/checkout`

Creates a Stripe Checkout session and redirects user to payment page.

```javascript
// Client-side request
const response = await fetch('/api/billing/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    priceId: 'price_xxxxx'
  })
});

const { url } = await response.json();
window.location.href = url;
```

**Server Implementation**:
1. Retrieve/create Stripe customer
2. Store customer ID in organization record
3. Create checkout session with metadata
4. Return session URL

### Customer Portal Session

**Endpoint**: `POST /api/billing/portal`

Creates a Customer Portal session for managing subscription.

```javascript
// Client-side request
const response = await fetch('/api/billing/portal', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { url } = await response.json();
window.location.href = url;
```

**Features**:
- Update payment method
- Cancel/resume subscription
- View invoices
- Download receipts

### Usage & Quota Endpoint

**Endpoint**: `GET /api/billing/usage`

Returns current subscription status and resource usage.

```javascript
// Response
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
    },
    "permit": {
      "limit": 50,
      "used": 8,
      "remaining": 42
    },
    "api_call": {
      "limit": 1000,
      "used": 234,
      "remaining": 766
    }
  }
}
```

## Webhook Event Handling

### Event Flow

1. Stripe sends webhook POST request
2. Signature verification using `STRIPE_WEBHOOK_SECRET`
3. Event logged to `WebhookEvent` table
4. Event processing based on type
5. Organization record updated
6. Event marked as processed

### Supported Events

#### `checkout.session.completed`
Triggered when payment succeeds.

**Actions**:
- Store subscription ID
- Set status to "active"

#### `customer.subscription.created/updated`
Triggered on subscription changes.

**Actions**:
- Update subscription status
- Set plan tier (from price metadata)
- Update period end date
- Set trial end date if applicable

#### `customer.subscription.deleted`
Triggered when subscription is canceled.

**Actions**:
- Set status to "canceled"
- Downgrade to free plan
- Clear cancellation flag

#### `invoice.payment_succeeded`
Triggered on successful payment.

**Actions**:
- Log success
- No organization update needed (handled by subscription.updated)

#### `invoice.payment_failed`
Triggered on payment failure.

**Actions**:
- Set status to "past_due"
- Send email alert to organization owner
- Grace period before downgrade

### Webhook Security

```javascript
// Signature verification
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body, 
  sig, 
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**Important**: Webhook endpoint uses `express.raw()` middleware to preserve raw body for signature verification.

## Feature Flag System

### Plan Configuration

```javascript
const PLAN_LIMITS = {
  free: {
    stations: 2,
    users: 3,
    audits_per_month: 10,
    features: ['basic_audits', 'basic_incidents']
  },
  pro: {
    stations: 10,
    users: 15,
    audits_per_month: 100,
    features: ['basic_audits', 'advanced_reporting', 'api_access']
  },
  enterprise: {
    stations: -1, // unlimited
    users: -1,
    audits_per_month: -1,
    features: ['basic_audits', 'sso', 'ai_insights', 'priority_support']
  }
};
```

### Middleware Usage

#### Feature Gate
Restrict endpoints to specific features:

```javascript
app.post('/api/ai/generate', 
  authenticateToken, 
  tenantContext,
  requireFeature('ai_insights'),
  asyncHandler(async (req, res) => {
    // AI generation logic
  })
);
```

Returns 403 if feature not available in current plan.

#### Quota Check
Enforce resource limits:

```javascript
app.post('/api/audits', 
  authenticateToken, 
  tenantContext,
  checkQuota('audit'),
  asyncHandler(async (req, res) => {
    // Create audit logic
    await usageService.track(req.tenantId, 'audit', audit.id);
  })
);
```

Returns 429 if quota exceeded.

## Usage Tracking

### Track Resource Creation

```javascript
await usageService.track(
  organizationId,
  'audit',           // resource type
  auditId,          // resource ID (optional)
  1,                // quantity
  { endpoint: '/api/audits' } // metadata (optional)
);
```

### Get Usage Statistics

```javascript
const usage = await usageService.getUsage(
  organizationId,
  'audit',
  startDate,
  endDate
);
```

### Check Quota Availability

```javascript
const hasQuota = await featureService.checkLimit(
  organizationId,
  'audit'
);
```

### Get Quota Details

```javascript
const quota = await featureService.getQuota(
  organizationId,
  'audit'
);
// { limit: 100, used: 45, remaining: 55 }
```

## Frontend Integration

### Checkout Flow

```typescript
// components/Settings/BillingSection.tsx
const handleUpgrade = async (priceId: string) => {
  try {
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ priceId })
    });
    
    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Checkout failed:', error);
  }
};
```

### Customer Portal

```typescript
const handleManageSubscription = async () => {
  const response = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { url } = await response.json();
  window.location.href = url;
};
```

### Display Usage

```typescript
const { data: billing } = useQuery('billing', async () => {
  const response = await fetch('/api/billing/usage', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
});

// Display quota bars
{billing?.usage.audit && (
  <div>
    <p>Audits: {billing.usage.audit.used} / {billing.usage.audit.limit}</p>
    <ProgressBar 
      value={billing.usage.audit.used} 
      max={billing.usage.audit.limit} 
    />
  </div>
)}
```

### Quota Exceeded Handling

```typescript
const handleCreateAudit = async (data) => {
  try {
    const response = await fetch('/api/audits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.status === 429) {
      const error = await response.json();
      // Show upgrade prompt
      setShowUpgradeModal(true);
      return;
    }
    
    // Handle success
  } catch (error) {
    console.error('Failed:', error);
  }
};
```

## Testing

### Test Checkout
```bash
# Use Stripe test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
```

### Test Webhooks Locally
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### Verify Webhook Processing
```sql
SELECT * FROM "WebhookEvent" 
WHERE processed = true 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Check Usage Records
```sql
SELECT 
  o.name,
  ur."resourceType",
  COUNT(*) as count
FROM "UsageRecord" ur
JOIN "Organization" o ON o.id = ur."organizationId"
WHERE ur."recordedAt" >= date_trunc('month', CURRENT_DATE)
GROUP BY o.name, ur."resourceType";
```

## Production Checklist

- [ ] Replace test Stripe keys with live keys
- [ ] Configure webhook endpoint with live URL
- [ ] Test all webhook events in production
- [ ] Set up Stripe webhook monitoring/alerts
- [ ] Configure email service for payment failures
- [ ] Set up Stripe radar for fraud protection
- [ ] Enable 3D Secure (SCA) for European customers
- [ ] Configure tax calculation if needed
- [ ] Set up subscription analytics dashboard
- [ ] Document pricing tiers for sales team
- [ ] Create upgrade/downgrade policies
- [ ] Test cancellation and refund flows
- [ ] Set up invoice customization (logo, footer)
- [ ] Configure dunning for failed payments

## Troubleshooting

### Webhook not received
- Check endpoint URL in Stripe Dashboard
- Verify webhook secret matches
- Check server logs for errors
- Test with Stripe CLI

### Signature verification failed
- Ensure raw body is passed to webhook handler
- Don't apply JSON middleware to webhook route
- Verify webhook secret is correct

### Subscription not updating
- Check webhook event processing logs
- Verify organization ID in metadata
- Check WebhookEvent table for errors

### Quota not enforcing
- Verify usage records are being created
- Check quota middleware is applied
- Verify subscription plan is set correctly

## Resources

- [Stripe Checkout Docs](https://stripe.com/docs/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Customer Portal Setup](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Testing Stripe](https://stripe.com/docs/testing)
