
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const MOCK_ORGANIZATIONS = [
    { id: 'org-1', name: 'Total Parco Pakistan', ownerId: 'user-cm-1', subscriptionPlan: 'enterprise', ssoConfig: JSON.stringify({ enabled: true, domain: 'totalparco.com' }) },
    { id: 'org-2', name: 'Shell Pakistan Ltd', ownerId: 'user-cm-2', subscriptionPlan: 'pro' },
    { id: 'org-3', name: 'PSO Franchise Group', ownerId: 'user-cm-3', subscriptionPlan: 'free' }
];

const MOCK_USERS = [
    { id: 'user-admin-1', name: 'Aamir Khan', email: 'aamir.khan@saas-admin.com', role: 'Admin', password: 'Password123!', isEmailVerified: true },
    { id: 'user-cm-1', name: 'Bilal Ahmed', email: 'bilal.ahmed@totalparco.com', role: 'Compliance Manager', organizationId: 'org-1', region: 'South', assignedStationIds: JSON.stringify(['station-tp-1', 'station-tp-2']), password: 'Password123!', isEmailVerified: true },
    { id: 'user-sm-7', name: 'Imad Wasim', email: 'imad.wasim@totalparco-s1.com', role: 'Station Manager', organizationId: 'org-1', assignedStationIds: JSON.stringify(['station-tp-1']), password: 'Password123!', isEmailVerified: true},
    { id: 'user-sm-4', name: 'Maryam Choudhry', email: 'maryam.c@totalparco-s2.com', role: 'Station Manager', organizationId: 'org-1', assignedStationIds: JSON.stringify(['station-tp-2']), password: 'Password123!', isEmailVerified: true },
    { id: 'user-cont-1', name: 'Rashid Minhas', email: 'rashid@volttech.pk', role: 'Contractor', organizationId: 'org-1', contractorId: 'cont-1', password: 'Password123!', isEmailVerified: true },
    { id: 'user-cm-2', name: 'Usman Malik', email: 'usman.malik@shell.com.pk', role: 'Compliance Manager', organizationId: 'org-2', region: 'Punjab', assignedStationIds: JSON.stringify(['station-sh-1', 'station-sh-2']), password: 'Password123!', isEmailVerified: true },
    { id: 'user-sm-2', name: 'Zainab Hasan', email: 'zainab.hasan@shell-dha.com', role: 'Station Manager', organizationId: 'org-2', assignedStationIds: JSON.stringify(['station-sh-1']), password: 'Password123!', isEmailVerified: true },
    { id: 'user-cm-3', name: 'Iqbal Qasim', email: 'iqbal.qasim@psogroup.com', role: 'Compliance Manager', organizationId: 'org-3', region: 'North', assignedStationIds: JSON.stringify(['station-pso-1', 'station-pso-2']), password: 'Password123!', isEmailVerified: true},
    { id: 'user-sm-3', name: 'Ali Raza', email: 'ali.raza@pso-gulberg.com', role: 'Station Manager', organizationId: 'org-3', assignedStationIds: JSON.stringify(['station-pso-1']), password: 'Password123!', isEmailVerified: true },
];

const MOCK_STATIONS = [
    { id: 'station-tp-1', organizationId: 'org-1', name: 'Total Parco F-8 Markaz', brand: 'Total Parco', region: 'Islamabad', address: 'F-8 Markaz, Islamabad', location: JSON.stringify({lat: 33.710, lon: 73.036}), riskCategory: 'Low', auditFrequency: 'Annually', isActive: true },
    { id: 'station-tp-2', organizationId: 'org-1', name: 'Total Parco Model Town', brand: 'Total Parco', region: 'Lahore', address: 'Model Town Link Rd, Lahore', location: JSON.stringify({ lat: 31.4725, lon: 74.3245 }), riskCategory: 'Low', auditFrequency: 'Annually', isActive: true },
    { id: 'station-sh-1', organizationId: 'org-2', name: 'Shell DHA Service Station', brand: 'Shell', region: 'Karachi', address: 'Phase 5, DHA, Karachi', location: JSON.stringify({ lat: 24.8146, lon: 67.0628 }), riskCategory: 'Medium', auditFrequency: 'Semi-Annually', isActive: true },
    { id: 'station-sh-2', organizationId: 'org-2', name: 'Shell Hayatabad', brand: 'Shell', region: 'Peshawar', address: 'Phase 3, Hayatabad, Peshawar', location: JSON.stringify({lat: 33.987, lon: 71.439}), riskCategory: 'Medium', auditFrequency: 'Semi-Annually', isActive: true },
    { id: 'station-pso-1', organizationId: 'org-3', name: 'PSO Gulberg Fuel Point', brand: 'PSO', region: 'Lahore', address: 'Main Boulevard, Gulberg, Lahore', location: JSON.stringify({ lat: 31.5204, lon: 74.3587 }), riskCategory: 'Medium', auditFrequency: 'Semi-Annually', isActive: true },
    { id: 'station-pso-2', organizationId: 'org-3', name: 'PSO Jinnah Road', brand: 'PSO', region: 'Quetta', address: 'Jinnah Road, Quetta', location: JSON.stringify({lat: 30.191, lon: 67.008}), riskCategory: 'High', auditFrequency: 'Quarterly', isActive: true },
];

