
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
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
import { startAuditLogCleanupScheduler } from './services/auditLogCleanup.js';

dotenv.config();

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

// --- Enterprise Middleware Stack ---

// 1. Security Headers
app.use(securityHeaders());
app.use(additionalSecurityHeaders);

// 2. Compression (Gzip)
app.use(compression());

// 3. HTTP Request Logging (Morgan)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 4. Cookie Parser
app.use(cookieParser());

// 5. CORS & Body Parsing
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-csrf-token', 'x-session-id'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 6. Request Sanitization
app.use(sanitizeRequest());

// 7. CSRF Protection
app.use(generateCSRFMiddleware());

// 8. IP-based Rate Limiting
app.use('/api/', ipRateLimit);

// 9. Security Audit Logging
app.use(auditLogger());

// Serve Uploaded Files Statically
app.use('/uploads', express.static(uploadDir));

// Initialize DB Client
const prisma = new PrismaClient();

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Initialize Stripe Client (Conditional)
const stripe = process.env.STRIPE_SECRET_KEY 
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) 
    : null;

if (!stripe) {
    console.warn("⚠️ STRIPE_SECRET_KEY not found. Payments will be mocked.");
}

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'ethereal.user',
        pass: process.env.SMTP_PASS || 'ethereal.pass'
    }
});

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

// --- SERVICES (Implementation) ---

// Email Service
const emailService = {
    sendMagicLink: async (email, token) => {
        const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/verify?token=${token}`;
        console.log(`[EMAIL] Magic Link for ${email}: ${link}`);
        if (!process.env.SMTP_HOST) return true;
        try {
            await transporter.sendMail({
                from: '"HSE.Digital Security" <security@hse.digital>',
                to: email,
                subject: 'Log in to HSE.Digital',
                html: `<p>Click here to log in: <a href="${link}">Magic Link</a></p>`
            });
            return true;
        } catch (e) {
            console.error("Email send failed:", e);
            return false;
        }
    },
    sendAlert: async (email, subject, message) => {
        console.log(`[EMAIL] Alert to ${email}: ${message}`);
        if (!process.env.SMTP_HOST) return true;
        try {
            await transporter.sendMail({
                from: '"HSE.Digital Alerts" <alerts@hse.digital>',
                to: email,
                subject: subject,
                text: message,
                html: `<p>${message}</p>`
            });
            return true;
        } catch (e) {
            console.error("Email alert failed:", e);
            return false;
        }
    }
};

// Payment Service
const paymentService = {
    createPortalSession: async (customerId) => {
        return { url: 'https://billing.stripe.com/p/session/test_123' };
    },
    createCheckoutSession: async (planId, orgId, userEmail) => {
         console.log(`[STRIPE] Creating checkout session for ${planId}`);
         return { url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings?success=true&plan=${planId}` }; 
    }
};

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

// --- Helper: Async Error Wrapper ---
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// --- REST API Routes ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'online', db: 'connected', mode: process.env.NODE_ENV || 'development' });
});

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

// --- STATIONS ---
app.get('/api/stations', authenticateToken, tenantContext, tenantRateLimit, requirePermission('stations', 'read'), asyncHandler(async (req, res) => {
    const where = {};
    if (req.tenantId) where.organizationId = req.tenantId;
    if (req.query.region) where.region = req.query.region;
    const stations = await prisma.station.findMany({ where, orderBy: { name: 'asc' } });
    res.json(stations);
}));

app.post('/api/stations', authenticateToken, tenantContext, tenantRateLimit, requirePermission('stations', 'write'), validateRequest(stationSchema), asyncHandler(async (req, res) => {
    const station = await prisma.station.create({
        data: {
            ...req.validatedData,
            organizationId: req.tenantId
        }
    });
    res.status(201).json(station);
}));

app.put('/api/stations/:id', authenticateToken, tenantContext, tenantRateLimit, requirePermission('stations', 'write'), validateParams(idParamSchema), validateRequest(stationSchema.partial()), asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.station.updateMany({
        where: { id, organizationId: req.tenantId },
        data: req.validatedData
    });
    const updated = await prisma.station.findUnique({ where: { id } });
    res.json(updated);
}));

app.delete('/api/stations/:id', authenticateToken, tenantContext, tenantRateLimit, requirePermission('stations', 'delete'), validateParams(idParamSchema), asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.station.deleteMany({
        where: { id, organizationId: req.tenantId }
    });
    res.json({ message: 'Station deleted' });
}));

// --- AUDITS ---
app.get('/api/audits', authenticateToken, tenantContext, tenantRateLimit, requirePermission('audits', 'read'), asyncHandler(async (req, res) => {
    const where = { organizationId: req.tenantId };
    if (req.query.stationId) where.stationId = req.query.stationId;
    const audits = await prisma.audit.findMany({
        where,
        orderBy: { scheduledDate: 'desc' }
    });
    res.json(audits);
}));

