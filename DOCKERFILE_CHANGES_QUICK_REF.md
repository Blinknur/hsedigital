# Dockerfile Changes - Quick Reference

## What Changed

```diff
# Builder Stage
- FROM node:20-alpine AS builder
+ FROM node:18-slim AS builder

- RUN apk add --no-cache openssl-dev
+ RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Production Stage
- FROM node:20-alpine AS production
+ FROM node:18-slim AS production

- RUN apk add --no-cache openssl
+ RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
```

## Why

Alpine's musl libc caused Prisma compatibility issues:
- OpenSSL detection failures
- JSON parsing errors
- Runtime crashes

## Validation

```bash
./scripts/validate-dockerfile-changes.sh
```

## Rebuild

```bash
npm run docker:build
npm run docker:up
npm test
```

## Documentation

See `DOCKERFILE_MIGRATION_ALPINE_TO_SLIM.md` for full details.
