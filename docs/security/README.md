# Security Documentation

Security implementation, best practices, and configuration.

## Documents

- **[Security Overview](./overview.md)** - Comprehensive security guide
- **[Security Integration](./integration.md)** - Security middleware integration
- **[Environment Variables](./environment-variables.md)** - Secure configuration
- **[Token Hashing](./token-hashing.md)** - Token security implementation
- **[Audit Logging](./audit-logging.md)** - Security audit logging

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Refresh token rotation
- Role-based access control (RBAC)
- Email verification required
- Password hashing with bcrypt

### Input Protection
- Zod schema validation
- SQL injection prevention
- XSS prevention and sanitization
- CSRF protection with tokens

### Network Security
- Rate limiting (per tenant, user, IP)
- Helmet security headers
- CORS configuration
- HTTPS enforcement (production)

### Data Protection
- Multi-tenant data isolation
- Row-level security (RLS)
- Encrypted connections
- PII redaction in logs

### Monitoring
- Security audit logging
- Failed login tracking
- Suspicious activity detection
- Error tracking with Sentry

## Security Checklist

- [x] Input validation on all endpoints
- [x] SQL injection prevention
- [x] CSRF protection
- [x] Rate limiting
- [x] XSS prevention
- [x] Security headers
- [x] Audit logging
- [x] JWT authentication
- [x] Password hashing
- [x] HTTPS enforcement (production)
- [x] Email verification
- [ ] Two-factor authentication (planned)
- [ ] IP whitelisting (planned)

## Configuration

### Required Environment Variables
```bash
# JWT Secrets (REQUIRED)
JWT_SECRET=<strong-random-secret>
REFRESH_SECRET=<strong-random-secret>

# Database (with SSL in production)
DATABASE_URL=postgresql://...?sslmode=require

# Redis (with password in production)
REDIS_PASSWORD=<redis-password>
```

### Optional Security Features
```bash
# Sentry error tracking
SENTRY_DSN=https://...

# Alert notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_INTEGRATION_KEY=...
```

## Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate JWT secrets** regularly in production
3. **Enable SSL** for database and Redis in production
4. **Monitor audit logs** for suspicious activity
5. **Keep dependencies updated** - Regular security patches
6. **Use strong passwords** - Enforce password policies
7. **Implement rate limiting** - Prevent abuse
8. **Enable 2FA** for admin accounts (when available)

## Incident Response

If a security incident occurs:

1. **Assess scope** - Check audit logs
2. **Revoke tokens** - Force re-authentication if needed
3. **Patch vulnerability** - Deploy fix immediately
4. **Notify users** - If data was exposed
5. **Document incident** - For future reference

## Quick Links

- [Complete Security Guide](./overview.md)
- [Audit Logging Setup](./audit-logging.md)
- [Environment Configuration](./environment-variables.md)
