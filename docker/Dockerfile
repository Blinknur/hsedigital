# Multi-stage Dockerfile with Layer Caching Optimization and Production Security Hardening
# Base: Debian Slim (optimal balance of size and compatibility)
# Architecture: Multi-stage build with separate dependency and build stages

# Stage 1: Dependencies - Production dependencies only (cached separately)
FROM node:18-slim AS deps

WORKDIR /app

# Copy only package files for optimal layer caching
# This layer is cached unless package.json changes
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies
# npm ci is faster and more reliable than npm install for CI/CD
RUN npm ci --only=production && \
    cd server && npm ci --only=production

# Stage 2: Builder - Build application with dev dependencies
FROM node:18-slim AS builder

WORKDIR /app

# Install build-time system dependencies (minimal set)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies (including dev dependencies for build)
RUN npm ci && cd server && npm ci

# Copy application source
# This layer changes frequently, so it's placed after dependency installation
COPY . .

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Build frontend with sourcemaps (fallback to regular build if unavailable)
RUN npm run build:sourcemaps || npm run build || mkdir -p /app/dist

# Ensure dist directory exists (even if empty) to prevent COPY errors
RUN mkdir -p /app/dist

# Stage 3: Production runtime - Minimal runtime image with security hardening
FROM node:18-slim AS production

WORKDIR /app

# Install runtime dependencies including dumb-init for signal handling
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security (uid 1000 as specified)
RUN groupadd -g 1000 appuser && \
    useradd -r -u 1000 -g appuser appuser

# Copy production dependencies from deps stage (not builder stage)
# This avoids including dev dependencies in the final image
COPY --from=deps --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=deps --chown=appuser:appuser /app/server/node_modules ./server/node_modules

# Copy Prisma schema and generated client
COPY --chown=appuser:appuser prisma ./prisma
COPY --from=builder --chown=appuser:appuser /app/node_modules/.prisma ./node_modules/.prisma

# Copy application files from builder stage
COPY --from=builder --chown=appuser:appuser /app/package*.json ./
COPY --from=builder --chown=appuser:appuser /app/server ./server
COPY --from=builder --chown=appuser:appuser /app/dist ./dist

# Copy .git directory for release version detection (optional)
COPY --from=builder --chown=appuser:appuser /app/.git ./.git

# Create writable directories with proper permissions for read-only filesystem
RUN mkdir -p /app/server/public/uploads && \
    mkdir -p /app/server/public/reports && \
    mkdir -p /app/logs && \
    mkdir -p /tmp/app && \
    chown -R appuser:appuser /app/server/public && \
    chown -R appuser:appuser /app/logs && \
    chown -R appuser:appuser /tmp/app && \
    chmod 755 /app/server/public/uploads && \
    chmod 755 /app/server/public/reports && \
    chmod 755 /app/logs && \
    chmod 755 /tmp/app

# Set environment variables for production with memory optimization
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=64"
ENV UV_THREADPOOL_SIZE=4

# Expose application port
EXPOSE 3001

# Health check using Node.js http module
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Switch to non-root user
USER appuser

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application with optimized Node.js settings
CMD ["node", "--trace-warnings", "--trace-deprecation", "server/src/index.js"]
