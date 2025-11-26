import { authService } from '../services/auth.service.js';
import { emailService } from '../../shared/utils/email.js';

export const authController = {
  async checkSubdomain(req, res, next) {
    try {
      const { subdomain } = req.query;

      if (!subdomain || typeof subdomain !== 'string') {
        return res.status(400).json({ error: 'Subdomain is required' });
      }

      if (subdomain.length < 3) {
        return res.json({ available: false });
      }

      const existing = await req.prisma.organization.findFirst({
        where: { subdomain: subdomain.toLowerCase() }
      });

      res.json({ available: !existing });
    } catch (error) {
      next(error);
    }
  },

  async signupWithOrg(req, res, next) {
    try {
      const { organizationName, subdomain, name, email, password } = req.body;

      const hashedPassword = await authService.hashPassword(password);
      const emailVerificationToken = authService.generateEmailVerificationToken();
      const hashedEmailToken = authService.hashToken(emailVerificationToken);
      const emailVerificationExpires = authService.getEmailVerificationExpiry();

      const result = await req.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            subdomain: subdomain.toLowerCase(),
            subscriptionPlan: 'free',
            ownerId: 'temp',
          }
        });

        const user = await tx.user.create({
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

        await tx.organization.update({
          where: { id: organization.id },
          data: { ownerId: user.id }
        });

        return { organization, user };
      });

      await emailService.sendVerificationEmail(email, emailVerificationToken);

      const { password: _, emailVerificationToken: __, ...userInfo } = result.user;

      res.status(201).json({
        message: 'Account created successfully! Please check your email to verify your account.',
        user: userInfo,
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          subdomain: result.organization.subdomain
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('subdomain')) {
          return res.status(409).json({ error: 'Subdomain already taken' });
        }
        if (target?.includes('email')) {
          return res.status(409).json({ error: 'Email already registered' });
        }
        return res.status(409).json({ error: 'Resource already exists' });
      }
      next(error);
    }
  },

  async register(req, res, next) {
    try {
      const { name, email, password, role, organizationId } = req.body;

      const existingUser = await req.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hashedPassword = await authService.hashPassword(password);
      const emailVerificationToken = authService.generateEmailVerificationToken();
      const hashedEmailToken = authService.hashToken(emailVerificationToken);
      const emailVerificationExpires = authService.getEmailVerificationExpiry();

      const user = await req.prisma.user.create({
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
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(req.prisma, email, password);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: error.message });
      }
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        return res.status(403).json({ error: error.message, code: error.code });
      }
      next(error);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      const hashedToken = authService.hashToken(token);

      const user = await req.prisma.user.findFirst({
        where: {
          emailVerificationToken: hashedToken,
          emailVerificationExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      await req.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      });

      res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
      next(error);
    }
  },

  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;

      const user = await req.prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      const emailVerificationToken = authService.generateEmailVerificationToken();
      const hashedEmailToken = authService.hashToken(emailVerificationToken);
      const emailVerificationExpires = authService.getEmailVerificationExpiry();

      await req.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: hashedEmailToken,
          emailVerificationExpires
        }
      });

      await emailService.sendVerificationEmail(email, emailVerificationToken);

      res.json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  },

  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;

      const user = await req.prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.json({
          message: 'If an account exists with this email, a password reset link will be sent.'
        });
      }

      const passwordResetToken = authService.generatePasswordResetToken();
      const hashedPasswordResetToken = authService.hashToken(passwordResetToken);
      const passwordResetExpires = authService.getPasswordResetExpiry();

      await req.prisma.user.update({
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
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      const hashedToken = authService.hashToken(token);

      const user = await req.prisma.user.findFirst({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired password reset token' });
      }

      const hashedPassword = await authService.hashPassword(newPassword);

      await req.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      await authService.revokeAllRefreshTokens(req.prisma, user.id);

      res.json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      const decoded = authService.verifyRefreshToken(refreshToken);

      if (!decoded) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      const isValid = await authService.validateRefreshToken(req.prisma, decoded.id, refreshToken);

      if (!isValid) {
        return res.status(403).json({ error: 'Refresh token not found or revoked' });
      }

      const user = await req.prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }

      await authService.revokeRefreshToken(req.prisma, user.id, refreshToken);

      const tokens = authService.generateTokens(user);
      await authService.storeRefreshToken(req.prisma, user.id, tokens.refreshToken);

      res.json(tokens);
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.json({ message: 'Logged out' });
      }

      const decoded = authService.verifyRefreshToken(refreshToken);

      if (decoded) {
        await authService.revokeRefreshToken(req.prisma, decoded.id, refreshToken);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async logoutAll(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = authService.verifyAccessToken(token);

      if (!decoded) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      await authService.revokeAllRefreshTokens(req.prisma, decoded.id);

      res.json({ message: 'Logged out from all devices' });
    } catch (error) {
      next(error);
    }
  },
};
