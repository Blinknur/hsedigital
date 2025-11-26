import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authValidator } from '../validators/auth.validator.js';
import { validateRequest, validateQuery } from '../../shared/middleware/validation.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';
import { authRateLimit } from '../../shared/middleware/rateLimitRedis.js';

const router = express.Router();

router.use(prismaMiddleware);

router.get(
  '/check-subdomain',
  authRateLimit,
  validateQuery(authValidator.checkSubdomain),
  authController.checkSubdomain
);

router.post(
  '/signup-with-org',
  authRateLimit,
  validateRequest(authValidator.signupWithOrg),
  authController.signupWithOrg
);

router.post(
  '/register',
  authRateLimit,
  validateRequest(authValidator.register),
  authController.register
);

router.post(
  '/login',
  authRateLimit,
  validateRequest(authValidator.login),
  authController.login
);

router.post(
  '/verify-email',
  authRateLimit,
  validateRequest(authValidator.verifyEmail),
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  authRateLimit,
  validateRequest(authValidator.resendVerification),
  authController.resendVerification
);

router.post(
  '/password-reset-request',
  authRateLimit,
  validateRequest(authValidator.passwordResetRequest),
  authController.requestPasswordReset
);

router.post(
  '/password-reset',
  authRateLimit,
  validateRequest(authValidator.passwordReset),
  authController.resetPassword
);

router.post(
  '/refresh',
  authRateLimit,
  validateRequest(authValidator.refreshToken),
  authController.refreshToken
);

router.post(
  '/logout',
  authRateLimit,
  authController.logout
);

router.post(
  '/logout-all',
  authRateLimit,
  authController.logoutAll
);

export default router;
