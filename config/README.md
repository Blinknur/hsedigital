# Configuration Management

This directory contains all configuration files for the HSE Digital platform, organized by environment and purpose.

## Directory Structure

```
config/
├── environments/          # Environment-specific configurations
│   ├── .env.development   # Local development settings
│   ├── .env.staging       # Staging environment settings
│   ├── .env.production    # Production environment settings
│   └── .env.multiregion   # Multi-region deployment settings
└── README.md              # This file
```

## Environment Configuration

### Development Environment
**File:** `config/environments/.env.development`

For local development. Features:
- Debug logging enabled
- Local PostgreSQL and Redis
- Mock integrations (Stripe test mode, Ethereal email)
- Local file storage for reports
- Relaxed CORS settings

**Setup:**
```bash
cp config/environments/.env.development .env
# Edit .env with your local values
npm install
cd server && npm install
npx prisma db push
npm run dev
```

### Staging Environment
**File:** `config/environments/.env.staging`

For pre-production testing. Features:
- Info-level logging
- Staging database and Redis instances
- Test mode integrations
- S3 storage for reports
- Moderate trace sampling (25%)
- Slack alerting to staging channel

**Setup:**
```bash
cp config/environments/.env.staging .env
# Update all CHANGE_ME values with staging secrets
# Deploy using your CI/CD pipeline
```

### Production Environment
**File:** `config/environments/.env.production`

For production deployment. Features:
- Optimized logging
- Production database with connection pooling
- Live integrations (Stripe live mode, production APIs)
- S3 storage with retention policies
- Conservative trace sampling (10%)
- PagerDuty integration for critical alerts
- Enhanced security settings

**Setup:**
```bash
cp config/environments/.env.production .env
# Update all CHANGE_ME values with strong production secrets
# Use secret management service (AWS Secrets Manager, HashiCorp Vault, etc.)
# Deploy using your CI/CD pipeline
```

### Multi-Region Environment
**File:** `config/environments/.env.multiregion`

For multi-region deployment with failover. Features:
- Regional database primaries and replicas
- Redis Sentinel clustering
- CDN integration
- Automatic failover configuration
- Geo-routing rules
- Cross-region health checks

**Setup:**
```bash
cp config/environments/.env.multiregion .env
# Configure region-specific endpoints
# Set DEPLOYMENT_REGION to current region
# Deploy to each region with appropriate settings
```

## Required Environment Variables

These variables **MUST** be set for the application to start:

- `JWT_SECRET` - Secret key for JWT access tokens (minimum 32 characters)
- `REFRESH_SECRET` - Secret key for JWT refresh tokens (minimum 32 characters)

## Environment Variable Categories

### Core Application
- `NODE_ENV` - Environment mode (development, staging, production)
- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - Frontend application URL
- `CORS_ORIGIN` - Allowed CORS origins

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_CONNECTION_LIMIT` - Max connections (10-50)
- `DATABASE_CONNECTION_TIMEOUT` - Connection timeout in ms
- `DATABASE_POOL_TIMEOUT` - Pool timeout in ms

### Redis
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis authentication password
- `QUEUE_REDIS_HOST` - Queue-specific Redis host
- `QUEUE_CONCURRENCY` - Background job concurrency

### Authentication & Security
- `JWT_SECRET` - JWT signing secret (REQUIRED)
- `REFRESH_SECRET` - Refresh token secret (REQUIRED)

### Third-Party Integrations
- `API_KEY` - Google Gemini AI API key
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email authentication username
- `SMTP_PASS` - Email authentication password

### Monitoring & Observability
- `LOG_LEVEL` - Log level (debug, info, warn, error)
- `SENTRY_DSN` - Sentry project DSN
- `SENTRY_TRACES_SAMPLE_RATE` - Trace sampling rate (0.0-1.0)
- `OTEL_ENABLED` - Enable OpenTelemetry (true/false)
- `OTEL_SERVICE_NAME` - Service name for traces
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OTLP collector endpoint

### Alerting
- `ALERT_EMAIL_RECIPIENTS` - Comma-separated alert emails
- `SLACK_WEBHOOK_URL` - Slack webhook for alerts
- `PAGERDUTY_INTEGRATION_KEY` - PagerDuty integration key

### AWS & Storage
- `AWS_REGION` - AWS region for S3
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET_NAME` - S3 bucket for reports
- `REPORTS_STORAGE_TYPE` - Storage type (s3 or local)

### Multi-Region (Optional)
- `DEPLOYMENT_REGION` - Current deployment region
- `DATABASE_URL_US_EAST_PRIMARY` - US East primary database
- `DATABASE_URL_EU_WEST_PRIMARY` - EU West primary database
- `REDIS_CLUSTER_US_EAST` - US East Redis cluster nodes
- `CDN_ENABLED` - Enable CDN (true/false)
- `AUTO_FAILOVER_ENABLED` - Enable automatic failover

## Best Practices

### Security
1. **Never commit `.env` files** - They contain secrets
2. **Use strong secrets** - Minimum 32 characters for JWT secrets
3. **Rotate secrets regularly** - Update in production quarterly
4. **Use secret management** - AWS Secrets Manager, Vault, etc.
5. **Limit access** - Restrict who can view production secrets

### Development
1. **Keep `.env.example` updated** - Document all variables
2. **Use different keys per environment** - Never share secrets
3. **Test with production-like config** - Staging should mirror production
4. **Document new variables** - Update this README when adding variables

### Deployment
1. **Validate before deployment** - Check all CHANGE_ME values are replaced
2. **Use CI/CD for secrets** - Inject from secure storage
3. **Monitor after changes** - Watch logs and metrics
4. **Keep backups** - Store encrypted backup of configurations

## Configuration Loading Priority

The application loads configuration in this order (later sources override earlier):

1. Default values in code
2. `.env` file in project root
3. Environment variables (OS level)
4. Runtime overrides (command line, Docker, K8s)

## Troubleshooting

### Application won't start
- Check JWT_SECRET and REFRESH_SECRET are set
- Verify database connection string is correct
- Ensure Redis is running and accessible

### Database connection errors
- Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Check network connectivity to database
- Verify credentials are correct

### Redis connection errors
- Check REDIS_HOST and REDIS_PORT are correct
- Verify Redis is running: `redis-cli ping`
- Check if password is required

### Integration failures
- Verify API keys are valid and not expired
- Check rate limits on third-party services
- Review service-specific logs for errors

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Development guide and commands
- [Docker Configuration](../docker/README.md) - Docker setup and deployment
- [Security Guide](../server/SECURITY.md) - Security best practices
- [Monitoring Setup](../server/MONITORING.md) - Observability configuration
