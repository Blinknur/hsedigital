# Dependency Updates Migration Guide

**Date:** November 2024  
**Type:** Security & Feature Updates

## Overview

This document outlines the dependency updates performed to address security vulnerabilities and bring packages to their latest stable versions. All critical and moderate vulnerabilities have been resolved.

## Security Audit Summary

### Before Updates
- **Root package.json**: 1 moderate severity vulnerability
- **Server package.json**: 3 vulnerabilities (2 low, 1 moderate)

### After Updates
- **Root package.json**: 0 vulnerabilities ✅
- **Server package.json**: 2 low severity vulnerabilities (csurf/cookie - documented below)

## Updated Dependencies

### Root Package (`/package.json`)

| Package | Old Version | New Version | Severity | Notes |
|---------|-------------|-------------|----------|-------|
| nodemailer | ^6.9.9 | ^7.0.11 | **MODERATE** | Security fix for email domain interpretation |
| @google/generative-ai | ^0.1.1 | ^0.24.1 | Enhancement | Major API improvements |
| helmet | ^7.1.0 | ^8.1.0 | Enhancement | Security header improvements |
| express-rate-limit | ^7.1.5 | ^8.2.1 | Enhancement | Better rate limiting features |
| stripe | ^14.10.0 | ^20.0.0 | Enhancement | Latest Stripe API features |

### Server Package (`/server/package.json`)

| Package | Old Version | New Version | Severity | Notes |
|---------|-------------|-------------|----------|-------|
| nodemailer | ^6.9.9 | ^7.0.11 | **MODERATE** | Security fix for email domain interpretation |
| @google/generative-ai | ^0.1.1 | ^0.24.1 | Enhancement | Major API improvements |
| helmet | ^7.1.0 | ^8.1.0 | Enhancement | Security header improvements |
| express-rate-limit | ^7.1.5 | ^8.2.1 | Enhancement | Better rate limiting features |
| stripe | ^14.10.0 | ^20.0.0 | Enhancement | Latest Stripe API features |

## Breaking Changes & Migration Steps

### 1. Nodemailer (v6 → v7)

**Security Issue Fixed:**
- **CVE**: GHSA-mm7p-fcc7-pg87
- **Severity**: Moderate
- **Issue**: Email to an unintended domain can occur due to Interpretation Conflict
- **Fix**: Upgraded to v7.0.11

**Breaking Changes:**
- None for basic usage (createTransport and sendMail API remain compatible)
- Internal architecture changes for better security

**Migration Steps:**
```javascript
// No code changes required - API is backward compatible
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

await transporter.sendMail({
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Test',
    html: '<p>Test email</p>'
});
```

**Testing:**
```bash
# Test email functionality
npm test
# Check server logs for email service
npm run dev
```

---

### 2. Helmet (v7 → v8)

**Changes:**
- Improved Content Security Policy (CSP) defaults
- Better HTTPS enforcement
- Updated security header recommendations

**Breaking Changes:**
- Stricter CSP defaults may block some inline scripts/styles
- New header defaults for cross-origin policies

**Migration Steps:**
```javascript
// Before (v7)
import helmet from 'helmet';
app.use(helmet());

// After (v8) - Same API, but review CSP settings
import helmet from 'helmet';
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust as needed
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
```

**Testing:**
```bash
# Check security headers
curl -I http://localhost:3001/api/health
# Verify CSP doesn't block legitimate requests
npm run test:e2e
```

---

### 3. Express Rate Limit (v7 → v8)

**Changes:**
- Improved Redis store support
- Better TypeScript types
- Enhanced configuration options

**Breaking Changes:**
- `legacyHeaders` option removed (now defaults to false)
- `draft_polli_ratelimit_headers` renamed to `standardHeaders`

**Migration Steps:**
```javascript
// Before (v7)
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    legacyHeaders: false,
    draft_polli_ratelimit_headers: true,
});

// After (v8)
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true, // Renamed from draft_polli_ratelimit_headers
    legacyHeaders: false,  // Still supported, now defaults to false
});
```

**Testing:**
```bash
# Test rate limiting
npm run test:load:smoke
# Verify rate limit headers
curl -v http://localhost:3001/api/health
```

---

### 4. Stripe (v14 → v20)

**Changes:**
- API version updates (multiple major versions)
- New payment methods support
- Enhanced webhook handling
- Improved TypeScript definitions

**Breaking Changes:**
- Some deprecated API methods removed
- Updated event types for webhooks
- Changed default API version

**Migration Steps:**
```javascript
// Before (v14)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// After (v20) - API compatible but check for deprecated methods
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia', // Explicitly set API version
});

// Update webhook event handling
app.post('/webhooks/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle new event types in v20
    switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
            // Handle events
            break;
    }
    
    res.json({ received: true });
});
```

**Testing:**
```bash
# Test Stripe integration
npm test
# Use Stripe CLI for webhook testing
stripe listen --forward-to localhost:3001/webhooks/stripe
stripe trigger payment_intent.succeeded
```

---

### 5. @google/generative-ai (v0.1 → v0.24)

**Changes:**
- Major API redesign
- New model support (Gemini 1.5, etc.)
- Improved streaming support
- Better error handling

