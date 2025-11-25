import { PrismaClient } from '@prisma/client';
import { tenantLogger } from './tenantLogger.js';

const TENANT_MODELS = [
    'station',
    'contractor',
    'audit',
    'formDefinition',
    'incident',
    'workPermit'
];

function shouldEnforceOrganizationId(model) {
    return TENANT_MODELS.includes(model);
}

export const prisma = new PrismaClient().$extends({
    query: {
        $allModels: {
            async create({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        const error = new Error(`Tenant isolation violation: CREATE on ${model} without organizationId`);
                        error.statusCode = 403;
                        throw error;
                    }

                    args.data = {
                        ...args.data,
                        organizationId
                    };

                    tenantLogger.logTenantInjection(organizationId, 'CREATE', model);
                }

                return query(args);
            },

            async findMany({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        tenantLogger.logTenantQueryBlock('unknown', null, 'FIND_MANY', model);
                        return [];
                    }

                    args.where = {
                        ...args.where,
                        organizationId
                    };
                }

                return query(args);
            },

            async findFirst({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        tenantLogger.logTenantQueryBlock('unknown', null, 'FIND_FIRST', model);
                        return null;
                    }

                    args.where = {
                        ...args.where,
                        organizationId
                    };
                }

                return query(args);
            },

            async findUnique({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        tenantLogger.logTenantQueryBlock('unknown', null, 'FIND_UNIQUE', model);
                        return null;
                    }

                    args.where = {
                        ...args.where,
                        organizationId
                    };
                }

                return query(args);
            },

            async update({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        const error = new Error(`Tenant isolation violation: UPDATE on ${model} without organizationId`);
                        error.statusCode = 403;
                        throw error;
                    }

                    args.where = {
                        ...args.where,
                        organizationId
                    };
                }

                return query(args);
            },

            async updateMany({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        const error = new Error(`Tenant isolation violation: UPDATE_MANY on ${model} without organizationId`);
                        error.statusCode = 403;
                        throw error;
                    }

                    args.where = {
                        ...args.where,
                        organizationId
                    };
                }

                return query(args);
            },

            async delete({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        const error = new Error(`Tenant isolation violation: DELETE on ${model} without organizationId`);
                        error.statusCode = 403;
                        throw error;
                    }

                    args.where = {
                        ...args.where,
                        organizationId
                    };
                }

                return query(args);
            },

            async deleteMany({ model, args, query }) {
                if (shouldEnforceOrganizationId(model)) {
                    const organizationId = global.currentTenantId;
                    
                    if (!organizationId) {
                        const error = new Error(`Tenant isolation violation: DELETE_MANY on ${model} without organizationId`);
                        error.statusCode = 403;
                        throw error;
                    }

                    args.where = {
                        ...args.where,
                        organizationId
                    };
                }

                return query(args);
            }
        }
    }
});

export function setTenantContext(organizationId) {
    global.currentTenantId = organizationId;
}

export function clearTenantContext() {
    global.currentTenantId = null;
}

export function getTenantContext() {
    return global.currentTenantId;
}
