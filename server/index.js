
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
import { requirePermission, requireRole, getUserPermissions, getUserRoles } from './middleware/rbac.js';

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

// 1. Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Compression (Gzip)
app.use(compression());

// 3. HTTP Request Logging (Morgan)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 4. Rate Limiting (DDoS Protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// 5. CORS & Body Parsing
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));
app.use(express.json({ limit: '10mb' }));

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
app.post('/api/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
}));

// AUTH
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (user && user.password === password) {
        const tokens = generateTokens(user);
        const { password: _, ...userInfo } = user;
        return res.json({ ...tokens, user: userInfo });
    }
    return res.status(401).json({ error: "Invalid credentials" });
}));

// ADMIN SEED
app.post('/api/admin/seed', asyncHandler(async (req, res) => {
    exec('node prisma/seed.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Seed failed', details: stderr });
        }
        res.json({ message: "Seeded successfully.", logs: stdout });
    });
}));

// --- RBAC MANAGEMENT ---
app.get('/api/rbac/permissions/me', authenticateToken, asyncHandler(async (req, res) => {
    const permissions = await getUserPermissions(req.user.id);
    res.json(permissions);
}));

app.get('/api/rbac/roles/me', authenticateToken, asyncHandler(async (req, res) => {
    const roles = await getUserRoles(req.user.id);
    res.json(roles);
}));

// --- STATIONS ---
app.get('/api/stations', authenticateToken, tenantContext, requirePermission('stations', 'read'), asyncHandler(async (req, res) => {
    const where = {};
    if (req.tenantId) where.organizationId = req.tenantId;
    if (req.query.region) where.region = req.query.region;
    const stations = await prisma.station.findMany({ where, orderBy: { name: 'asc' } });
    res.json(stations);
}));

// --- AUDITS ---
app.get('/api/audits', authenticateToken, tenantContext, requirePermission('audits', 'read'), asyncHandler(async (req, res) => {
    const where = { organizationId: req.tenantId };
    if (req.query.stationId) where.stationId = req.query.stationId;
    const audits = await prisma.audit.findMany({
        where,
        orderBy: { scheduledDate: 'desc' }
    });
    res.json(audits);
}));

app.post('/api/audits', authenticateToken, tenantContext, requirePermission('audits', 'write'), asyncHandler(async (req, res) => {
    const { stationId, auditorId, scheduledDate, formId } = req.body;
    const audit = await prisma.audit.create({
        data: {
            organizationId: req.tenantId,
            stationId,
            auditorId,
            scheduledDate: new Date(scheduledDate),
            formId: formId || 'default-form',
            auditNumber: `AUD-${Date.now()}`,
            status: 'Scheduled',
            findings: [],
            overallScore: 0
        }
    });
    res.status(201).json(audit);
}));

app.put('/api/audits/:id', authenticateToken, tenantContext, requirePermission('audits', 'write'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.id; 
    delete updateData.organizationId; 
    delete updateData.auditNumber;
    await prisma.audit.updateMany({ where: { id, organizationId: req.tenantId }, data: updateData });
    const updated = await prisma.audit.findUnique({ where: { id }});
    res.json(updated);
}));

// --- AI ---
app.post('/api/ai/generate', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
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
});

process.on('SIGTERM', () => {
    server.close(() => {
        prisma.$disconnect();
    });
});
