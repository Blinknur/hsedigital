# Docker Deployment Guide

This guide covers building and running the HSE Digital application using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start (Development)

### Using Docker Compose

1. **Start all services:**
```bash
docker-compose up -d
```

2. **Run database migrations:**
```bash
docker-compose exec app npx prisma generate
docker-compose exec app npx prisma db push
```

3. **Access the application:**
- Application: http://localhost:3001
- Health Check: http://localhost:3001/api/health

4. **View logs:**
```bash
docker-compose logs -f app
```

5. **Stop services:**
```bash
docker-compose down
```

## Building the Docker Image

### Local Build

```bash
docker build -t hse-digital:latest .
```

### Multi-platform Build (for production)

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t hse-digital:latest .
```

## Running the Container

### Basic Run

```bash
docker run -d \
  --name hse-app \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:password@host:5432/db \
  -e REDIS_HOST=redis-host \
  -e REDIS_PORT=6379 \
  -e JWT_SECRET=your-secret \
  -e REFRESH_SECRET=your-refresh-secret \
  hse-digital:latest
```

### With Environment File

```bash
docker run -d \
  --name hse-app \
  -p 3001:3001 \
  --env-file .env \
  hse-digital:latest
```

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:5432/db` |
| `REDIS_HOST` | Redis host | `redis` or `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT access token secret | Random secure string |
| `REFRESH_SECRET` | JWT refresh token secret | Random secure string |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | Application port | `3001` |

Optional environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `API_KEY` | Google Gemini API key | - |
| `SENTRY_DSN` | Sentry error tracking | - |
| `AWS_*` | AWS credentials for S3 | - |

## Production Deployment

### 1. Build Production Image

```bash
docker build \
  --target production \
  -t ghcr.io/your-org/hse-digital:latest \
  .
```

### 2. Push to Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Push image
docker push ghcr.io/your-org/hse-digital:latest
```

### 3. Deploy to Kubernetes

The image is automatically deployed via GitHub Actions when pushing to `main` or `staging` branches.

See `docs/deployment/production.md` for complete Kubernetes deployment guide.

## Docker Image Structure

The Dockerfile uses a multi-stage build process:

1. **base**: Sets up Node.js 18 Alpine with system dependencies
2. **root-deps**: Installs root package.json dependencies
3. **server-deps**: Installs server package.json dependencies (includes cookie-parser)
4. **prisma-gen**: Generates Prisma client
5. **production**: Final minimal image with all dependencies and application code

### Key Features

- ✅ Multi-stage build for minimal image size
- ✅ Non-root user (nodejs:1000) for security
- ✅ Both root and server node_modules included
- ✅ Cookie-parser dependency properly installed
- ✅ Health check configured
- ✅ Proper layer caching for faster builds
- ✅ Alpine Linux base for small footprint

## Troubleshooting

### Missing Dependencies Error

If you see errors about missing dependencies like `cookie-parser`:

1. Verify `server/package.json` includes the dependency
2. Rebuild the image: `docker build --no-cache -t hse-digital:latest .`
3. Check build logs for any npm install errors

### Container Won't Start

Check logs:
```bash
docker logs hse-app
```

Common issues:
- Missing required environment variables (JWT_SECRET, DATABASE_URL, etc.)
- Database connection failed
- Redis connection failed

### Permission Issues

The container runs as non-root user (nodejs:1000). Ensure volume permissions are correct:

```bash
# Fix upload directory permissions
docker-compose exec app chown -R nodejs:nodejs /app/server/public/uploads
```

### Database Migrations

Run migrations inside the container:

```bash
# Docker Compose
docker-compose exec app npx prisma generate
docker-compose exec app npx prisma db push

# Standalone container
docker exec -it hse-app npx prisma generate
docker exec -it hse-app npx prisma db push
```

## Development Workflow

### Live Development with Docker

For development with hot reload, mount your source code:

```bash
docker run -d \
  --name hse-dev \
  -p 3001:3001 \
  -v $(pwd)/server:/app/server \
  --env-file .env \
  hse-digital:latest \
  npm run dev
```

Or use docker-compose with override:

```yaml
# docker-compose.override.yml
version: '3.9'
services:
  app:
    volumes:
      - ./server:/app/server
    command: npm run dev
```

## CI/CD Integration

The repository includes GitHub Actions workflow that:

1. Builds Docker image on push to `main` or `staging`
2. Pushes to GitHub Container Registry (ghcr.io)
3. Deploys to Kubernetes cluster
4. Tags images with branch name and commit SHA

See `.github/workflows/deploy.yml` for details.

## Security Best Practices

- ✅ Non-root user
- ✅ Read-only root filesystem (where possible)
- ✅ No privilege escalation
- ✅ Minimal base image (Alpine)
- ✅ Security scanning in CI/CD
- ✅ Secrets via environment variables, not in image
- ✅ Health checks configured

## Performance Tips

1. **Use BuildKit:** Set `DOCKER_BUILDKIT=1` for faster builds
2. **Layer caching:** Dependencies are cached separately from application code
3. **Multi-stage builds:** Only production dependencies in final image
4. **Alpine Linux:** Smaller image size, faster pulls

## Support

For deployment issues, see:
- `docs/deployment/production.md` - Kubernetes deployment
- `docs/deployment/quick-start.md` - Local development setup
- `AGENTS.md` - Development commands and architecture
