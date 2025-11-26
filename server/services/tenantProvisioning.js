import prisma from '../utils/db.js';
import { authService } from './authService.js';
import { emailService } from './emailService.js';

function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function ensureUniqueSlug(baseSlug) {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
        const existing = await prisma.organization.findUnique({
            where: { slug }
        });
        
        if (!existing) {
            return slug;
        }
        
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
}

async function getOrCreateOwnerRole() {
    let ownerRole = await prisma.role.findUnique({
        where: { name: 'Owner' }
    });
    
    if (!ownerRole) {
        ownerRole = await prisma.role.create({
            data: {
                name: 'Owner',
                description: 'Organization owner with full permissions',
                isSystem: true
            }
        });
        
        const allPermissions = await prisma.permission.findMany();
        
        for (const permission of allPermissions) {
            await prisma.rolePermission.create({
                data: {
                    roleId: ownerRole.id,
                    permissionId: permission.id
                }
            });
        }
    }
    
    return ownerRole;
}

async function createDefaultRoles(organizationId) {
    const defaultRoles = [
        {
            name: 'Compliance Manager',
            description: 'Manages compliance activities and audits',
            permissions: [
                { resource: 'organizations', action: 'read' },
                { resource: 'stations', action: 'read' },
                { resource: 'stations', action: 'write' },
                { resource: 'audits', action: 'read' },
                { resource: 'audits', action: 'write' },
                { resource: 'incidents', action: 'read' },
                { resource: 'incidents', action: 'write' },
                { resource: 'contractors', action: 'read' },
                { resource: 'contractors', action: 'write' },
                { resource: 'users', action: 'read' }
            ]
        },
        {
            name: 'Station Manager',
            description: 'Manages station operations',
            permissions: [
                { resource: 'stations', action: 'read' },
                { resource: 'audits', action: 'read' },
                { resource: 'incidents', action: 'read' },
                { resource: 'incidents', action: 'write' }
            ]
        },
        {
            name: 'Contractor',
            description: 'External contractor with limited access',
            permissions: [
                { resource: 'stations', action: 'read' },
                { resource: 'audits', action: 'read' }
            ]
        }
    ];
    
    for (const roleData of defaultRoles) {
        const existingRole = await prisma.role.findUnique({
            where: { name: roleData.name }
        });
        
        if (!existingRole) {
            const role = await prisma.role.create({
                data: {
                    name: roleData.name,
                    description: roleData.description,
                    isSystem: false
                }
            });
            
            for (const permData of roleData.permissions) {
                const permission = await prisma.permission.findUnique({
                    where: {
                        resource_action: {
                            resource: permData.resource,
                            action: permData.action
                        }
                    }
                });
                
                if (permission) {
                    await prisma.rolePermission.create({
                        data: {
                            roleId: role.id,
                            permissionId: permission.id
                        }
                    });
                }
            }
        }
    }
}

async function createDefaultFormTemplates(organizationId) {
    const templates = [
        {
            name: 'Monthly HSE Inspection',
            frequency: 'Monthly',
            schema: {
                sections: [
                    {
                        title: 'Safety Equipment',
                        fields: [
                            { name: 'fire_extinguishers', type: 'checkbox', label: 'Fire extinguishers accessible and serviced' },
                            { name: 'first_aid_kit', type: 'checkbox', label: 'First aid kit stocked and accessible' },
                            { name: 'emergency_exits', type: 'checkbox', label: 'Emergency exits clear and marked' }
                        ]
                    },
                    {
                        title: 'Environmental Compliance',
                        fields: [
                            { name: 'waste_disposal', type: 'checkbox', label: 'Waste disposal procedures followed' },
                            { name: 'spill_kits', type: 'checkbox', label: 'Spill kits available and inspected' }
                        ]
                    }
                ]
            }
        },
        {
            name: 'Quarterly Compliance Audit',
            frequency: 'Quarterly',
            schema: {
                sections: [
                    {
                        title: 'Documentation Review',
                        fields: [
                            { name: 'permits_current', type: 'checkbox', label: 'All permits current and displayed' },
                            { name: 'training_records', type: 'checkbox', label: 'Staff training records up to date' },
                            { name: 'incident_reports', type: 'checkbox', label: 'Incident reports filed and reviewed' }
                        ]
                    }
                ]
            }
        }
    ];
    
    for (const template of templates) {
        await prisma.formDefinition.create({
            data: {
                organizationId,
                name: template.name,
                frequency: template.frequency,
                schema: template.schema
            }
        });
    }
}

