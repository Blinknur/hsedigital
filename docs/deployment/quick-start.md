# Quick Start Guide

> ⚠️ **Cloud Deployment**: For deploying to cloud platforms (Railway, Render, etc.), see:
> - [DEPLOYMENT_PLATFORMS.md](../../DEPLOYMENT_PLATFORMS.md) - Platform comparison
> - [railway-quick-start.md](./railway-quick-start.md) - Deploy to Railway (easiest)
> - [render-quick-start.md](./render-quick-start.md) - Deploy to Render (production-ready)

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials and other settings
```

### 3. Setup Database

#### Option A: Using Prisma Migrate (Recommended)
```bash
# Generate Prisma Client
npm run prisma:generate

# Create database and apply schema
npm run prisma:migrate
```

#### Option B: Using Push (Development only)
```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npm run prisma:push
```

#### Option C: Using Custom Migrations
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply custom migrations
npm run prisma:migrate:custom
```

### 4. Seed Database

#### Full seed (with mock data)
```bash
npm run seed
```

This will create:
- 3 Organizations (Total Parco, Shell, PSO)
- 9 Users with different roles
- 6 Stations across Pakistan
- 3 Contractors
- 1 Form definition
- Complete RBAC system (roles, permissions, mappings)

#### RBAC-only seed
```bash
npm run seed:rbac
```

This creates only the RBAC system:
- 6 System roles
- 36 Permissions
- Role-permission mappings

### 5. Start Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on: http://localhost:3001

## Verify Setup

### Check Database Connection
```bash
npx prisma studio
```

### Test Migrations
```bash
npm run test:migrations
```

### Check API Health
```bash
curl http://localhost:3001/health
```

## Default Users (after running seed)

### Admin
- Email: `aamir.khan@saas-admin.com`
- Password: `Password123!`
- Role: Admin

### Compliance Manager (Total Parco)
- Email: `bilal.ahmed@totalparco.com`
- Password: `Password123!`
- Role: Compliance Manager

### Station Manager (Total Parco F-8)
- Email: `imad.wasim@totalparco-s1.com`
- Password: `Password123!`
- Role: Station Manager

### Contractor
- Email: `rashid@volttech.pk`
- Password: `Password123!`
- Role: Contractor

## Available Scripts

### Development
```bash
npm run dev              # Start with auto-reload
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Push schema to DB (dev only)
```

### Migrations
```bash
npm run prisma:migrate          # Create and apply new migration
npm run prisma:migrate:deploy   # Apply migrations (production)
npm run prisma:migrate:custom   # Apply custom migrations
npm run prisma:rollback:custom  # Rollback custom migrations
npm run test:migrations         # Test migration results
```

### Seeds
```bash
npm run seed       # Full seed with mock data
npm run seed:rbac  # RBAC system only
```

### Production
```bash
npm start  # Start production server
```

## Next Steps

1. **Review the schema**: Check `prisma/schema.prisma`
2. **Read migration docs**: See `MIGRATION_GUIDE.md`
3. **Explore RBAC system**: Check `prisma/README.md`
4. **Review API routes**: See `routes/` directory
5. **Test authentication**: Try logging in with default users

## Troubleshooting

### Database connection failed
- Check your DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify database exists

### Migration errors
```bash
# Check migration status
npx prisma migrate status

# Reset and reapply (CAUTION: deletes data)
npx prisma migrate reset
```

### Schema validation failed
```bash
# Validate schema
npx prisma validate

# Format schema
npx prisma format
```

### Port already in use
Change PORT in `.env` file or kill existing process:
```bash
# Find process on port 3001
lsof -ti:3001

# Kill process
kill -9 <PID>
```

## Additional Resources

- [Migration Guide](./MIGRATION_GUIDE.md)
- [Prisma Documentation](./prisma/README.md)
- [Tenant Architecture](./TENANT_ARCHITECTURE.md)
- [Main README](./README.md)
