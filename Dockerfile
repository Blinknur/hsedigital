# Multi-stage build for Node.js application
# Stage 1: Build dependencies and application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies (including dev dependencies for build)
RUN npm install
RUN cd server && npm install

# Copy application source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build frontend (if using Vite)
RUN npm run build || echo "No build script found"

# Stage 2: Production runtime
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY server/package*.json ./server/

RUN npm install --only=production
RUN cd server && npm install --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p /app/server/public/uploads

# Set environment to production
ENV NODE_ENV=production

# Expose application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server/index.js"]
