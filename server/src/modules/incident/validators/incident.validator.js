import { z } from 'zod';

export const incidentValidator = {
  create: z.object({
    stationId: z.string().min(1, 'Station ID is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
    status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
    category: z.string().optional(),
  }),

  update: z.object({
    stationId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
    category: z.string().optional(),
  }),

  list: z.object({
    stationId: z.string().optional(),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
    cursor: z.string().optional(),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  }),

  id: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
};
