# Render Quick Start Deployment

Deploy HSE.Digital backend to Render with managed PostgreSQL and Redis.

## Why Render?

- ✅ **Production-ready** - Built for teams and scale
- ✅ **Managed databases** - Native PostgreSQL and Redis
- ✅ **Auto-deploy** - Deploy from Git automatically
- ✅ **Zero-downtime** - Rolling deployments
- ✅ **DDoS protection** - Built-in security
- ✅ **Custom domains** - Free SSL certificates
- 💰 **Pricing**: $7/month (web service) + $7 (PostgreSQL) + $10 (Redis)

## Prerequisites

- GitHub/GitLab account with your code
- Render account ([sign up free](https://render.com))
- Credit card (for paid services)

## Method 1: Blueprint (Infrastructure as Code)

### 1. Push render.yaml to GitHub

Your repo already includes `render.yaml` at the root. Render reads this file automatically.

### 2. Create Blueprint on Render

1. Go to [render.com](https://render.com)
2. Click "New" → "Blueprint"
3. Connect your GitHub/GitLab repository
4. Render detects `render.yaml` automatically
5. Review the services (app + PostgreSQL + Redis)
6. Click "Apply"

### 3. Configure Additional Variables

1. Go to your web service → "Environment"
2. Add optional variables:
   ```bash
   CORS_ORIGIN=https://your-frontend-domain.com
   API_KEY=your-gemini-api-key
   SENTRY_DSN=your-sentry-dsn
   ```

### 4. Deploy

Render automatically:
- Provisions PostgreSQL database
- Provisions Redis instance
- Links databases to your app
- Builds and deploys your application
- Generates secure JWT secrets

### 5. Run Migrations

1. Go to your web service
2. Click "Shell" tab
3. Run:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

### 6. Verify

Visit your Render URL:
```
https://your-app.onrender.com/api/health
```

---

## Method 2: Manual Setup (Web UI)

### 1. Create Web Service

1. Go to Render dashboard
2. Click "New" → "Web Service"
3. Connect your Git repository
4. Configure:
   - **Name**: `hse-digital-backend`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**:
     ```bash
     npm install && cd server && npm install && npx prisma generate
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: Starter ($7/month)

### 2. Create PostgreSQL Database

1. Click "New" → "PostgreSQL"
2. Configure:
   - **Name**: `hse-digital-db`
   - **Database**: `hse_digital`
   - **Region**: Oregon (same as web service)
   - **Plan**: Starter ($7/month)
3. Create database
4. Copy the **Internal Connection String**

### 3. Create Redis Instance

1. Click "New" → "Redis"
2. Configure:
   - **Name**: `hse-digital-redis`
   - **Region**: Oregon (same as web service)
   - **Plan**: Starter ($10/month)
   - **Maxmemory Policy**: `allkeys-lru`
3. Create Redis
4. Copy **Hostname** and **Port**

### 4. Link Databases to Web Service

1. Go to your web service → "Environment"
2. Add environment variables:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=<postgres-internal-connection-string>
REDIS_HOST=<redis-hostname>
REDIS_PORT=<redis-port>
JWT_SECRET=<generate-32-char-random-string>
REFRESH_SECRET=<generate-32-char-random-string>
CORS_ORIGIN=https://your-frontend-domain.com
```

**Generate secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Watch build logs
3. Once deployed, Render provides URL: `https://your-app.onrender.com`

### 6. Run Migrations

1. Go to web service → "Shell"
2. Run:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

---

## Custom Domain

1. Go to web service → "Settings" → "Custom Domains"
2. Click "Add Custom Domain"
3. Enter your domain: `api.yourdomain.com`
4. Add DNS CNAME record:
   ```
   CNAME: api.yourdomain.com → your-app.onrender.com
   ```
5. Render auto-provisions SSL certificate
6. Wait for DNS propagation (5-30 minutes)

---

## Monitoring & Troubleshooting

### View Logs
- Go to web service → "Logs"
- Real-time streaming logs

### Health Checks
Render monitors `/api/health` every 30 seconds

### Common Issues

**Build Fails**: Clear build cache in Settings

**Database Connection Error**: Use internal connection string, not external

**WebSocket Issues**: Render supports WebSockets natively, ensure `wss://` protocol

---

## Resources

- [Render Documentation](https://render.com/docs)
- [render.yaml Spec](https://render.com/docs/yaml-spec)
- [HSE.Digital Docs](../README.md)
