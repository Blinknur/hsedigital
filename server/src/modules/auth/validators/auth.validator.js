import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const authValidator = {
  register: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    role: z.enum(['Admin', 'Compliance Manager', 'Station Manager', 'Contractor']).optional(),
    organizationId: z.string().optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  signupWithOrg: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
    subdomain: z.string().min(3, 'Subdomain must be at least 3 characters')
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Invalid subdomain format'),
  }),

  passwordResetRequest: z.object({
    email: z.string().email('Invalid email address'),
  }),

  passwordReset: z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: passwordSchema,
  }),

  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),

  verifyEmail: z.object({
    token: z.string().min(1, 'Token is required'),
  }),

  resendVerification: z.object({
    email: z.string().email('Invalid email address'),
  }),

  checkSubdomain: z.object({
    subdomain: z.string().min(1, 'Subdomain is required'),
  }),
};
