import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const authHelpers = {
  hashPassword: async (password) => {
    return await bcrypt.hash(password, 10);
  },

  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  },

  generateAccessToken: (user) => {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h',
    });
  },

  generateRefreshToken: (userId) => {
    return jwt.sign({ userId }, process.env.REFRESH_SECRET || 'test-refresh-secret', {
      expiresIn: '7d',
    });
  },

  generateTokens: (user) => {
    return {
      accessToken: authHelpers.generateAccessToken(user),
      refreshToken: authHelpers.generateRefreshToken(user.id),
    };
  },

  verifyAccessToken: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    } catch (error) {
      return null;
    }
  },

  verifyRefreshToken: (token) => {
    try {
      return jwt.verify(token, process.env.REFRESH_SECRET || 'test-refresh-secret');
    } catch (error) {
      return null;
    }
  },

  generateEmailVerificationToken: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  generatePasswordResetToken: () => {
    return crypto.randomBytes(32).toString('hex');
  },

  hashToken: (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  createAuthHeader: (token) => {
    return { Authorization: `Bearer ${token}` };
  },
};

export const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashToken,
  createAuthHeader,
} = authHelpers;
