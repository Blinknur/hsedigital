import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';

if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
    throw new Error('JWT_SECRET and REFRESH_SECRET environment variables must be configured');
}

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
const SALT_ROUNDS = 10;

// Validation schemas
export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    role: z.enum(['Admin', 'Compliance Manager', 'Station Manager', 'Contractor']).optional(),
    organizationId: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const passwordResetRequestSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const passwordResetSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const signupWithOrgSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
});

export const authService = {
    // Hash password with bcrypt
    hashPassword: async (password) => {
        return await bcrypt.hash(password, SALT_ROUNDS);
    },

    // Compare password with hashed password
    comparePassword: async (password, hashedPassword) => {
        return await bcrypt.compare(password, hashedPassword);
    },

    // Generate access token
    generateAccessToken: (user) => {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        };
        return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    },

    // Generate refresh token
    generateRefreshToken: (userId) => {
        const jti = crypto.randomBytes(16).toString('hex'); // unique token ID
        return jwt.sign({ id: userId, jti }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    },

    // Generate token pair
    generateTokens: (user) => {
        const accessToken = authService.generateAccessToken(user);
        const refreshToken = authService.generateRefreshToken(user.id);
        return { accessToken, refreshToken };
    },

    // Verify access token
    verifyAccessToken: (token) => {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    },

    // Verify refresh token
    verifyRefreshToken: (token) => {
        try {
            return jwt.verify(token, REFRESH_SECRET);
        } catch (error) {
            return null;
        }
    },

    // Generate email verification token
    generateEmailVerificationToken: () => {
        return crypto.randomBytes(32).toString('hex');
    },

    // Hash token with SHA-256
    hashToken: (token) => {
        return crypto.createHash('sha256').update(token).digest('hex');
    },

    // Generate password reset token
    generatePasswordResetToken: () => {
        return crypto.randomBytes(32).toString('hex');
    },

    // Get expiry dates
    getEmailVerificationExpiry: () => {
        return new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);
    },

    getPasswordResetExpiry: () => {
        return new Date(Date.now() + PASSWORD_RESET_EXPIRY);
    },

    // Store refresh token (for rotation)
    storeRefreshToken: async (prisma, userId, refreshToken) => {
        const decoded = jwt.decode(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        let tokens = [];
        try {
            tokens = user.refreshTokens ? JSON.parse(user.refreshTokens) : [];
        } catch (e) {
            tokens = [];
        }

        // Keep only last 5 tokens
        tokens = tokens.slice(-4);
        tokens.push({
            jti: decoded.jti,
            token: refreshToken,
            createdAt: new Date().toISOString(),
        });

        await prisma.user.update({
            where: { id: userId },
            data: { refreshTokens: JSON.stringify(tokens) },
        });
    },

    // Validate refresh token exists in user's token list
    validateRefreshToken: async (prisma, userId, refreshToken) => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return false;

        let tokens = [];
        try {
            tokens = user.refreshTokens ? JSON.parse(user.refreshTokens) : [];
        } catch (e) {
            return false;
        }

        const decoded = jwt.decode(refreshToken);
        return tokens.some(t => t.jti === decoded.jti);
    },

    // Revoke refresh token (rotation)
    revokeRefreshToken: async (prisma, userId, refreshToken) => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        let tokens = [];
        try {
            tokens = user.refreshTokens ? JSON.parse(user.refreshTokens) : [];
        } catch (e) {
            tokens = [];
        }

        const decoded = jwt.decode(refreshToken);
        tokens = tokens.filter(t => t.jti !== decoded.jti);

        await prisma.user.update({
            where: { id: userId },
            data: { refreshTokens: JSON.stringify(tokens) },
        });
    },

    // Revoke all refresh tokens
    revokeAllRefreshTokens: async (prisma, userId) => {
        await prisma.user.update({
            where: { id: userId },
            data: { refreshTokens: JSON.stringify([]) },
        });
    },
};