**Breaking Changes:**
- API method signatures changed
- Model naming conventions updated
- Configuration options restructured

**Migration Steps:**
```javascript
// Before (v0.1)
import { GoogleGenAI } from '@google/genai';
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// After (v0.24)
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Updated generation API
const result = await model.generateContent(prompt);
const response = result.response;
const text = response.text();
```

**Testing:**
```bash
# Test AI content generation
npm test
# Test AI service endpoints
curl -X POST http://localhost:3001/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test prompt"}'
```

---

## Known Issues

### csurf / cookie Vulnerability (LOW severity)

**Status:** NOT FIXED  
**Severity:** Low  
**Package:** csurf → cookie dependency

**Issue:**
- CVE: GHSA-pxg6-pf52-xh8x
- Cookie package accepts cookie name, path, and domain with out of bounds characters
- Affects csurf versions >= 1.3.0

**Why Not Fixed:**
1. `csurf` is deprecated and no longer maintained
2. The vulnerability is LOW severity
3. Impact is minimal in our usage context
4. Recommended fix would downgrade to v1.2.2 (breaking change)

**Recommended Action:**
- **Short term:** Accept the risk (LOW severity, limited impact)
- **Long term:** Migrate to modern CSRF protection

**Alternative CSRF Solutions:**
```javascript
// Option 1: Use helmet's CSRF protection (if using sessions)
import helmet from 'helmet';
app.use(helmet());

// Option 2: Implement custom token-based CSRF
import crypto from 'crypto';

function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Option 3: Use SameSite cookies (modern approach)
app.use(cookieParser());
app.use(session({
    cookie: {
        sameSite: 'strict',
        secure: true,
        httpOnly: true,
    },
}));
```

---

## Packages Considered But Not Updated

These packages have major version updates available but were not updated due to breaking changes requiring extensive code refactoring:

| Package | Current | Latest | Reason Not Updated |
|---------|---------|--------|-------------------|
| express | 4.21.2 | 5.1.0 | Major breaking changes in Express 5 |
| @prisma/client | 5.22.0 | 7.0.1 | Major Prisma v7 migration required |
| prisma | 5.22.0 | 7.0.1 | Major Prisma v7 migration required |
| zod | 3.25.76 | 4.1.13 | Zod v4 has breaking API changes |
| multer | 1.4.5-lts.2 | 2.0.2 | Multer v2 requires code changes |
| bcrypt | 5.1.1 | 6.0.0 | Node.js version requirements |
| jest | 29.7.0 | 30.2.0 | Test configuration changes |

**Future Considerations:**
- Schedule Prisma v7 migration (requires schema changes)
- Plan Express v5 migration (significant API changes)
- Evaluate Zod v4 benefits vs migration effort

---

## Verification Steps

### 1. Install Updated Dependencies
```bash
# Root directory
npm install

# Server directory
cd server && npm install
```

### 2. Run Security Audit
```bash
# Root
npm audit

# Server
cd server && npm audit
```

### 3. Run Tests
```bash
# Lint check
npm run lint

# Unit tests
cd server && npm test

# Integration tests
npm run test:e2e

# Load tests
npm run test:load:smoke
```

### 4. Build & Deploy
```bash
# Docker build
npm run docker:build

# Start services
npm run docker:up

# Check health
curl http://localhost:3001/api/health
```

### 5. Monitor in Production
```bash
# Check logs
npm run docker:logs:app

# Monitor metrics
open http://localhost:9090  # Prometheus
open http://localhost:3000  # Grafana

# Check Sentry for errors
# Visit your Sentry dashboard
```

---

## Rollback Procedures

If issues arise after updating:

### Quick Rollback
```bash
# Restore from git
git checkout HEAD -- package.json package-lock.json
git checkout HEAD -- server/package.json server/package-lock.json

# Reinstall old dependencies
npm install
cd server && npm install

# Restart services
npm run docker:restart
```

### Selective Rollback
```bash
# Rollback specific package (example: nodemailer)
npm install nodemailer@^6.9.9
cd server && npm install nodemailer@^6.9.9
```

---

## Post-Update Checklist

- [ ] Dependencies installed successfully
- [ ] Security audit shows 0 critical/high/moderate vulnerabilities
- [ ] All tests passing (unit, integration, e2e)
- [ ] Docker build successful
- [ ] Application starts without errors
- [ ] Email service working (nodemailer)
- [ ] Rate limiting functional
- [ ] Stripe webhooks operational
- [ ] AI content generation working
- [ ] Security headers validated
- [ ] Monitoring/logging operational
- [ ] Documentation updated
- [ ] Team notified of changes

---

## References

- [Nodemailer v7 Release Notes](https://nodemailer.com/about/)
- [Helmet v8 Documentation](https://helmetjs.github.io/)
- [Express Rate Limit v8 Changelog](https://github.com/express-rate-limit/express-rate-limit/releases)
- [Stripe API v20 Migration Guide](https://stripe.com/docs/upgrades)
- [Google Generative AI SDK Documentation](https://ai.google.dev/)

---

## Support

For issues related to these updates:
1. Check this migration guide
2. Review package-specific documentation
3. Check application logs: `npm run docker:logs:app`
4. Run tests: `npm test`
5. Contact the development team

**Last Updated:** November 26, 2024
