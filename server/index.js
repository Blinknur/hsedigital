
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
    createCheckoutSession: async (priceId, orgId, userEmail) => {
        if (!stripe) {
            console.log(`[STRIPE MOCK] Creating checkout session for ${priceId}`);
            return { url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings?success=true&plan=${priceId}` }; 
        }

        const organization = await prisma.organization.findUnique({ where: { id: orgId } });
        
        let customerId = organization.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: { organizationId: orgId }
            });
            customerId = customer.id;
            await prisma.organization.update({
                where: { id: orgId },
                data: { stripeCustomerId: customerId }
            });
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings?success=true`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings?canceled=true`,
            metadata: { organizationId: orgId },
            subscription_data: {
                metadata: { organizationId: orgId }
            }
        });

        return { url: session.url };
    },

    createPortalSession: async (orgId) => {
        if (!stripe) {
            return { url: 'https://billing.stripe.com/p/session/test_123' };
        }

        const organization = await prisma.organization.findUnique({ where: { id: orgId } });
        if (!organization?.stripeCustomerId) {
            throw new Error('No Stripe customer found for this organization');
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: organization.stripeCustomerId,
            return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings`
        });

        return { url: session.url };
    }
};

// Usage Tracking Service
const usageService = {
    track: async (organizationId, resourceType, resourceId = null, quantity = 1, metadata = null) => {
        try {
            await prisma.usageRecord.create({
                data: {
                    organizationId,
                    resourceType,
                    resourceId,
                    quantity,
                    metadata
                }
            });
        } catch (e) {
            console.error('Usage tracking failed:', e);
        }
    },

    getUsage: async (organizationId, resourceType, startDate, endDate) => {
        const records = await prisma.usageRecord.findMany({
            where: {
                organizationId,
                resourceType,
                recordedAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        return records.reduce((sum, record) => sum + record.quantity, 0);
    }
};

// Feature Flag Service
const featureService = {
    PLAN_LIMITS: {
        free: {
            stations: 2,
            users: 3,
            audits_per_month: 10,
            incidents_per_month: 20,
            permits_per_month: 5,
            api_calls_per_day: 100,
            features: ['basic_audits', 'basic_incidents']
        },
        pro: {
            stations: 10,
            users: 15,
            audits_per_month: 100,
            incidents_per_month: 200,
            permits_per_month: 50,
            api_calls_per_day: 1000,
            features: ['basic_audits', 'basic_incidents', 'advanced_reporting', 'api_access', 'email_notifications']
        },
        enterprise: {
            stations: -1,
            users: -1,
            audits_per_month: -1,
            incidents_per_month: -1,
            permits_per_month: -1,
            api_calls_per_day: 10000,
            features: ['basic_audits', 'basic_incidents', 'advanced_reporting', 'api_access', 'email_notifications', 'sso', 'custom_branding', 'priority_support', 'ai_insights']
        }
    },

    hasFeature: (plan, feature) => {
        const planLimits = featureService.PLAN_LIMITS[plan] || featureService.PLAN_LIMITS.free;
        return planLimits.features.includes(feature);
    },

    checkLimit: async (organizationId, resourceType) => {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        const plan = org?.subscriptionPlan || 'free';
        const limits = featureService.PLAN_LIMITS[plan];

        const limitKey = `${resourceType}_per_month`;
        if (!limits[limitKey] || limits[limitKey] === -1) return true;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const usage = await usageService.getUsage(organizationId, resourceType, startOfMonth, now);

        return usage < limits[limitKey];
    },

    getQuota: async (organizationId, resourceType) => {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } });
        const plan = org?.subscriptionPlan || 'free';
        const limits = featureService.PLAN_LIMITS[plan];

        const limitKey = `${resourceType}_per_month`;
        const limit = limits[limitKey] || 0;

        if (limit === -1) {
            return { limit: -1, used: 0, remaining: -1 };
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const used = await usageService.getUsage(organizationId, resourceType, startOfMonth, now);

        return { limit, used, remaining: limit - used };
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

// --- Middleware: Quota Check ---
const checkQuota = (resourceType) => {
    return async (req, res, next) => {
        if (!req.tenantId) return next();
        
        const hasQuota = await featureService.checkLimit(req.tenantId, resourceType);
        if (!hasQuota) {
            return res.status(429).json({ 
                error: 'Quota exceeded', 
                message: `You have reached your monthly ${resourceType} limit. Please upgrade your plan.`,
                resourceType 
            });
        }
        next();
    };
};

// --- Middleware: Feature Gate ---
const requireFeature = (feature) => {
    return async (req, res, next) => {
        if (!req.tenantId) return next();
        
        const org = await prisma.organization.findUnique({ where: { id: req.tenantId } });
        const plan = org?.subscriptionPlan || 'free';
        
        if (!featureService.hasFeature(plan, feature)) {
            return res.status(403).json({ 
                error: 'Feature not available', 
                message: `This feature requires a higher plan. Current plan: ${plan}`,
                feature,
                currentPlan: plan
            });
        }
        next();
    };
};

// --- Middleware: Track API Calls ---
const trackApiUsage = async (req, res, next) => {
    if (req.tenantId && req.path.startsWith('/api/') && req.method !== 'GET') {
        await usageService.track(req.tenantId, 'api_call', null, 1, { 
            endpoint: req.path, 
            method: req.method 
        });
    }
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

// --- STATIONS ---
app.get('/api/stations', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
    const where = {};
    if (req.tenantId) where.organizationId = req.tenantId;
    if (req.query.region) where.region = req.query.region;
    const stations = await prisma.station.findMany({ where, orderBy: { name: 'asc' } });
    res.json(stations);
}));

// --- AUDITS ---
app.get('/api/audits', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
    const where = { organizationId: req.tenantId };
    if (req.query.stationId) where.stationId = req.query.stationId;
    const audits = await prisma.audit.findMany({
        where,
        orderBy: { scheduledDate: 'desc' }
    });
    res.json(audits);
}));

