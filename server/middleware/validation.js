import { z } from 'zod';

export const stationSchema = z.object({
    name: z.string().min(1).max(255),
    brand: z.string().max(255).optional(),
    region: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    location: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180)
    }).optional(),
    riskCategory: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Low'),
    auditFrequency: z.enum(['Monthly', 'Quarterly', 'Semi-Annually', 'Annually']).default('Annually'),
    isActive: z.boolean().default(true)
});

export const auditSchema = z.object({
    stationId: z.string().cuid(),
    auditorId: z.string().cuid(),
    scheduledDate: z.string().datetime().or(z.date()),
    completedDate: z.string().datetime().or(z.date()).optional().nullable(),
    status: z.enum(['Scheduled', 'In Progress', 'Completed', 'Cancelled']).default('Scheduled'),
    formId: z.string().min(1),
    findings: z.array(z.any()).default([]),
    overallScore: z.number().min(0).max(100).default(0)
});

export const incidentSchema = z.object({
    stationId: z.string().cuid(),
    incidentType: z.string().min(1).max(255),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
    description: z.string().min(1).max(5000),
    status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).default('Open')
});

export const workPermitSchema = z.object({
    stationId: z.string().cuid(),
    permitType: z.string().min(1).max(255),
    description: z.string().min(1).max(5000),
    validFrom: z.string().datetime().or(z.date()),
    validTo: z.string().datetime().or(z.date()),
    status: z.enum(['Pending', 'Approved', 'Rejected', 'Expired']).default('Pending')
});

export const contractorSchema = z.object({
    name: z.string().min(1).max(255),
    licenseNumber: z.string().max(100).optional(),
    specialization: z.string().max(255).optional(),
    contactPerson: z.string().max(255).optional(),
    email: z.string().email().optional(),
    status: z.enum(['Active', 'Inactive', 'Suspended']).default('Active')
});

export const formDefinitionSchema = z.object({
    name: z.string().min(1).max(255),
    frequency: z.string().max(100).optional(),
    schema: z.record(z.any())
});

export const organizationSchema = z.object({
    name: z.string().min(1).max(255),
    subscriptionPlan: z.enum(['free', 'pro', 'enterprise']).default('free'),
    ssoConfig: z.record(z.any()).optional().nullable()
});

export const userUpdateSchema = z.object({
    name: z.string().min(2).max(255).optional(),
    email: z.string().email().optional(),
    role: z.enum(['Admin', 'Compliance Manager', 'Station Manager', 'Contractor']).optional(),
    region: z.string().max(100).optional().nullable(),
    assignedStationIds: z.array(z.string().cuid()).optional()
});

export const aiPromptSchema = z.object({
    prompt: z.string().min(1).max(10000)
});

export const idParamSchema = z.object({
    id: z.string().cuid()
});

export const tenantCloneSchema = z.object({
    sourceTenantId: z.string().cuid(),
    targetName: z.string().min(1).max(255),
    includeUsers: z.boolean().default(false),
    includeAudits: z.boolean().default(false),
    includeAuditLogs: z.boolean().default(false),
    ownerId: z.string().cuid().optional().nullable()
});

export const tenantImportSchema = z.object({
    importData: z.object({
        metadata: z.object({
            version: z.string(),
            exportedAt: z.string().optional(),
            tenantId: z.string().optional(),
            tenantName: z.string().optional()
        }),
        organization: z.object({
            name: z.string().min(1).max(255),
            ownerId: z.string().cuid(),
            subscriptionPlan: z.string().optional(),
            ssoConfig: z.any().optional()
        }),
        users: z.array(z.any()),
        stations: z.array(z.any()),
        contractors: z.array(z.any())
    }),
    targetTenantId: z.string().cuid().optional().nullable(),
    createNew: z.boolean().default(false),
    dryRun: z.boolean().default(false)
});

export const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const validation = schema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: validation.error.errors
                });
            }
            req.validatedData = validation.data;
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid request data'
            });
        }
    };
};

export const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const validation = schema.safeParse(req.params);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid parameters',
                    details: validation.error.errors
                });
            }
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid parameters'
            });
        }
    };
};

export const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validation = schema.safeParse(req.query);
            if (!validation.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: validation.error.errors
                });
            }
            req.validatedQuery = validation.data;
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid query parameters'
            });
        }
    };
};