const MOCK_CONTRACTORS = [
    { id: 'cont-1', organizationId: 'org-1', name: 'VoltTech Solutions', licenseNumber: 'EL-9921', specialization: 'Electrical', contactPerson: 'Rashid Minhas', email: 'info@volttech.pk', status: 'Active' },
    { id: 'cont-2', organizationId: 'org-1', name: 'CivilStruct Builders', licenseNumber: 'CV-4432', specialization: 'Civil', contactPerson: 'Tariq Jamil', email: 'contact@civilstruct.com', status: 'Active' },
    { id: 'cont-3', organizationId: 'org-2', name: 'SecureWeld Engineering', licenseNumber: 'ME-1122', specialization: 'Mechanical/Welding', contactPerson: 'Kamran Akmal', email: 'kamran@secureweld.com', status: 'Active' },
];

const MOCK_FORMS = [
    {
        id: 'form-daily-1',
        organizationId: 'org-1',
        name: 'Daily Forecourt Checklist',
        frequency: 'Daily',
        schema: JSON.stringify({
            components: [
                { type: 'header', label: 'Fuel Operations', key: 'header1' },
                { label: 'Check for fuel spills/leaks around pumps', type: 'radio', key: 'fuelSpills', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { label: 'Verify dispenser nozzles in good condition', type: 'radio', key: 'dispenserCondition', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { type: 'button', label: 'Submit', action: 'submit', key: 'submit' }
            ]
        })
    }
];

const RBAC_ROLES = [
    { id: 'role-admin', name: 'Admin', description: 'Full system access', isSystem: true },
    { id: 'role-compliance-manager', name: 'Compliance Manager', description: 'Manage audits and compliance across stations', isSystem: true },
    { id: 'role-station-manager', name: 'Station Manager', description: 'Manage station operations and incidents', isSystem: true },
    { id: 'role-contractor', name: 'Contractor', description: 'View assigned work and submit reports', isSystem: true },
    { id: 'role-auditor', name: 'Auditor', description: 'Conduct audits and generate reports', isSystem: true },
];

const RBAC_PERMISSIONS = [
    { id: 'perm-1', resource: 'organizations', action: 'read', description: 'View organizations' },
    { id: 'perm-2', resource: 'organizations', action: 'write', description: 'Create/update organizations' },
    { id: 'perm-3', resource: 'organizations', action: 'delete', description: 'Delete organizations' },
    { id: 'perm-4', resource: 'users', action: 'read', description: 'View users' },
    { id: 'perm-5', resource: 'users', action: 'write', description: 'Create/update users' },
    { id: 'perm-6', resource: 'users', action: 'delete', description: 'Delete users' },
    { id: 'perm-7', resource: 'stations', action: 'read', description: 'View stations' },
    { id: 'perm-8', resource: 'stations', action: 'write', description: 'Create/update stations' },
    { id: 'perm-9', resource: 'stations', action: 'delete', description: 'Delete stations' },
    { id: 'perm-10', resource: 'audits', action: 'read', description: 'View audits' },
    { id: 'perm-11', resource: 'audits', action: 'write', description: 'Create/update audits' },
    { id: 'perm-12', resource: 'audits', action: 'delete', description: 'Delete audits' },
    { id: 'perm-13', resource: 'audits', action: 'conduct', description: 'Conduct audits' },
    { id: 'perm-14', resource: 'incidents', action: 'read', description: 'View incidents' },
    { id: 'perm-15', resource: 'incidents', action: 'write', description: 'Create/update incidents' },
    { id: 'perm-16', resource: 'incidents', action: 'delete', description: 'Delete incidents' },
    { id: 'perm-17', resource: 'contractors', action: 'read', description: 'View contractors' },
    { id: 'perm-18', resource: 'contractors', action: 'write', description: 'Create/update contractors' },
    { id: 'perm-19', resource: 'contractors', action: 'delete', description: 'Delete contractors' },
    { id: 'perm-20', resource: 'forms', action: 'read', description: 'View forms' },
    { id: 'perm-21', resource: 'forms', action: 'write', description: 'Create/update forms' },
    { id: 'perm-22', resource: 'forms', action: 'delete', description: 'Delete forms' },
    { id: 'perm-23', resource: 'reports', action: 'read', description: 'View reports' },
    { id: 'perm-24', resource: 'reports', action: 'generate', description: 'Generate reports' },
];

const RBAC_ROLE_PERMISSIONS = {
    'role-admin': ['perm-1', 'perm-2', 'perm-3', 'perm-4', 'perm-5', 'perm-6', 'perm-7', 'perm-8', 'perm-9', 'perm-10', 'perm-11', 'perm-12', 'perm-13', 'perm-14', 'perm-15', 'perm-16', 'perm-17', 'perm-18', 'perm-19', 'perm-20', 'perm-21', 'perm-22', 'perm-23', 'perm-24'],
    'role-compliance-manager': ['perm-1', 'perm-4', 'perm-7', 'perm-8', 'perm-10', 'perm-11', 'perm-13', 'perm-14', 'perm-15', 'perm-17', 'perm-20', 'perm-23', 'perm-24'],
    'role-station-manager': ['perm-7', 'perm-10', 'perm-14', 'perm-15', 'perm-17', 'perm-20', 'perm-23'],
    'role-contractor': ['perm-7', 'perm-10', 'perm-14', 'perm-17', 'perm-20'],
    'role-auditor': ['perm-7', 'perm-10', 'perm-11', 'perm-13', 'perm-14', 'perm-20', 'perm-23', 'perm-24'],
};

const USER_ROLES = [
    { userId: 'user-admin-1', roleId: 'role-admin' },
    { userId: 'user-cm-1', roleId: 'role-compliance-manager' },
    { userId: 'user-cm-2', roleId: 'role-compliance-manager' },
    { userId: 'user-cm-3', roleId: 'role-compliance-manager' },
    { userId: 'user-sm-7', roleId: 'role-station-manager' },
    { userId: 'user-sm-4', roleId: 'role-station-manager' },
    { userId: 'user-sm-2', roleId: 'role-station-manager' },
    { userId: 'user-sm-3', roleId: 'role-station-manager' },
    { userId: 'user-cont-1', roleId: 'role-contractor' },
];

async function main() {
  console.log('Start seeding ...');

  // 1. Organizations
  for (const org of MOCK_ORGANIZATIONS) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: {},
      create: org,
    });
  }
  
  // 2. Stations
  for (const station of MOCK_STATIONS) {
      await prisma.station.upsert({
          where: { id: station.id },
          update: {},
          create: station,
      });
  }

  // 3. Contractors
  for (const cont of MOCK_CONTRACTORS) {
      await prisma.contractor.upsert({
          where: { id: cont.id },
          update: {},
          create: cont,
      });
  }

  // 4. Users
  for (const user of MOCK_USERS) {
      const hashedPassword = await hashPassword(user.password);
      await prisma.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
              ...user,
              password: hashedPassword
          },
      });
  }

  // 5. Forms
  for (const form of MOCK_FORMS) {
      await prisma.formDefinition.upsert({
          where: { id: form.id },
          update: {},
          create: form,
      });
  }

  // 6. RBAC - Roles
  for (const role of RBAC_ROLES) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }

  // 7. RBAC - Permissions
  for (const perm of RBAC_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { id: perm.id },
      update: {},
      create: perm,
    });
  }

  // 8. RBAC - Role-Permission mappings
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
    }
  }

  // 9. RBAC - User-Role assignments
  for (const userRole of USER_ROLES) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: userRole.userId,
          roleId: userRole.roleId
        }
      },
      update: {},
      create: userRole
    });
  }

  console.log('Seeding finished.');
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
