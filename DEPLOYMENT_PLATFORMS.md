# Deployment Platform Guide

## ⚠️ Vercel Incompatibility

**This application cannot be deployed to Vercel** due to architectural requirements that are incompatible with Vercel's serverless model:

### Why Vercel Won't Work

1. **WebSocket Support**: The application uses Socket.IO with Redis adapter for real-time notifications requiring persistent connections
2. **Background Job Processors**: Bull queue system requires long-running processes (email sending, report generation, exports, webhooks)
3. **Redis Pub/Sub**: Multi-instance coordination requires persistent Redis connections
4. **Scheduled Tasks**: Cron-based report scheduler needs a persistent process
5. **Database Connection Pool**: Prisma connection pooling works best with long-running processes
6. **HTTP Server**: Express server needs to handle both HTTP and WebSocket on the same port

### Vercel Limitations
- **Serverless Functions**: Execute for max 60 seconds (Pro) or 10 seconds (Hobby)
- **No Persistent Connections**: Functions terminate after request completion
- **No WebSocket Support**: Serverless functions cannot maintain WebSocket connections
- **No Background Jobs**: Cannot run Bull queue processors
- **No Cron Jobs**: Limited cron support doesn't work with stateful services

---

## ✅ Recommended Deployment Platforms

### 1. **Railway** (Recommended - Easiest)

**Best for**: Quick deployment with minimal configuration

**Pricing**: $5/month for 500 hours (Hobby), $20/month (Pro)

**Features**:
- ✅ Full WebSocket support
- ✅ Persistent processes
- ✅ PostgreSQL and Redis add-ons
- ✅ Automatic HTTPS
- ✅ Environment variables UI
- ✅ GitHub integration
- ✅ Preview deployments

**Deployment Steps**:

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add postgresql

# 5. Add Redis
railway add redis

# 6. Set environment variables
railway variables set JWT_SECRET="your-secret-here"
railway variables set REFRESH_SECRET="your-refresh-secret-here"
railway variables set NODE_ENV="production"

# 7. Deploy
railway up
```

**railway.json** (optional):
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && cd server && npm install && npx prisma generate"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

---

### 2. **Render** (Recommended - Production-Ready)

**Best for**: Production deployments with team collaboration

**Pricing**: $7/month (Web Service), $7/month (PostgreSQL), $10/month (Redis)

**Features**:
- ✅ Native PostgreSQL and Redis
- ✅ Auto-deploy from Git
- ✅ Custom domains with SSL
- ✅ DDoS protection
- ✅ Health checks and zero-downtime deploys
- ✅ Cron jobs support
- ✅ Infrastructure as Code (render.yaml)

**Deployment Steps**:

1. Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: hse-digital-backend
    env: node
    region: oregon
    plan: starter
    buildCommand: npm install && cd server && npm install && npx prisma generate
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: hse-digital-db
          property: connectionString
      - key: REDIS_HOST
        fromService:
          name: hse-digital-redis
          type: redis
          property: host
      - key: REDIS_PORT
        fromService:
          name: hse-digital-redis
          type: redis
          property: port
      - key: JWT_SECRET
        generateValue: true
      - key: REFRESH_SECRET
        generateValue: true
      - key: PORT
        value: 3001

databases:
  - name: hse-digital-db
    databaseName: hse_digital
    plan: starter
    region: oregon
    ipAllowList: []

  - name: hse-digital-redis
    plan: starter
    region: oregon
    maxmemoryPolicy: allkeys-lru
```

