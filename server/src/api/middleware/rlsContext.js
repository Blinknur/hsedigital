import prisma from '../../shared/utils/db.js';
import { PrismaClient } from '@prisma/client';

const globalForAdminPrisma = globalThis;

const getAdminPrisma = () => {
    if (!globalForAdminPrisma.adminPrisma) {
        const adminDbUrl = process.env.DATABASE_URL_ADMIN;
        
        if (!adminDbUrl) {
            throw new Error('DATABASE_URL_ADMIN not configured');
        }
        
        globalForAdminPrisma.adminPrisma = new PrismaClient({
            datasources: {
                db: { url: adminDbUrl }
            }
        });
    }
    
    return globalForAdminPrisma.adminPrisma;
};

/**
 * Middleware to set RLS (Row-Level Security) context for tenant isolation
 * This middleware ensures all database queries are automatically filtered by organizationId
 */
export const rlsContext = async (req, res, next) => {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId && req.user?.role !== 'Admin') {
        return res.status(403).json({ 
            error: 'No organization context',
            message: 'User must be associated with an organization or have Admin role'
        });
    }
    
    req.db = {
        transaction: async (callback) => {
            return await prisma.$transaction(async (tx) => {
                if (organizationId) {
                    await tx.$executeRaw`SET LOCAL app.current_organization_id = ${organizationId}`;
                }
                return await callback(tx);
            });
        }
    };
    
    next();
};

/**
 * Helper function to execute queries with RLS context
 * @param {string} organizationId - Organization ID to set as context
 * @param {function} callback - Async function that receives transaction client
 * @returns {Promise} Result of the callback
 */
export const withRlsContext = async (organizationId, callback) => {
    return await prisma.$transaction(async (tx) => {
        if (organizationId) {
            await tx.$executeRaw`SET LOCAL app.current_organization_id = ${organizationId}`;
        }
        return await callback(tx);
    });
};

/**
 * Helper function for admin operations that bypass RLS
 * Requires admin database connection with BYPASSRLS privilege
 * @param {function} callback - Async function that receives Prisma client
 * @returns {Promise} Result of the callback
 */
export const withAdminAccess = async (callback) => {
    const adminPrisma = getAdminPrisma();
    return await callback(adminPrisma);
};

export default { rlsContext, withRlsContext, withAdminAccess };
