# Stripe Billing Integration - Quick Start

## What Changed

✅ **Removed:** Mock `paymentService` object
✅ **Added:** Real Stripe SDK integration with `services/stripeService.js`
✅ **Added:** Checkout session endpoint `/api/billing/create-checkout-session`
✅ **Added:** Webhook handler `/api/webhooks/stripe` with signature verification
✅ **Added:** Retry logic with exponential backoff
✅ **Updated:** Organization model with Stripe fields

## New Database Fields

```prisma
model Organization {
  subscriptionStatus     String   @default("active")
  stripeCustomerId       String?  @unique
  stripeSubscriptionId   String?  @unique
}
```

Run: `npm run prisma:generate && npx prisma db push`

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=http://localhost:5173

# Optional - use Stripe Price IDs or dynamic pricing
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

## Quick Test

```bash
# Start server
npm run docker:up

# Run unit tests
node tests/stripe-unit.test.js

# Test checkout session (with auth token)
curl -X POST http://localhost:3001/api/billing/create-checkout-session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId":"professional"}'
```

## Webhook Setup (Local Testing)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Copy webhook secret to .env
STRIPE_WEBHOOK_SECRET=whsec_...

# Trigger test event
stripe trigger checkout.session.completed
```

## API Endpoints

### 1. Create Checkout Session
```http
POST /api/billing/create-checkout-session
Authorization: Bearer {token}
Content-Type: application/json

{
  "planId": "starter" | "professional" | "enterprise"
}
```

### 2. Create Portal Session
```http
POST /api/billing/create-portal-session
Authorization: Bearer {token}
```

### 3. Stripe Webhooks
```http
POST /api/webhooks/stripe
Stripe-Signature: {signature}
Content-Type: application/json

{Raw webhook payload}
```

## Webhook Events Handled

- ✅ `checkout.session.completed` - Creates subscription
- ✅ `customer.subscription.updated` - Updates status
- ✅ `customer.subscription.deleted` - Cancels subscription
- ✅ `invoice.payment_failed` - Marks as past_due

## Subscription Plans

| Plan | Price | Stripe Plan ID |
|------|-------|----------------|
| Starter | $49/mo | `starter` |
| Professional | $149/mo | `professional` |
| Enterprise | $499/mo | `enterprise` |

## Testing

```bash
# Unit tests (no DB required)
node tests/stripe-unit.test.js

# Integration tests (requires running DB)
node tests/stripe.test.js
```

## Production Checklist

- [ ] Set live Stripe API keys
- [ ] Configure webhook endpoint with HTTPS
- [ ] Set up monitoring for webhook failures
- [ ] Test full checkout flow
- [ ] Test subscription cancellation
- [ ] Test payment failure scenarios
- [ ] Configure customer portal settings in Stripe Dashboard

## Documentation

See `STRIPE_INTEGRATION.md` for complete documentation including:
- Detailed API reference
- Webhook configuration
- Retry logic details
- Security considerations
- Troubleshooting guide
