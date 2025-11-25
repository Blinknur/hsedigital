import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const RBAC_ROLES = [
    { 
        id: 'role-admin', 
        name: 'Admin', 
        description: 'Full system access across all organizations and resources', 
        isSystem: true 
    },
    { 
        id: 'role-compliance-manager', 
        name: 'Compliance Manager', 
        description: 'Manage audits, compliance, and oversight across assigned stations within organization', 
        isSystem: true 
    },
    { 
        id: 'role-station-manager', 
        name: 'Station Manager', 
        description: 'Manage daily operations, incidents, and compliance for assigned stations', 
        isSystem: true 
    },
    { 
        id: 'role-contractor', 
        name: 'Contractor', 
        description: 'View assigned work orders, submit reports, and access relevant documentation', 
        isSystem: true 
    },
    { 
        id: 'role-auditor', 
        name: 'Auditor', 
        description: 'Conduct audits, generate reports, and review compliance status', 
        isSystem: true 
    },
    { 
        id: 'role-viewer', 
        name: 'Viewer', 
        description: 'Read-only access to organizational data and reports', 
        isSystem: true 
    },
];

const RBAC_PERMISSIONS = [
    // Organizations
    { id: 'perm-org-read', resource: 'organizations', action: 'read', description: 'View organization details' },
    { id: 'perm-org-write', resource: 'organizations', action: 'write', description: 'Create and update organizations' },
    { id: 'perm-org-delete', resource: 'organizations', action: 'delete', description: 'Delete organizations' },
    { id: 'perm-org-manage', resource: 'organizations', action: 'manage', description: 'Full organization management including settings' },
    
    // Users
    { id: 'perm-user-read', resource: 'users', action: 'read', description: 'View user profiles and lists' },
    { id: 'perm-user-write', resource: 'users', action: 'write', description: 'Create and update users' },
    { id: 'perm-user-delete', resource: 'users', action: 'delete', description: 'Delete user accounts' },
    { id: 'perm-user-manage-roles', resource: 'users', action: 'manage-roles', description: 'Assign and modify user roles' },
    
    // Stations
    { id: 'perm-station-read', resource: 'stations', action: 'read', description: 'View station information' },
    { id: 'perm-station-write', resource: 'stations', action: 'write', description: 'Create and update stations' },
    { id: 'perm-station-delete', resource: 'stations', action: 'delete', description: 'Delete stations' },
    
    // Audits
    { id: 'perm-audit-read', resource: 'audits', action: 'read', description: 'View audit records and results' },
    { id: 'perm-audit-write', resource: 'audits', action: 'write', description: 'Schedule and update audits' },
    { id: 'perm-audit-delete', resource: 'audits', action: 'delete', description: 'Delete audit records' },
    { id: 'perm-audit-conduct', resource: 'audits', action: 'conduct', description: 'Perform audits and submit findings' },
    { id: 'perm-audit-approve', resource: 'audits', action: 'approve', description: 'Approve and finalize audit results' },
    
    // Incidents
    { id: 'perm-incident-read', resource: 'incidents', action: 'read', description: 'View incident reports' },
    { id: 'perm-incident-write', resource: 'incidents', action: 'write', description: 'Create and update incidents' },
    { id: 'perm-incident-delete', resource: 'incidents', action: 'delete', description: 'Delete incident records' },
    { id: 'perm-incident-resolve', resource: 'incidents', action: 'resolve', description: 'Mark incidents as resolved' },
    
    // Contractors
    { id: 'perm-contractor-read', resource: 'contractors', action: 'read', description: 'View contractor information' },
    { id: 'perm-contractor-write', resource: 'contractors', action: 'write', description: 'Create and update contractors' },
    { id: 'perm-contractor-delete', resource: 'contractors', action: 'delete', description: 'Delete contractor records' },
    
    // Forms
    { id: 'perm-form-read', resource: 'forms', action: 'read', description: 'View form definitions and submissions' },
    { id: 'perm-form-write', resource: 'forms', action: 'write', description: 'Create and modify form templates' },
    { id: 'perm-form-delete', resource: 'forms', action: 'delete', description: 'Delete form definitions' },
    { id: 'perm-form-submit', resource: 'forms', action: 'submit', description: 'Submit form responses' },
    
    // Work Permits
    { id: 'perm-permit-read', resource: 'work-permits', action: 'read', description: 'View work permits' },
    { id: 'perm-permit-write', resource: 'work-permits', action: 'write', description: 'Create and update work permits' },
    { id: 'perm-permit-delete', resource: 'work-permits', action: 'delete', description: 'Delete work permits' },
    { id: 'perm-permit-approve', resource: 'work-permits', action: 'approve', description: 'Approve work permit requests' },
    
    // Reports
    { id: 'perm-report-read', resource: 'reports', action: 'read', description: 'View generated reports' },
    { id: 'perm-report-generate', resource: 'reports', action: 'generate', description: 'Generate custom reports' },
    { id: 'perm-report-export', resource: 'reports', action: 'export', description: 'Export reports in various formats' },
    
    // Analytics
    { id: 'perm-analytics-read', resource: 'analytics', action: 'read', description: 'View analytics dashboards' },
    { id: 'perm-analytics-advanced', resource: 'analytics', action: 'advanced', description: 'Access advanced analytics features' },
    
    // Audit Logs
    { id: 'perm-audit-logs-read', resource: 'audit_logs', action: 'read', description: 'View system audit logs' },
];

