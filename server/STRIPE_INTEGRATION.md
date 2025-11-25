# Stripe Billing Integration

## Overview

This project integrates Stripe for production billing with real SDK implementation, replacing the previous mock payment service.

## Features

- ✅ Real Stripe SDK integration
- ✅ Checkout session creation with line items
- ✅ Webhook signature verification
- ✅ Automatic subscription status sync
- ✅ Webhook retry logic with exponential backoff
- ✅ Customer portal session management
- ✅ Multiple subscription plans (Starter, Professional, Enterprise)

## Environment Variables

Add these to your `.env` file:

```env
# Required
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # from Stripe webhook settings

# Optional - use Price IDs from Stripe Dashboard
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Application URL for redirects
CLIENT_URL=http://localhost:5173
```

## Database Schema

The `Organization` model has been extended with:

- `subscriptionStatus` - Current status (active, canceled, past_due, etc.)
- `stripeCustomerId` - Stripe customer ID (unique)
- `stripeSubscriptionId` - Stripe subscription ID (unique)

Run migrations:
```bash
npm run prisma:generate
npx prisma db push
```

## API Endpoints

### 1. Create Checkout Session
**POST** `/api/billing/create-checkout-session`

Creates a Stripe checkout session for a selected plan.

**Request:**
```json
{
  "planId": "starter" // or "professional", "enterprise"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Plans:**
- `starter` - $49/month
- `professional` - $149/month
- `enterprise` - $499/month

### 2. Create Portal Session
**POST** `/api/billing/create-portal-session`

Creates a Stripe billing portal session for subscription management.

**Response:**
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

### 3. Stripe Webhooks
**POST** `/api/webhooks/stripe`

Handles Stripe webhook events with signature verification.

**Supported Events:**
- `checkout.session.completed` - New subscription created
- `customer.subscription.updated` - Subscription status changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_failed` - Payment failed

**Headers Required:**
- `stripe-signature` - Stripe webhook signature for verification

## Webhook Configuration

### Setup in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the signing secret to `STRIPE_WEBHOOK_SECRET` env var

### Local Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Copy the webhook signing secret to .env
STRIPE_WEBHOOK_SECRET=whsec_...

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

## Webhook Retry Logic

The webhook handler includes automatic retry logic:

- **Max Retries:** 3 attempts
- **Delay:** Exponential backoff (5s, 10s, 15s)
- **Idempotency:** Safe to retry without side effects

```javascript
// Retry wrapper
const retryHandler = async (fn, retries = 3) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      if (attempt < retries) {
        await sleep(5000 * (attempt + 1)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
};
```

## Subscription Status Sync

Status mapping from Stripe to application:

| Stripe Status | App Status | Plan Access |
|---------------|------------|-------------|
| `active` | active | Full access |
| `trialing` | active | Full access |
| `past_due` | past_due | Limited access |
| `canceled` | canceled | Downgrade to free |
| `unpaid` | past_due | Limited access |

## Creating Products and Prices

### Option 1: Use Stripe Dashboard (Recommended)

1. Go to Products: https://dashboard.stripe.com/products
2. Create products for each plan
3. Create recurring prices
4. Copy price IDs to environment variables

### Option 2: Dynamic Price Creation

If price IDs are not set, the integration will create prices dynamically using the configured amounts:

```javascript
const PLAN_CONFIGS = {
  starter: { amount: 4900, currency: 'usd', interval: 'month' },
  professional: { amount: 14900, currency: 'usd', interval: 'month' },
  enterprise: { amount: 49900, currency: 'usd', interval: 'month' }
};
```

## Testing

### Test Cards

Use Stripe test cards for development:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires authentication:** `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC will work.

### Test Workflow

1. **Start server** with test API keys
2. **Create checkout session** via API
3. **Complete payment** using test card
4. **Verify webhook** processes successfully
5. **Check database** for updated subscription status

```bash
# Check logs for webhook processing
docker-compose logs -f app | grep "Webhook"

# Query organization subscription status
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.organization.findFirst().then(org => {
  console.log(org.subscriptionStatus, org.stripeSubscriptionId);
  process.exit(0);
});
"
```

## Security Considerations

1. **Webhook Signature Verification** - All webhooks verify Stripe signatures
2. **Environment Variables** - Never commit secrets to git
3. **HTTPS Required** - Webhooks require HTTPS in production
4. **Idempotent Handlers** - Safe to replay webhook events
5. **Error Logging** - All failures logged for monitoring

## Error Handling

The integration handles common errors:

- **Invalid plan ID** - 400 Bad Request
- **Stripe not configured** - 500 with clear message
- **Invalid webhook signature** - 400 Unauthorized
- **Database errors** - Retry with exponential backoff
- **Network timeouts** - Automatic retry up to 3 times

## Monitoring

Key metrics to monitor:

- Webhook delivery success rate
- Subscription status changes
- Payment failure rate
- Checkout completion rate

Check logs for:
```
✅ Checkout completed for org ${id}
✅ Subscription ${id} updated: status=${status}
⚠️ Payment failed for org ${id}
```

## Migration from Mock Service

The mock `paymentService` has been completely replaced:

**Before:**
```javascript
const paymentService = {
  createCheckoutSession: async () => ({ url: '...' })
};
```

**After:**
```javascript
import { createCheckoutSession } from './services/stripeService.js';
```

All billing logic is now in `server/services/stripeService.js` with real Stripe SDK calls.

## Troubleshooting

### Webhooks not received
- Check Stripe Dashboard webhook logs
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure server is accessible (use ngrok for local testing)

### Signature verification fails
- Ensure raw body is used for webhook route
- Check webhook secret matches Stripe dashboard
- Verify request is coming from Stripe

### Subscription not updating
- Check webhook logs for errors
- Verify organization has correct `stripeSubscriptionId`
- Check retry logic is executing

## Production Checklist

- [ ] Replace test API keys with live keys
- [ ] Set up production webhook endpoint
- [ ] Configure HTTPS/SSL
- [ ] Set up monitoring and alerting
- [ ] Test subscription lifecycle
- [ ] Document plan prices
- [ ] Configure billing portal
- [ ] Set up customer support email
- [ ] Test payment failure flow
- [ ] Review security settings
