import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { authService, registerSchema, loginSchema } from '../core/services/authService.js';

describe('JWT Authentication System Tests', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly with bcrypt', async () => {
      const password = 'Password123!';
      const hashed = await authService.hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should validate correct passwords', async () => {
      const password = 'Password123!';
      const hashed = await authService.hashPassword(password);
      const isValid = await authService.comparePassword(password, hashed);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'Password123!';
      const hashed = await authService.hashPassword(password);
      const isInvalid = await authService.comparePassword('wrongpass', hashed);
      
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access and refresh tokens', () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'Admin',
        organizationId: 'org-123'
      };
      
      const tokens = authService.generateTokens(mockUser);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens for same user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'Admin',
        organizationId: 'org-123'
      };
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const tokens1 = authService.generateTokens(mockUser);
      await new Promise(resolve => setTimeout(resolve, 10));
      const tokens2 = authService.generateTokens(mockUser);
      
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify valid access tokens', () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'Admin',
        organizationId: 'org-123'
      };
      
      const accessToken = authService.generateAccessToken(mockUser);
      const decoded = authService.verifyAccessToken(accessToken);
      
      expect(decoded).toBeTruthy();
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.organizationId).toBe(mockUser.organizationId);
    });

    it('should reject invalid tokens', () => {
      const invalidDecoded = authService.verifyAccessToken('invalid.token.here');
      
      expect(invalidDecoded).toBe(null);
    });

    it('should reject malformed tokens', () => {
      const invalidDecoded = authService.verifyAccessToken('not-even-a-token');
      
      expect(invalidDecoded).toBe(null);
    });
  });

  describe('Email Verification Token', () => {
    it('should generate email verification tokens', () => {
      const token = authService.generateEmailVerificationToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique email verification tokens', () => {
      const token1 = authService.generateEmailVerificationToken();
      const token2 = authService.generateEmailVerificationToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should provide email verification expiry date', () => {
      const expiry = authService.getEmailVerificationExpiry();
      
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Password Reset Token', () => {
    it('should generate password reset tokens', () => {
      const token = authService.generatePasswordResetToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique password reset tokens', () => {
      const token1 = authService.generatePasswordResetToken();
      const token2 = authService.generatePasswordResetToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should provide password reset expiry date', () => {
      const expiry = authService.getPasswordResetExpiry();
      
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Validation Schemas', () => {
    it('should validate correct registration data', () => {
      const validRegister = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        role: 'Admin'
      };
      
      const result = registerSchema.safeParse(validRegister);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid registration data', () => {
      const invalidRegister = {
        name: 'J',
        email: 'invalid-email',
        password: 'weak',
      };
      
      const result = registerSchema.safeParse(invalidRegister);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.errors.length).toBeGreaterThan(0);
    });

    it('should validate correct login data', () => {
      const validLogin = {
        email: 'john@example.com',
        password: 'Password123!'
      };
      
      const result = loginSchema.safeParse(validLogin);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid login data', () => {
      const invalidLogin = {
        email: 'not-an-email',
        password: ''
      };
      
      const result = loginSchema.safeParse(invalidLogin);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should generate different refresh tokens on each call', () => {
      const userId = 'test-user-id';
      const refreshToken1 = authService.generateRefreshToken(userId);
      const refreshToken2 = authService.generateRefreshToken(userId);
      
      expect(refreshToken1).not.toBe(refreshToken2);
      expect(refreshToken1.length).toBeGreaterThan(0);
      expect(refreshToken2.length).toBeGreaterThan(0);
    });
  });

  describe('Token Hashing', () => {
    it('should hash tokens with SHA-256', () => {
      const emailToken = authService.generateEmailVerificationToken();
      const hashedEmailToken = authService.hashToken(emailToken);
      
      expect(hashedEmailToken).toBeDefined();
      expect(hashedEmailToken).not.toBe(emailToken);
      expect(hashedEmailToken.length).toBe(64);
    });

    it('should produce consistent hashes for same input', () => {
      const token = authService.generateEmailVerificationToken();
      const hash1 = authService.hashToken(token);
      const hash2 = authService.hashToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const token1 = authService.generateEmailVerificationToken();
      const token2 = authService.generatePasswordResetToken();
      const hash1 = authService.hashToken(token1);
      const hash2 = authService.hashToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
