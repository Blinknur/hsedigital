# Railway Quick Start Deployment

Deploy HSE.Digital backend to Railway in under 10 minutes.

## Why Railway?

- ✅ **Easiest setup** - No complex configuration
- ✅ **Managed PostgreSQL & Redis** - One-click provisioning
- ✅ **WebSocket support** - Full Socket.IO support
- ✅ **Background jobs work** - Persistent processes
- ✅ **Auto HTTPS** - Free SSL certificates
- ✅ **GitHub integration** - Auto-deploy on push
- 💰 **Pricing**: $5/month (500 hours) or $20/month unlimited

## Prerequisites

- GitHub account with your code pushed
- Railway account ([sign up free](https://railway.app))
- Railway CLI (optional but recommended)

## Method 1: Web UI (No CLI)

### 1. Create New Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway auto-detects Node.js and creates a service

### 2. Add PostgreSQL

1. In your project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway provisions PostgreSQL and adds `DATABASE_URL` automatically

### 3. Add Redis

1. Click "New" again
2. Select "Database" → "Add Redis"
3. Railway adds `REDIS_HOST` and `REDIS_PORT` automatically

### 4. Configure Environment Variables

1. Click on your app service
2. Go to "Variables" tab
3. Add these variables:

```bash
JWT_SECRET=your-random-secret-min-32-chars
REFRESH_SECRET=your-random-refresh-secret-min-32-chars
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.com
```

**Generate secure secrets**:
```bash
# On your local machine
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Set Build & Start Commands

1. Go to "Settings" tab
2. Under "Build Command":
   ```bash
   npm install && cd server && npm install && npx prisma generate
   ```
3. Under "Start Command":
   ```bash
   npm start
   ```

### 6. Deploy

1. Click "Deploy" button
2. Watch the build logs
3. Once deployed, Railway provides a public URL like `https://your-app.up.railway.app`

### 7. Run Database Migrations

1. Click on your app service
2. Open "Shell" tab
3. Run:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

### 8. Verify Deployment

Visit your Railway URL:
```
https://your-app.up.railway.app/api/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 123,
  "database": "connected",
  "redis": "connected"
}
```

---

## Method 2: CLI (Recommended for Automation)

### 1. Install Railway CLI

```bash
# macOS/Linux
brew install railway

# Or use npm
npm install -g @railway/cli

# Windows (use npm)
npm install -g @railway/cli
```

### 2. Login

```bash
railway login
```

This opens your browser for authentication.

### 3. Initialize Project

```bash
# In your project directory
railway init

# Choose "Create new project"
# Give it a name: hse-digital-backend
```

### 4. Add PostgreSQL

```bash
railway add postgresql

# Railway provisions PostgreSQL and links it
```

### 5. Add Redis

```bash
railway add redis

# Railway provisions Redis and links it
```

### 6. Set Environment Variables

```bash
# Generate secrets locally
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Set variables
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set REFRESH_SECRET="$REFRESH_SECRET"
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
railway variables set CORS_ORIGIN="https://your-frontend-domain.com"
```

### 7. Deploy

```bash
railway up
```

Railway builds and deploys your application. Watch the logs:

```bash
railway logs
```

### 8. Run Migrations

```bash
railway run bash
cd server
npx prisma migrate deploy
exit
```

### 9. Get Your URL

```bash
railway open
```

Opens your deployed application in the browser.

---

## Configuration Files

Railway reads `railway.json` (already included in your repo):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
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

## Custom Domain

### Add Custom Domain

1. Go to your service → "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Add the provided CNAME record to your DNS:
   ```
   CNAME: api.yourdomain.com → your-app.up.railway.app
   ```
5. Railway auto-provisions SSL certificate

---

## Environment-Specific Variables

### Development vs Production

Railway supports multiple environments:

```bash
# Create staging environment
railway environment

# Choose "Create new environment"
# Name it "staging"

# Deploy to staging
railway up --environment staging
```

---

## Monitoring

### View Logs

```bash
# Real-time logs
railway logs --follow

# Last 100 lines
railway logs --tail 100
```

### Metrics

1. Go to your service in Railway dashboard
2. Click "Metrics" tab
3. View CPU, Memory, Network usage

### Health Checks

Railway automatically monitors `/api/health`:
- **Interval**: Every 30 seconds
- **Timeout**: 5 seconds
- **Auto-restart**: On consecutive failures

---

## Scaling

### Vertical Scaling (More Resources)

1. Go to service → "Settings" → "Resources"
2. Adjust:
   - **Memory**: 512MB → 8GB
   - **CPU**: Shared → Dedicated
3. Save changes (Railway restarts your service)

### Horizontal Scaling (Multiple Instances)

Railway Pro plan supports replicas:

```bash
railway scale 2
```

This runs 2 instances with load balancing.

---

## Troubleshooting

### Build Fails

**Error**: `npm install` fails

**Fix**:
```bash
# Clear cache and redeploy
railway run npm cache clean --force
railway up --force
```

### Database Connection Error

**Error**: `Can't reach database server`

**Fix**:
1. Verify PostgreSQL is added to project
2. Check `DATABASE_URL` is auto-set
3. Ensure database is in same region as app

```bash
# Check variables
railway variables
```

### Redis Connection Error

**Error**: `Redis connection refused`

**Fix**:
1. Verify Redis is added to project
2. Check `REDIS_HOST` and `REDIS_PORT` are set

```bash
railway variables
```

### Application Crashes on Startup

**Error**: `Missing required environment variables`

**Fix**:
```bash
# Check all required variables are set
railway variables

# Add missing ones
railway variables set JWT_SECRET="your-secret"
```

### WebSocket Connection Issues

**Error**: `WebSocket failed to connect`

**Fix**:
1. Ensure `CORS_ORIGIN` allows your frontend domain
2. Use `wss://` (secure WebSocket) for production
3. Check firewall/proxy settings

```javascript
// Frontend connection
const socket = io('https://your-app.up.railway.app', {
  transports: ['websocket', 'polling'],
  auth: {
    token: accessToken
  }
});
```

---

## Cost Optimization

### Free Usage

Railway Pro plan includes:
- **$5 credit/month** (500 usage hours)
- **Free egress** up to certain limits

**Estimate**:
- Small app (1 service + DB + Redis): ~$5-10/month
- Medium app (2 services + DB + Redis): ~$15-20/month

### Reduce Costs

1. **Use sleep mode** for dev environments:
   ```bash
   railway sleep
   ```

2. **Delete unused databases**:
   ```bash
   railway service delete <database-name>
   ```

3. **Optimize memory usage**:
   - Reduce Node.js heap size if needed
   - Use connection pooling

---

## CI/CD with GitHub Actions

Create `.github/workflows/railway-deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Setup**:
1. Get Railway API token: `railway tokens create`
2. Add to GitHub Secrets: `RAILWAY_TOKEN`

---

## Backup & Restore

### Database Backup

```bash
# Create backup
railway run bash
pg_dump $DATABASE_URL > backup.sql
exit
```

### Download Backup

```bash
# From Railway service shell
railway run bash
cat backup.sql
# Copy output to local file
```

### Restore

```bash
railway run bash
psql $DATABASE_URL < backup.sql
exit
```

---

## Next Steps

1. ✅ **Monitor**: Set up Sentry (already integrated)
2. ✅ **Alerts**: Configure Railway notifications
3. ✅ **Domain**: Add custom domain
4. ✅ **CI/CD**: Set up GitHub Actions
5. ✅ **Backup**: Schedule regular database backups

---

## Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Blog](https://blog.railway.app)
- [HSE.Digital Docs](../README.md)

---

## Support

Having issues? Check:
1. [Railway Status](https://status.railway.app)
2. [Railway Discord](https://discord.gg/railway)
3. Your project logs: `railway logs`
4. [DEPLOYMENT_PLATFORMS.md](../../DEPLOYMENT_PLATFORMS.md)