const RBAC_ROLE_PERMISSIONS = {
    'role-admin': [
        'perm-org-read', 'perm-org-write', 'perm-org-delete', 'perm-org-manage',
        'perm-user-read', 'perm-user-write', 'perm-user-delete', 'perm-user-manage-roles',
        'perm-station-read', 'perm-station-write', 'perm-station-delete',
        'perm-audit-read', 'perm-audit-write', 'perm-audit-delete', 'perm-audit-conduct', 'perm-audit-approve',
        'perm-incident-read', 'perm-incident-write', 'perm-incident-delete', 'perm-incident-resolve',
        'perm-contractor-read', 'perm-contractor-write', 'perm-contractor-delete',
        'perm-form-read', 'perm-form-write', 'perm-form-delete', 'perm-form-submit',
        'perm-permit-read', 'perm-permit-write', 'perm-permit-delete', 'perm-permit-approve',
        'perm-report-read', 'perm-report-generate', 'perm-report-export',
        'perm-analytics-read', 'perm-analytics-advanced',
        'perm-audit-logs-read'
    ],
    'role-compliance-manager': [
        'perm-org-read',
        'perm-user-read',
        'perm-station-read', 'perm-station-write',
        'perm-audit-read', 'perm-audit-write', 'perm-audit-conduct', 'perm-audit-approve',
        'perm-incident-read', 'perm-incident-write', 'perm-incident-resolve',
        'perm-contractor-read', 'perm-contractor-write',
        'perm-form-read', 'perm-form-write', 'perm-form-submit',
        'perm-permit-read', 'perm-permit-approve',
        'perm-report-read', 'perm-report-generate', 'perm-report-export',
        'perm-analytics-read', 'perm-analytics-advanced',
        'perm-audit-logs-read'
    ],
    'role-station-manager': [
        'perm-station-read',
        'perm-audit-read',
        'perm-incident-read', 'perm-incident-write', 'perm-incident-resolve',
        'perm-contractor-read',
        'perm-form-read', 'perm-form-submit',
        'perm-permit-read', 'perm-permit-write',
        'perm-report-read',
        'perm-analytics-read'
    ],
    'role-contractor': [
        'perm-station-read',
        'perm-audit-read',
        'perm-incident-read',
        'perm-contractor-read',
        'perm-form-read', 'perm-form-submit',
        'perm-permit-read'
    ],
    'role-auditor': [
        'perm-station-read',
        'perm-audit-read', 'perm-audit-conduct',
        'perm-incident-read',
        'perm-contractor-read',
        'perm-form-read', 'perm-form-submit',
        'perm-report-read', 'perm-report-generate',
        'perm-analytics-read'
    ],
    'role-viewer': [
        'perm-org-read',
        'perm-user-read',
        'perm-station-read',
        'perm-audit-read',
        'perm-incident-read',
        'perm-contractor-read',
        'perm-form-read',
        'perm-permit-read',
        'perm-report-read',
        'perm-analytics-read'
    ]
};

async function seedRBACSystem() {
    console.log('🔐 Seeding RBAC system...');

    // 1. Seed Roles
    console.log('  → Creating roles...');
    for (const role of RBAC_ROLES) {
        await prisma.role.upsert({
            where: { id: role.id },
            update: {
                name: role.name,
                description: role.description,
                isSystem: role.isSystem
            },
            create: role,
        });
    }
    console.log(`  ✓ Created ${RBAC_ROLES.length} roles`);

    // 2. Seed Permissions
    console.log('  → Creating permissions...');
    for (const perm of RBAC_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { id: perm.id },
            update: {
                resource: perm.resource,
                action: perm.action,
                description: perm.description
            },
            create: perm,
        });
    }
    console.log(`  ✓ Created ${RBAC_PERMISSIONS.length} permissions`);

    // 3. Seed Role-Permission mappings
    console.log('  → Mapping permissions to roles...');
    let mappingCount = 0;
    for (const [roleId, permissionIds] of Object.entries(RBAC_ROLE_PERMISSIONS)) {
        for (const permissionId of permissionIds) {
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId,
                        permissionId
                    }
                },
                update: {},
                create: {
                    roleId,
                    permissionId
                }
            });
            mappingCount++;
        }
    }
    console.log(`  ✓ Created ${mappingCount} role-permission mappings`);
}

async function main() {
    console.log('🌱 Starting comprehensive seed...\n');

    try {
        await seedRBACSystem();
        
        console.log('\n✅ Seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   Roles: ${RBAC_ROLES.length}`);
        console.log(`   Permissions: ${RBAC_PERMISSIONS.length}`);
        console.log(`   Role-Permission Mappings: ${Object.values(RBAC_ROLE_PERMISSIONS).flat().length}`);
        
    } catch (error) {
        console.error('\n❌ Error during seeding:', error);
        throw error;
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