app.post('/api/audits', authenticateToken, tenantContext, checkQuota('audit'), asyncHandler(async (req, res) => {
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
    
    await usageService.track(req.tenantId, 'audit', audit.id);
    
    res.status(201).json(audit);
}));

app.put('/api/audits/:id', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.id; 
    delete updateData.organizationId; 
    delete updateData.auditNumber;
    await prisma.audit.updateMany({ where: { id, organizationId: req.tenantId }, data: updateData });
    const updated = await prisma.audit.findUnique({ where: { id }});
    res.json(updated);
}));

// --- STRIPE BILLING ---
app.post('/api/billing/checkout', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: 'priceId is required' });

    const result = await paymentService.createCheckoutSession(priceId, req.tenantId, req.user.email);
    res.json(result);
}));

app.post('/api/billing/portal', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
    const result = await paymentService.createPortalSession(req.tenantId);
    res.json(result);
}));

app.get('/api/billing/usage', authenticateToken, tenantContext, asyncHandler(async (req, res) => {
    const resourceTypes = ['audit', 'incident', 'permit', 'api_call'];
    const usage = {};

    for (const resourceType of resourceTypes) {
        usage[resourceType] = await featureService.getQuota(req.tenantId, resourceType);
    }

    const org = await prisma.organization.findUnique({
        where: { id: req.tenantId },
        select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true
        }
    });

    res.json({ ...org, usage });
}));

// --- STRIPE WEBHOOKS ---
const rawBodyParser = express.raw({ type: 'application/json' });
app.post('/api/webhooks/stripe', rawBodyParser, asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
        return res.status(400).json({ error: 'Stripe not configured' });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    await prisma.webhookEvent.create({
        data: {
            eventId: event.id,
            eventType: event.type,
            payload: event.data.object
        }
    });

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const organizationId = session.metadata.organizationId;
                
                if (session.mode === 'subscription') {
                    await prisma.organization.update({
                        where: { id: organizationId },
                        data: {
                            stripeSubscriptionId: session.subscription,
                            subscriptionStatus: 'active'
                        }
                    });
                }
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customer = await stripe.customers.retrieve(subscription.customer);
                const organizationId = customer.metadata.organizationId;

                const plan = subscription.items.data[0]?.price?.metadata?.plan || 'pro';

                await prisma.organization.update({
                    where: { id: organizationId },
                    data: {
                        stripeSubscriptionId: subscription.id,
                        subscriptionStatus: subscription.status,
                        subscriptionPlan: plan,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
                    }
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customer = await stripe.customers.retrieve(subscription.customer);
                const organizationId = customer.metadata.organizationId;

                await prisma.organization.update({
                    where: { id: organizationId },
                    data: {
                        subscriptionStatus: 'canceled',
                        subscriptionPlan: 'free',
                        cancelAtPeriodEnd: false
                    }
                });
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                console.log(`Payment succeeded for invoice ${invoice.id}`);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customer = await stripe.customers.retrieve(invoice.customer);
                const organizationId = customer.metadata.organizationId;

                await prisma.organization.update({
                    where: { id: organizationId },
                    data: { subscriptionStatus: 'past_due' }
                });

                const org = await prisma.organization.findUnique({ 
                    where: { id: organizationId },
                    include: { users: { where: { role: 'Compliance Manager' }, take: 1 } }
                });

                if (org.users[0]) {
                    await emailService.sendAlert(
                        org.users[0].email,
                        'Payment Failed',
                        'Your recent payment failed. Please update your payment method to avoid service interruption.'
                    );
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        await prisma.webhookEvent.update({
            where: { eventId: event.id },
            data: { processed: true, processedAt: new Date() }
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        await prisma.webhookEvent.update({
            where: { eventId: event.id },
            data: { processingError: error.message }
        });
    }

    res.json({ received: true });
}));

// --- AI ---
app.post('/api/ai/generate', authenticateToken, tenantContext, requireFeature('ai_insights'), asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    
    await usageService.track(req.tenantId, 'api_call', null, 1, { endpoint: '/api/ai/generate' });
    
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
