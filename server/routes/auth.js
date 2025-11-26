import express from 'express';
import prisma from '../utils/db.js';
import { authService, registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema, signupWithOrgSchema } from '../services/authService.js';
import { emailService } from '../services/emailService.js';
import { provisionOrganization } from '../services/tenantProvisioning.js';

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// CHECK SUBDOMAIN AVAILABILITY
router.get('/check-subdomain', asyncHandler(async (req, res) => {
    const { subdomain } = req.query;

    if (!subdomain || typeof subdomain !== 'string') {
        return res.status(400).json({ error: 'Subdomain is required' });
    }

    if (subdomain.length < 3) {
        return res.json({ available: false });
    }

    const existing = await prisma.organization.findFirst({
        where: { subdomain: subdomain.toLowerCase() }
    });

    res.json({ available: !existing });
}));

// SIGNUP WITH ORGANIZATION
router.post('/signup-with-org', asyncHandler(async (req, res) => {
    const { organizationName, subdomain, name, email, password } = req.body;

    if (!organizationName || !subdomain || !name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
        return res.status(400).json({ error: 'Invalid subdomain format' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const existingOrg = await prisma.organization.findFirst({
        where: { subdomain: subdomain.toLowerCase() }
    });
    if (existingOrg) {
        return res.status(409).json({ error: 'Subdomain already taken' });
    }

    const hashedPassword = await authService.hashPassword(password);
    const emailVerificationToken = authService.generateEmailVerificationToken();
    const hashedEmailToken = authService.hashToken(emailVerificationToken);
    const emailVerificationExpires = authService.getEmailVerificationExpiry();

    const organization = await prisma.organization.create({
        data: {
            name: organizationName,
            subdomain: subdomain.toLowerCase(),
            subscriptionPlan: 'free',
        }
    });

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: 'Admin',
            organizationId: organization.id,
            emailVerificationToken: hashedEmailToken,
            emailVerificationExpires,
            isEmailVerified: false,
        }
    });

    await prisma.organization.update({
        where: { id: organization.id },
        data: { ownerId: user.id }
    });

    await emailService.sendVerificationEmail(email, emailVerificationToken);

    const { password: _, emailVerificationToken: __, ...userInfo } = user;

    res.status(201).json({
        message: 'Account created successfully! Please check your email to verify your account.',
        user: userInfo,
        organization: {
            id: organization.id,
            name: organization.name,
            subdomain: organization.subdomain
        }
    });
}));

// REGISTER
router.post('/register', asyncHandler(async (req, res) => {
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validation.error.errors 
        });
    }

    const { name, email, password, role, organizationId } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await authService.hashPassword(password);
    const emailVerificationToken = authService.generateEmailVerificationToken();
    const hashedEmailToken = authService.hashToken(emailVerificationToken);
    const emailVerificationExpires = authService.getEmailVerificationExpiry();

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role: role || 'Station Manager',
            organizationId: organizationId || null,
            emailVerificationToken: hashedEmailToken,
            emailVerificationExpires,
            isEmailVerified: false,
        }
    });

    await emailService.sendVerificationEmail(email, emailVerificationToken);

    const { password: _, emailVerificationToken: __, ...userInfo } = user;

    res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: userInfo
    });
}));

// LOGIN
router.post('/login', asyncHandler(async (req, res) => {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validation.error.errors 
        });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await authService.comparePassword(password, user.password);

    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
        return res.status(403).json({ 
            error: 'Email not verified. Please check your email for verification link.',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }

    const tokens = authService.generateTokens(user);
    await authService.storeRefreshToken(prisma, user.id, tokens.refreshToken);

    const { password: _, emailVerificationToken, passwordResetToken, refreshTokens, ...userInfo } = user;

    res.json({
        ...tokens,
        user: userInfo
    });
}));

// VERIFY EMAIL
router.post('/verify-email', asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    const hashedToken = authService.hashToken(token);

    const user = await prisma.user.findFirst({
        where: {
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { gt: new Date() }
        }
    });

    if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpires: null
        }
    });

    res.json({ message: 'Email verified successfully. You can now log in.' });
}));

// RESEND VERIFICATION EMAIL
router.post('/resend-verification', asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
    }

    const emailVerificationToken = authService.generateEmailVerificationToken();
    const hashedEmailToken = authService.hashToken(emailVerificationToken);
    const emailVerificationExpires = authService.getEmailVerificationExpiry();

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerificationToken: hashedEmailToken,
            emailVerificationExpires
        }
    });

    await emailService.sendVerificationEmail(email, emailVerificationToken);

    res.json({ message: 'Verification email sent' });
}));

// REQUEST PASSWORD RESET
router.post('/password-reset-request', asyncHandler(async (req, res) => {
    const validation = passwordResetRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validation.error.errors 
        });
    }

    const { email } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return res.json({ 
            message: 'If an account exists with this email, a password reset link will be sent.' 
        });
    }

    const passwordResetToken = authService.generatePasswordResetToken();
    const hashedPasswordResetToken = authService.hashToken(passwordResetToken);
    const passwordResetExpires = authService.getPasswordResetExpiry();

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: hashedPasswordResetToken,
            passwordResetExpires
        }
    });

    await emailService.sendPasswordResetEmail(email, passwordResetToken);

    res.json({ 
        message: 'If an account exists with this email, a password reset link will be sent.' 
    });
}));

// RESET PASSWORD
router.post('/password-reset', asyncHandler(async (req, res) => {
    const validation = passwordResetSchema.safeParse(req.body);
    
    if (!validation.success) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validation.error.errors 
        });
    }

    const { token, newPassword } = validation.data;

    const hashedToken = authService.hashToken(token);

    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpires: { gt: new Date() }
        }
    });

    if (!user) {
        return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const hashedPassword = await authService.hashPassword(newPassword);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpires: null
        }
    });

    await authService.revokeAllRefreshTokens(prisma, user.id);

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
}));

// REFRESH TOKEN
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = authService.verifyRefreshToken(refreshToken);

    if (!decoded) {
        return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const isValid = await authService.validateRefreshToken(prisma, decoded.id, refreshToken);

    if (!isValid) {
        return res.status(403).json({ error: 'Refresh token not found or revoked' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
        return res.status(403).json({ error: 'User not found' });
    }

    await authService.revokeRefreshToken(prisma, user.id, refreshToken);

    const tokens = authService.generateTokens(user);
    await authService.storeRefreshToken(prisma, user.id, tokens.refreshToken);

    res.json(tokens);
}));

// LOGOUT
router.post('/logout', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.json({ message: 'Logged out' });
    }

    const decoded = authService.verifyRefreshToken(refreshToken);

    if (decoded) {
        await authService.revokeRefreshToken(prisma, decoded.id, refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
}));

// LOGOUT ALL DEVICES
router.post('/logout-all', asyncHandler(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = authService.verifyAccessToken(token);

    if (!decoded) {
        return res.status(403).json({ error: 'Invalid token' });
    }

    await authService.revokeAllRefreshTokens(prisma, decoded.id);

    res.json({ message: 'Logged out from all devices' });
}));

// SELF-SERVICE ORGANIZATION SIGNUP
router.post('/signup-with-org', asyncHandler(async (req, res) => {
    const validation = signupWithOrgSchema.safeParse(req.body);
    
    if (!validation.success) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validation.error.errors 
        });
    }

    const { name, email, password, organizationName } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const result = await provisionOrganization({
        organizationName,
        ownerName: name,
        ownerEmail: email,
        ownerPassword: password
    });

    res.status(201).json({
        message: 'Organization created successfully. Please check your email to verify your account.',
        organization: result.organization,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
    });
}));

export default router;
