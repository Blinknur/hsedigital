import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_SECRET environment variables must be configured');
}

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000;
const SALT_ROUNDS = 10;

export const authService = {
  hashPassword: async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
  },

  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  },

  generateAccessToken: (user) => {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  },

  generateRefreshToken: (userId) => {
    const jti = crypto.randomBytes(16).toString('hex');
    return jwt.sign({ id: userId, jti }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  },

  generateTokens: (user) => {
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user.id);
    return { accessToken, refreshToken };
  },

  verifyAccessToken: (token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  },

  verifyRefreshToken: (token) => {
    try {
      return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
      return null;
    }
  },

  generateEmailVerificationToken: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  hashToken: (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  generatePasswordResetToken: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  getEmailVerificationExpiry: () => {
    return new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);
  },

  getPasswordResetExpiry: () => {
    return new Date(Date.now() + PASSWORD_RESET_EXPIRY);
  },

  storeRefreshToken: async (prisma, userId, refreshToken) => {
    const decoded = jwt.decode(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    let tokens = [];
    try {
      tokens = user.refreshTokens ? JSON.parse(user.refreshTokens) : [];
    } catch (e) {
      tokens = [];
    }

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

  revokeAllRefreshTokens: async (prisma, userId) => {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokens: JSON.stringify([]) },
    });
  },

  login: async (prisma, email, password) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await authService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      const error = new Error('Email not verified. Please check your email for verification link.');
      error.code = 'EMAIL_NOT_VERIFIED';
      throw error;
    }

    const tokens = authService.generateTokens(user);
    await authService.storeRefreshToken(prisma, user.id, tokens.refreshToken);

    const { password: _, emailVerificationToken, passwordResetToken, refreshTokens, ...userInfo } = user;

    return { ...tokens, user: userInfo };
  },
};