app.post('/api/audits', authenticateToken, tenantContext, tenantRateLimit, requirePermission('audits', 'write'), validateRequest(auditSchema), auditLog('audit'), asyncHandler(async (req, res) => {
    const audit = await prisma.audit.create({
        data: {
            organizationId: req.tenantId,
            ...req.validatedData,
            scheduledDate: new Date(req.validatedData.scheduledDate),
            completedDate: req.validatedData.completedDate ? new Date(req.validatedData.completedDate) : null,
            auditNumber: `AUD-${Date.now()}`
        }
    });
    res.status(201).json(audit);
}));

app.put('/api/audits/:id', authenticateToken, tenantContext, tenantRateLimit, requirePermission('audits', 'write'), validateParams(idParamSchema), validateRequest(auditSchema.partial()), captureOriginalEntity('audit'), auditLog('audit'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.validatedData };
    if (updateData.scheduledDate) updateData.scheduledDate = new Date(updateData.scheduledDate);
    if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate);
    await prisma.audit.updateMany({ where: { id, organizationId: req.tenantId }, data: updateData });
    const updated = await prisma.audit.findUnique({ where: { id }});
    res.json(updated);
}));

app.delete('/api/audits/:id', authenticateToken, tenantContext, tenantRateLimit, requirePermission('audits', 'delete'), validateParams(idParamSchema), asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.audit.deleteMany({
        where: { id, organizationId: req.tenantId }
    });
    res.json({ message: 'Audit deleted' });
}));

// --- INCIDENTS ---
app.get('/api/incidents', authenticateToken, tenantContext, tenantRateLimit, requirePermission('incidents', 'read'), asyncHandler(async (req, res) => {
    const where = { organizationId: req.tenantId };
    if (req.query.stationId) where.stationId = req.query.stationId;
    const incidents = await prisma.incident.findMany({
        where,
        orderBy: { reportedAt: 'desc' }
    });
    res.json(incidents);
}));

app.post('/api/incidents', authenticateToken, tenantContext, tenantRateLimit, requirePermission('incidents', 'write'), validateRequest(incidentSchema), asyncHandler(async (req, res) => {
    const incident = await prisma.incident.create({
        data: {
            organizationId: req.tenantId,
            reporterId: req.user.id,
            ...req.validatedData
        }
    });
    res.status(201).json(incident);
}));

app.put('/api/incidents/:id', authenticateToken, tenantContext, tenantRateLimit, requirePermission('incidents', 'write'), validateParams(idParamSchema), validateRequest(incidentSchema.partial()), asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.incident.updateMany({
        where: { id, organizationId: req.tenantId },
        data: req.validatedData
    });
    const updated = await prisma.incident.findUnique({ where: { id } });
    res.json(updated);
}));

// --- WORK PERMITS ---
app.get('/api/work-permits', authenticateToken, tenantContext, tenantRateLimit, requirePermission('workPermits', 'read'), asyncHandler(async (req, res) => {
    const where = { organizationId: req.tenantId };
    if (req.query.stationId) where.stationId = req.query.stationId;
    const permits = await prisma.workPermit.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
    res.json(permits);
}));

app.post('/api/work-permits', authenticateToken, tenantContext, tenantRateLimit, requirePermission('workPermits', 'write'), validateRequest(workPermitSchema), asyncHandler(async (req, res) => {
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

app.put('/api/work-permits/:id', authenticateToken, tenantContext, tenantRateLimit, requirePermission('workPermits', 'write'), validateParams(idParamSchema), validateRequest(workPermitSchema.partial()), asyncHandler(async (req, res) => {
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
app.get('/api/contractors', authenticateToken, tenantContext, tenantRateLimit, requirePermission('contractors', 'read'), asyncHandler(async (req, res) => {
    const contractors = await prisma.contractor.findMany({
        where: { organizationId: req.tenantId },
        orderBy: { name: 'asc' }
    });
    res.json(contractors);
}));

app.post('/api/contractors', authenticateToken, tenantContext, tenantRateLimit, requirePermission('contractors', 'write'), validateRequest(contractorSchema), asyncHandler(async (req, res) => {
    const contractor = await prisma.contractor.create({
        data: {
            organizationId: req.tenantId,
            ...req.validatedData
        }
    });
    res.status(201).json(contractor);
}));

// --- AI ---
app.post('/api/ai/generate', authenticateToken, tenantContext, userRateLimit, validateRequest(aiPromptSchema), asyncHandler(async (req, res) => {
    const { prompt } = req.validatedData;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        res.json({ text: response.text });
    } catch (aiError) {
        console.error("AI Service Error:", aiError);
        res.status(502).json({ error: "AI Service unavailable" });
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

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Internal Server Error' });
});

// --- Startup ---
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    startAuditLogCleanupScheduler();
});

process.on('SIGTERM', () => {
    server.close(() => {
        prisma.$disconnect();
    });
});
