
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import cookieParser from 'cookie-parser';
import { requirePermission, requireRole, getUserPermissions, getUserRoles } from './middleware/rbac.js';
import { securityHeaders, additionalSecurityHeaders } from './middleware/security.js';
import { sanitizeRequest } from './middleware/sanitization.js';
import { generateCSRFMiddleware } from './middleware/csrf.js';
import { auditLogger, auditLog, captureOriginalEntity } from './middleware/auditLog.js';
import { tenantRateLimit, userRateLimit, ipRateLimit, authRateLimit } from './middleware/rateLimitRedis.js';
import { 
    validateRequest, 
    validateParams, 
    validateQuery,
    stationSchema,
    auditSchema,
    incidentSchema,
    workPermitSchema,
    contractorSchema,
    organizationSchema,
    userUpdateSchema,
    aiPromptSchema,
    idParamSchema
} from './middleware/validation.js';
import authRoutes from './routes/auth.js';
import auditLogsRouter from './routes/auditLogs.js';
import auditsRouter from './routes/audits.js';
import incidentsRouter from './routes/incidents.js';
import organizationsRouter from './routes/organizations.js';
import { startAuditLogCleanupScheduler } from './services/auditLogCleanup.js';
import { requireQuota, trackUsage, requireFeature } from './middleware/quota.js';
import { getUsageStats } from './services/quotaService.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import healthRoutes from './routes/health.js';
import metricsRoutes from './routes/metrics.js';
import { logger } from './utils/logger.js';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './utils/sentry.js';
import { httpLogger } from './middleware/logging.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { sentryContextMiddleware, sentryPerformanceMiddleware } from './middleware/sentry.js';
import { tracingMiddleware, enrichTracingContext, addTenantTierToSpan } from './middleware/tracing.js';
import { createInstrumentedPrismaClient } from './utils/prisma-instrumented.js';
import { createTracedPrismaClient } from './utils/tracedPrismaClient.js';
import { alertManager } from './monitoring/alerts.js';
import backupRoutes from './routes/backup.js';
import { generateAIContent } from './services/tracedAiService.js';

dotenv.config();

import { initializeTracing } from './utils/tracing.js';
initializeTracing();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret-key';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

initSentry(app);

app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

app.use(securityHeaders());
app.use(additionalSecurityHeaders);

app.use(compression());

app.use(httpLogger);

app.use(metricsMiddleware);

app.use(tracingMiddleware);

app.use(cookieParser());

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-csrf-token', 'x-session-id', 'x-trace-id', 'x-span-id', 'traceparent', 'tracestate'],
    credentials: true,
    exposedHeaders: ['x-trace-id', 'x-span-id']
}));

app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));

app.use(sanitizeRequest());

app.use(generateCSRFMiddleware());

app.use('/api/', ipRateLimit);

app.use(auditLogger());

app.use(sentryContextMiddleware);
app.use(sentryPerformanceMiddleware);

app.use(enrichTracingContext);

app.use('/uploads', express.static(uploadDir));

const prismaBase = createInstrumentedPrismaClient();
const prisma = createTracedPrismaClient();

logger.info('Initialized instrumented Prisma client');

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// File Storage Config (Multer)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});



// --- Helper: Generate Tokens ---
const generateTokens = (user) => {
    const payload = { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        organizationId: user.organizationId 
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

// --- Middleware: Auth Guard ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Middleware: Tenant Context ---
const tenantContext = async (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    if (user.role === 'Admin' && !user.organizationId) {
        req.tenantId = req.headers['x-tenant-id'] || null;
        return next();
    }
    if (!user.organizationId) {
        return res.status(403).json({ error: 'Access Denied: No Organization Context' });
    }
    req.tenantId = user.organizationId;
    next();
};

const tenantContextWithTracing = [tenantContext, addTenantTierToSpan(prisma)];

// --- Helper: Async Error Wrapper ---
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// --- Monitoring Routes (no auth) ---
app.use('/api', healthRoutes);
app.use('/', metricsRoutes);

// --- REST API Routes ---

// BACKUP ROUTES
app.use('/api/backup', authenticateToken, requireRole('Admin'), backupRoutes);

// FILE UPLOAD
app.post('/api/upload', authenticateToken, userRateLimit, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
}));