2. Connect to Render:
   - Push code to GitHub
   - Go to [render.com](https://render.com)
   - New → Blueprint → Connect your repo
   - Render reads `render.yaml` and provisions everything

3. Run migrations:
```bash
# In Render Shell
npx prisma migrate deploy
```

---

### 3. **DigitalOcean App Platform**

**Best for**: Scalable infrastructure with managed databases

**Pricing**: $12/month (App), $15/month (PostgreSQL), $15/month (Redis)

**Features**:
- ✅ Managed PostgreSQL and Redis
- ✅ Auto-scaling
- ✅ Built-in CDN
- ✅ GitHub/GitLab integration
- ✅ Multiple environments (dev/staging/prod)

**Deployment Steps**:

1. Create `.do/app.yaml`:

```yaml
name: hse-digital-backend
region: nyc

services:
  - name: api
    github:
      repo: your-username/your-repo
      branch: main
      deploy_on_push: true
    build_command: npm install && cd server && npm install && npx prisma generate
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xs
    http_port: 3001
    health_check:
      http_path: /api/health
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: JWT_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: REFRESH_SECRET
        scope: RUN_TIME
        type: SECRET

databases:
  - name: hse-digital-db
    engine: PG
    production: true
    version: "15"

  - name: hse-digital-redis
    engine: REDIS
    production: true
    version: "7"
```

2. Deploy via CLI:
```bash
doctl apps create --spec .do/app.yaml
```

Or use the DigitalOcean web console.

---

### 4. **Fly.io**

**Best for**: Global edge deployment with low latency

**Pricing**: $0 (free tier), ~$10-20/month (production)

**Features**:
- ✅ Multi-region deployment
- ✅ Anycast networking (route to nearest region)
- ✅ Built-in PostgreSQL (managed by Fly)
- ✅ Redis support via Upstash integration
- ✅ Auto-scaling

**Deployment Steps**:

```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Launch app
flyctl launch

# 4. Add PostgreSQL
flyctl postgres create

# 5. Attach database
flyctl postgres attach <postgres-app-name>

# 6. Set secrets
flyctl secrets set JWT_SECRET="your-secret"
flyctl secrets set REFRESH_SECRET="your-refresh-secret"

# 7. Deploy
flyctl deploy
```

**fly.toml**:
```toml
app = "hse-digital-backend"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"
  PORT = "3001"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 3001

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "5s"
    restart_limit = 0

[metrics]
  port = 9091
  path = "/metrics"
```

---

### 5. **AWS (Elastic Beanstalk or ECS)**

**Best for**: Enterprise deployments with full control

**Pricing**: Variable (~$30-50/month minimum)

**Features**:
- ✅ Complete control over infrastructure
- ✅ Managed RDS (PostgreSQL) and ElastiCache (Redis)
- ✅ Auto-scaling groups
- ✅ Load balancing
- ✅ CloudWatch monitoring

**Quick Start (Elastic Beanstalk)**:

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize
eb init -p node.js-18 hse-digital-backend

# 3. Create environment
eb create hse-digital-production

# 4. Deploy
eb deploy
```

See `docs/deployment/production.md` for full AWS/Kubernetes setup.

---

### 6. **Kubernetes (Self-Managed or EKS/GKE/AKS)**

**Best for**: Large-scale production with full orchestration

See existing documentation:
- `docs/deployment/production.md` - Full Kubernetes deployment
- `docs/deployment/runbook.md` - Step-by-step operations
- `k8s/` directory - All Kubernetes manifests

---

## Environment Variables Required

All platforms need these environment variables:

### Required
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-jwt-secret-min-32-chars
REFRESH_SECRET=your-refresh-secret-min-32-chars
REDIS_HOST=your-redis-host
REDIS_PORT=6379
NODE_ENV=production
PORT=3001
```

### Optional (but recommended)
```bash
REDIS_PASSWORD=your-redis-password
CORS_ORIGIN=https://your-frontend-domain.com
SENTRY_DSN=your-sentry-dsn
API_KEY=your-gemini-api-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
S3_BUCKET=your-s3-bucket
STRIPE_SECRET_KEY=your-stripe-key
ENABLE_MULTI_REGION=false
```

---

## Comparison Matrix

| Feature | Railway | Render | DigitalOcean | Fly.io | AWS/K8s |
|---------|---------|--------|--------------|--------|---------|
| Setup Time | 5 min | 10 min | 15 min | 10 min | 1-2 hours |
| WebSockets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Background Jobs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Managed DB | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-Scaling | ❌ | ✅ | ✅ | ✅ | ✅ |
| Free Tier | ❌ | ✅ | ❌ | ✅ | ❌ |
| Min Monthly Cost | $5 | $7 | $12 | $0 | $30+ |
| Best For | Quick Start | Teams | Production | Global Edge | Enterprise |

---

## Migration from Current Setup

If you're currently running locally or on a VM:

1. **Backup database**: `npm run backup`
2. **Export environment variables**: Save `.env` securely
3. **Choose platform**: Railway for fastest, Render for production
4. **Provision services**: Database, Redis, App
5. **Set environment variables**: Copy from `.env`
6. **Deploy**: Push to Git or use CLI
7. **Run migrations**: `npx prisma migrate deploy`
8. **Restore data**: `npm run restore` (if needed)
9. **Verify**: Check `/api/health` endpoint

---

## Troubleshooting

### WebSocket Connection Failed
- Ensure platform supports WebSocket upgrades
- Check CORS_ORIGIN is set correctly
- Verify Redis is accessible from app

### Database Connection Errors
- Use `DATABASE_URL` with `?connection_limit=5`
- Enable Prisma connection pooling
- Check firewall rules

### Background Jobs Not Running
- Verify Redis connection
- Check logs for Bull queue errors
- Ensure single instance for development (scale horizontally in production)

### Health Check Failing
- Ensure `/api/health` returns 200 OK
- Check startup time (may need to increase timeout)
- Verify database connectivity

---

## Next Steps

1. Choose a platform based on your needs
2. Follow the deployment steps above
3. Configure environment variables
4. Deploy and test
5. Set up monitoring (Sentry is already integrated)
6. Configure custom domain
7. Set up CI/CD (GitHub Actions)

For production Kubernetes deployment, see `docs/deployment/production.md`.