async function initializeDefaultSettings(organizationId) {
    await createDefaultRoles(organizationId);
    await createDefaultFormTemplates(organizationId);
}

export async function provisionOrganization({ organizationName, ownerName, ownerEmail, ownerPassword }) {
    return await prisma.$transaction(async (tx) => {
        const hashedPassword = await authService.hashPassword(ownerPassword);
        const emailVerificationToken = authService.generateEmailVerificationToken();
        const emailVerificationExpires = authService.getEmailVerificationExpiry();
        
        const baseSlug = generateSlug(organizationName);
        const slug = await ensureUniqueSlug(baseSlug);
        
        const user = await tx.user.create({
            data: {
                name: ownerName,
                email: ownerEmail,
                password: hashedPassword,
                role: 'Owner',
                isEmailVerified: false,
                emailVerificationToken,
                emailVerificationExpires
            }
        });
        
        const organization = await tx.organization.create({
            data: {
                name: organizationName,
                slug,
                ownerId: user.id,
                subscriptionPlan: 'free'
            }
        });
        
        await tx.user.update({
            where: { id: user.id },
            data: { organizationId: organization.id }
        });
        
        let ownerRole = await tx.role.findUnique({
            where: { name: 'Owner' }
        });
        
        if (!ownerRole) {
            ownerRole = await tx.role.create({
                data: {
                    name: 'Owner',
                    description: 'Organization owner with full permissions',
                    isSystem: true
                }
            });
            
            const allPermissions = await tx.permission.findMany();
            
            for (const permission of allPermissions) {
                await tx.rolePermission.create({
                    data: {
                        roleId: ownerRole.id,
                        permissionId: permission.id
                    }
                });
            }
        }
        
        await tx.userRole.create({
            data: {
                userId: user.id,
                roleId: ownerRole.id
            }
        });
        
        const tokens = authService.generateTokens(user);
        await authService.storeRefreshToken(tx, user.id, tokens.refreshToken);
        
        await emailService.sendVerificationEmail(ownerEmail, emailVerificationToken);
        
        await initializeDefaultSettings(organization.id);
        
        const { password: _, emailVerificationToken: __, refreshTokens: ___, ...userInfo } = user;
        const { ownerId: ____, ...orgInfo } = organization;
        
        return {
            organization: orgInfo,
            user: userInfo,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    });
}

class TenantProvisioningService {
    async createTenant({ name, ownerId, subscriptionPlan = 'free', ssoConfig = null }) {
        try {
            const baseSlug = generateSlug(name);
            const slug = await ensureUniqueSlug(baseSlug);
            
            const organization = await prisma.organization.create({
                data: {
                    name,
                    slug,
                    ownerId,
                    subscriptionPlan,
                    ssoConfig
                }
            });

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

    async provisionCompleteTenant({ organization, owner, users = [], stations = [] }) {
        try {
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

            const newOrg = await this.createTenant({
                name: organization.name,
                ownerId: ownerUser.id,
                subscriptionPlan: organization.subscriptionPlan || 'free',
                ssoConfig: organization.ssoConfig || null
            });

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

    async deactivateTenant(organizationId) {
        try {
            await prisma.station.updateMany({
                where: { organizationId },
                data: { isActive: false }
            });
            
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