// AUTH ROUTES
app.use('/api/auth', authRateLimit, authRoutes);

// ADMIN SEED
app.post('/api/admin/seed', authenticateToken, requireRole('Admin'), asyncHandler(async (req, res) => {
    exec('node prisma/seed.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Seed failed', details: stderr });
        }
        res.json({ message: "Seeded successfully.", logs: stdout });
    });
}));

// --- RBAC MANAGEMENT ---
app.get('/api/rbac/permissions/me', authenticateToken, userRateLimit, asyncHandler(async (req, res) => {
    const permissions = await getUserPermissions(req.user.id);
    res.json(permissions);
}));

app.get('/api/rbac/roles/me', authenticateToken, userRateLimit, asyncHandler(async (req, res) => {
    const roles = await getUserRoles(req.user.id);
    res.json(roles);
}));

// --- USAGE ENDPOINT ---
app.get('/api/usage/current', authenticateToken, ...tenantContextWithTracing, asyncHandler(async (req, res) => {
    const stats = await getUsageStats(req.tenantId);
    if (!stats) {
        return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(stats);
}));

// --- BILLING ---
app.use('/api/billing', authenticateToken, billingRoutes);

// --- ORGANIZATIONS ---
app.use('/api/organizations', organizationsRouter);

// --- STATIONS ---
app.get('/api/stations', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('stations', 'read'), asyncHandler(async (req, res) => {
    const where = {};
    if (req.tenantId) where.organizationId = req.tenantId;
    if (req.query.region) where.region = req.query.region;
    const stations = await prisma.station.findMany({ where, orderBy: { name: 'asc' } });
    res.json(stations);
}));

app.post('/api/stations', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('stations', 'write'), validateRequest(stationSchema), requireQuota('stations'), asyncHandler(async (req, res) => {
    const station = await prisma.station.create({
        data: {
            ...req.validatedData,
            organizationId: req.tenantId
        }
    });
    res.status(201).json(station);
}));

app.put('/api/stations/:id', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('stations', 'write'), validateParams(idParamSchema), validateRequest(stationSchema.partial()), asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.station.updateMany({
        where: { id, organizationId: req.tenantId },
        data: req.validatedData
    });
    const updated = await prisma.station.findUnique({ where: { id } });
    res.json(updated);
}));

app.delete('/api/stations/:id', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('stations', 'delete'), validateParams(idParamSchema), asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.station.deleteMany({
        where: { id, organizationId: req.tenantId }
    });
    res.json({ message: 'Station deleted' });
}));

// --- AUDITS ---
app.use('/api/audits', auditsRouter);

// --- INCIDENTS ---
app.use('/api/incidents', incidentsRouter);

// --- WORK PERMITS ---
app.get('/api/work-permits', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('workPermits', 'read'), asyncHandler(async (req, res) => {
    const where = { organizationId: req.tenantId };
    if (req.query.stationId) where.stationId = req.query.stationId;
    const permits = await prisma.workPermit.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
    res.json(permits);
}));

app.post('/api/work-permits', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('workPermits', 'write'), validateRequest(workPermitSchema), requireQuota('work_permits'), trackUsage('work_permits'), asyncHandler(async (req, res) => {
    const permit = await prisma.workPermit.create({
        data: {
            organizationId: req.tenantId,
            requestedBy: req.user.id,
            ...req.validatedData,
            validFrom: new Date(req.validatedData.validFrom),
            validTo: new Date(req.validatedData.validTo)
        }
    });
    res.status(201).json(permit);
}));

app.put('/api/work-permits/:id', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('workPermits', 'write'), validateParams(idParamSchema), validateRequest(workPermitSchema.partial()), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.validatedData };
    if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
    if (updateData.validTo) updateData.validTo = new Date(updateData.validTo);
    await prisma.workPermit.updateMany({
        where: { id, organizationId: req.tenantId },
        data: updateData
    });
    const updated = await prisma.workPermit.findUnique({ where: { id } });
    res.json(updated);
}));

