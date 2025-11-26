import { z } from 'zod';

export const auditValidator = {
  create: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    auditorId: z.string().min(1, 'Auditor ID is required'),
    scheduledDate: z.string().datetime(),
    status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']).optional(),
    findings: z.string().optional(),
    score: z.number().min(0).max(100).optional(),
    completedDate: z.string().datetime().optional().nullable(),
  }),

  update: z.object({
    stationId: z.string().optional(),
    auditorId: z.string().optional(),
    scheduledDate: z.string().datetime().optional(),
    status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']).optional(),
    findings: z.string().optional(),
    score: z.number().min(0).max(100).optional(),
    completedDate: z.string().datetime().optional().nullable(),
  }),

  list: z.object({
    stationId: z.string().optional(),
    auditorId: z.string().optional(),
    status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']).optional(),
    cursor: z.string().optional(),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  }),

  id: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
};
