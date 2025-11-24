import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Tenant Provisioning Service
 * Handles creation, configuration, and management of tenant organizations
 */
class TenantProvisioningService {
    /**
     * Create a new tenant organization with initial setup
     * @param {Object} tenantData - Organization data
     * @param {string} tenantData.name - Organization name
     * @param {string} tenantData.ownerId - Owner user ID
     * @param {string} tenantData.subscriptionPlan - Subscription plan (free, pro, enterprise)
     * @param {Object} tenantData.ssoConfig - Optional SSO configuration
     * @returns {Promise<Object>} Created organization
     */
    async createTenant({ name, ownerId, subscriptionPlan = 'free', ssoConfig = null }) {
        try {
            // Create organization
            const organization = await prisma.organization.create({
                data: {
                    name,
                    ownerId,
                    subscriptionPlan,
                    ssoConfig
                }
            });

            // Update owner user with organizationId
            await prisma.user.update({
                where: { id: ownerId },
                data: { organizationId: organization.id }
            });

            console.log(`✅ Tenant created: ${organization.name} (${organization.id})`);
            return organization;
        } catch (error) {
            console.error('❌ Tenant creation failed:', error);
            throw new Error(`Failed to create tenant: ${error.message}`);
        }
    }

    /**
     * Provision a complete tenant with initial data
     * @param {Object} config - Complete tenant configuration
     * @param {Object} config.organization - Organization data
     * @param {Object} config.owner - Owner user data
     * @param {Array} config.users - Additional users to create
     * @param {Array} config.stations - Initial stations
     * @returns {Promise<Object>} Provisioned tenant data
     */
    async provisionCompleteTenant({ organization, owner, users = [], stations = [] }) {
        try {
            // 1. Create owner user first (if not exists)
            let ownerUser;
            const existingOwner = await prisma.user.findUnique({
                where: { email: owner.email }
            });

            if (existingOwner) {
                ownerUser = existingOwner;
            } else {
                ownerUser = await prisma.user.create({
                    data: {
                        ...owner,
                        role: owner.role || 'Compliance Manager'
                    }
                });
            }

            // 2. Create organization
            const newOrg = await this.createTenant({
                name: organization.name,
                ownerId: ownerUser.id,
                subscriptionPlan: organization.subscriptionPlan || 'free',
                ssoConfig: organization.ssoConfig || null
            });

            // 3. Create additional users
            const createdUsers = [];
            for (const userData of users) {
                const user = await prisma.user.create({
                    data: {
                        ...userData,
                        organizationId: newOrg.id
                    }
                });
                createdUsers.push(user);
            }

            // 4. Create stations
            const createdStations = [];
            for (const stationData of stations) {
                const station = await prisma.station.create({
                    data: {
                        ...stationData,
                        organizationId: newOrg.id
                    }
                });
                createdStations.push(station);
            }

            console.log(`✅ Complete tenant provisioned: ${newOrg.name}`);
            console.log(`   - Users: ${createdUsers.length + 1} (including owner)`);
            console.log(`   - Stations: ${createdStations.length}`);

            return {
                organization: newOrg,
                owner: ownerUser,
                users: createdUsers,
                stations: createdStations
            };
        } catch (error) {
            console.error('❌ Complete tenant provisioning failed:', error);
            throw new Error(`Failed to provision tenant: ${error.message}`);
        }
    }

    /**
     * Update tenant subscription plan
     * @param {string} organizationId - Organization ID
     * @param {string} newPlan - New subscription plan
     * @returns {Promise<Object>} Updated organization
     */
    async updateSubscription(organizationId, newPlan) {
        try {
            const organization = await prisma.organization.update({
                where: { id: organizationId },
                data: { subscriptionPlan: newPlan }
            });

            console.log(`✅ Subscription updated for ${organization.name}: ${newPlan}`);
            return organization;
        } catch (error) {
            console.error('❌ Subscription update failed:', error);
            throw new Error(`Failed to update subscription: ${error.message}`);
        }
    }

    /**
     * Configure SSO for tenant
     * @param {string} organizationId - Organization ID
     * @param {Object} ssoConfig - SSO configuration
     * @returns {Promise<Object>} Updated organization
     */
    async configureSso(organizationId, ssoConfig) {
        try {
            const organization = await prisma.organization.update({
                where: { id: organizationId },
                data: { ssoConfig }
            });

            console.log(`✅ SSO configured for ${organization.name}`);
            return organization;
        } catch (error) {
            console.error('❌ SSO configuration failed:', error);
            throw new Error(`Failed to configure SSO: ${error.message}`);
        }
    }

    /**
     * Deactivate tenant (soft delete)
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Object>} Deactivated organization
     */
    async deactivateTenant(organizationId) {
        try {
            // Deactivate all stations
            await prisma.station.updateMany({
                where: { organizationId },
                data: { isActive: false }
            });

            // Could add more cleanup here (e.g., cancel subscriptions, archive data)
            
            const organization = await prisma.organization.findUnique({
                where: { id: organizationId }
            });

            console.log(`✅ Tenant deactivated: ${organization.name}`);
            return organization;
        } catch (error) {
            console.error('❌ Tenant deactivation failed:', error);
            throw new Error(`Failed to deactivate tenant: ${error.message}`);
        }
    }

    /**
     * Get tenant statistics
     * @param {string} organizationId - Organization ID
     * @returns {Promise<Object>} Tenant statistics
     */
    async getTenantStats(organizationId) {
        try {
            const [userCount, stationCount, auditCount, incidentCount] = await Promise.all([
                prisma.user.count({ where: { organizationId } }),
                prisma.station.count({ where: { organizationId } }),
                prisma.audit.count({ where: { organizationId } }),
                prisma.incident.count({ where: { organizationId } })
            ]);

            return {
                users: userCount,
                stations: stationCount,
                audits: auditCount,
                incidents: incidentCount
            };
        } catch (error) {
            console.error('❌ Failed to get tenant stats:', error);
            throw new Error(`Failed to get tenant stats: ${error.message}`);
        }
    }

    /**
     * List all tenants with optional filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} List of organizations
     */
    async listTenants(filters = {}) {
        try {
            const where = {};
            if (filters.subscriptionPlan) {
                where.subscriptionPlan = filters.subscriptionPlan;
            }

            const organizations = await prisma.organization.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            users: true,
                            stations: true,
                            audits: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return organizations;
        } catch (error) {
            console.error('❌ Failed to list tenants:', error);
            throw new Error(`Failed to list tenants: ${error.message}`);
        }
    }
}

export default new TenantProvisioningService();