// --- CONTRACTORS ---
app.get('/api/contractors', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('contractors', 'read'), asyncHandler(async (req, res) => {
    const contractors = await prisma.contractor.findMany({
        where: { organizationId: req.tenantId },
        orderBy: { name: 'asc' }
    });
    res.json(contractors);
}));

app.post('/api/contractors', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('contractors', 'write'), validateRequest(contractorSchema), requireQuota('contractors'), asyncHandler(async (req, res) => {
    const contractor = await prisma.contractor.create({
        data: {
            organizationId: req.tenantId,
            ...req.validatedData
        }
    });
    res.status(201).json(contractor);
}));

// --- USERS ---
app.get('/api/users', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('users', 'read'), asyncHandler(async (req, res) => {
    const where = { organizationId: req.tenantId };
    const users = await prisma.user.findMany({ 
        where,
        select: { id: true, email: true, name: true, role: true, region: true, createdAt: true, updatedAt: true }
    });
    res.json(users);
}));

app.post('/api/users', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('users', 'write'), requireQuota('users'), asyncHandler(async (req, res) => {
    const { email, name, password, role, region } = req.body;
    const user = await prisma.user.create({
        data: {
            organizationId: req.tenantId,
            email,
            name,
            password,
            role: role || 'User',
            region,
            isEmailVerified: false
        }
    });
    const { password: _, ...userInfo } = user;
    res.status(201).json(userInfo);
}));

app.post('/api/contractors', authenticateToken, ...tenantContextWithTracing, tenantRateLimit, requirePermission('contractors', 'write'), validateRequest(contractorSchema), requireQuota('contractors'), asyncHandler(async (req, res) => {
    const contractor = await prisma.contractor.create({
        data: {
            organizationId: req.tenantId,
            ...req.validatedData
        }
    });
    res.status(201).json(contractor);
}));

// --- AI ---
app.post('/api/ai/generate', authenticateToken, ...tenantContextWithTracing, userRateLimit, validateRequest(aiPromptSchema), requireFeature('ai_assistant'), asyncHandler(async (req, res) => {
    const { prompt } = req.validatedData;
    try {
        const result = await generateAIContent(prompt, { model: 'gemini-2.5-flash' });
        res.json(result);
    } catch (error) {
        console.error("AI Service Error:", error);
        res.status(502).json({ error: error.message || "AI Service unavailable" });
    }
}));

// --- AUDIT LOGS ---
app.use('/api/admin/audit-logs', auditLogsRouter);

// --- Frontend Serving (Production) ---
const frontendPath = path.join(__dirname, '../dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) return next();
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// --- Sentry Error Handler ---
app.use(sentryErrorHandler());

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    const errorContext = {
        method: req.method,
        url: req.url,
        tenantId: req.tenantId,
        userId: req.user?.id,
        statusCode: err.statusCode || 500
    };

    logger.error({
        err,
        req: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body
        },
        tenantId: req.tenantId,
        userId: req.user?.id
    }, 'Unhandled error');

    if (err.statusCode >= 500 || !err.statusCode) {
        alertManager.criticalError(err, errorContext);
    }

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Internal Server Error' });
});

// --- Startup ---
const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, `🚀 Server running on http://localhost:${PORT}`);
    logger.info('✅ Monitoring enabled: Logs (Pino), Metrics (Prometheus), Errors (Sentry), Alerts (Custom)');
    startAuditLogCleanupScheduler();
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        prisma.$disconnect().then(() => {
            logger.info('Database connection closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        prisma.$disconnect().then(() => {
            logger.info('Database connection closed');
            process.exit(0);
        });
    });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Promise Rejection');
    alertManager.criticalError(new Error('Unhandled Promise Rejection'), { reason });
});

process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught Exception');
    alertManager.criticalError(error, { type: 'uncaughtException' });
    process.exit(1);
});
