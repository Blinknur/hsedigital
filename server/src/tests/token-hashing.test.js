import { describe, it, expect } from '@jest/globals';
import { authService } from '../core/services/authService.js';

describe('Token Hashing Security Tests', () => {
  describe('Email Verification Token Hashing', () => {
    it('should generate and hash email verification tokens', () => {
      const plainToken = authService.generateEmailVerificationToken();
      const hashedToken1 = authService.hashToken(plainToken);
      const hashedToken2 = authService.hashToken(plainToken);

      expect(plainToken).toBeDefined();
      expect(hashedToken1).toBeDefined();
      expect(plainToken.length).toBeGreaterThan(0);
      expect(hashedToken1.length).toBe(64);
      expect(hashedToken1).toBe(hashedToken2);
      expect(hashedToken1).not.toBe(plainToken);
    });
  });

  describe('Password Reset Token Hashing', () => {
    it('should generate and hash password reset tokens', () => {
      const plainToken = authService.generatePasswordResetToken();
      const hashedToken1 = authService.hashToken(plainToken);
      const hashedToken2 = authService.hashToken(plainToken);

      expect(plainToken).toBeDefined();
      expect(hashedToken1).toBeDefined();
      expect(plainToken.length).toBeGreaterThan(0);
      expect(hashedToken1.length).toBe(64);
      expect(hashedToken1).toBe(hashedToken2);
      expect(hashedToken1).not.toBe(plainToken);
    });
  });

  describe('Hash Uniqueness', () => {
    it('should generate unique hashes for different tokens', () => {
      const token1 = authService.generateEmailVerificationToken();
      const token2 = authService.generateEmailVerificationToken();
      const hash1 = authService.hashToken(token1);
      const hash2 = authService.hashToken(token2);

      expect(token1).not.toBe(token2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('SHA-256 Hash Properties', () => {
    it('should produce consistent 64-character hex hashes regardless of input length', () => {
      const shortToken = 'abc';
      const longToken = 'a'.repeat(1000);
      const shortHash = authService.hashToken(shortToken);
      const longHash = authService.hashToken(longToken);

      expect(shortHash.length).toBe(64);
      expect(longHash.length).toBe(64);
      expect(shortHash.length).toBe(longHash.length);
      expect(/^[a-f0-9]+$/.test(shortHash)).toBe(true);
      expect(/^[a-f0-9]+$/.test(longHash)).toBe(true);
    });
  });

  describe('Security Scenario - Token Verification Flow', () => {
    it('should verify tokens correctly using hash comparison', () => {
      const plainTokenForEmail = authService.generateEmailVerificationToken();
      const hashedTokenForDB = authService.hashToken(plainTokenForEmail);

      const userSubmittedToken = plainTokenForEmail;
      const hashedSubmittedToken = authService.hashToken(userSubmittedToken);

      expect(hashedSubmittedToken).toBe(hashedTokenForDB);
    });

    it('should reject incorrect tokens', () => {
      const plainTokenForEmail = authService.generateEmailVerificationToken();
      const hashedTokenForDB = authService.hashToken(plainTokenForEmail);

      const wrongToken = authService.generateEmailVerificationToken();
      const hashedWrongToken = authService.hashToken(wrongToken);

      expect(hashedWrongToken).not.toBe(hashedTokenForDB);
    });
  });
});
