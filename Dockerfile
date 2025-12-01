# Multi-stage build for HSE Digital Backend
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Stage 1: Install root dependencies
FROM base AS root-deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Install server dependencies
FROM base AS server-deps
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production && npm cache clean --force

# Stage 3: Generate Prisma Client
FROM base AS prisma-gen
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# Stage 4: Production image
FROM node:18-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache openssl libc6-compat

# Create non-root user
RUN addgroup -g 1000 nodejs && \
    adduser -u 1000 -G nodejs -s /bin/sh -D nodejs

WORKDIR /app

# Copy root node_modules
COPY --from=root-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=root-deps --chown=nodejs:nodejs /app/package*.json ./

# Copy server files and node_modules
COPY --from=server-deps --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=prisma-gen --chown=nodejs:nodejs /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY --chown=nodejs:nodejs server/package*.json ./server/
COPY --chown=nodejs:nodejs server/prisma ./server/prisma
COPY --chown=nodejs:nodejs server/src ./server/src

# Create required directories
RUN mkdir -p server/public/uploads server/public/reports && \
    chown -R nodejs:nodejs server/public

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start application
CMD ["npm", "start"]
