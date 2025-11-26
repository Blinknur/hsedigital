import { authHelpers } from '../helpers/auth.helpers.js';
import { getTestPrisma } from '../helpers/db.helpers.js';

export const seedTestDatabase = async (options = {}) => {
  const prisma = getTestPrisma();
  const {
    organizations = 1,
    usersPerOrg = 2,
    stationsPerOrg = 2,
    auditsPerStation = 1,
    incidentsPerStation = 1,
  } = options;

  const createdData = {
    organizations: [],
    users: [],
    stations: [],
    audits: [],
    incidents: [],
  };

  for (let i = 0; i < organizations; i++) {
    const org = await prisma.organization.create({
      data: {
        name: `Test Org ${i + 1}`,
        slug: `test-org-${Date.now()}-${i}`,
        ownerId: `owner-${Date.now()}-${i}`,
        subscriptionPlan: ['free', 'pro', 'enterprise'][i % 3],
        subscriptionStatus: 'active',
      }
    });
    createdData.organizations.push(org);

    for (let j = 0; j < usersPerOrg; j++) {
      const user = await prisma.user.create({
        data: {
          name: `Test User ${j + 1}`,
          email: `test-user-${Date.now()}-${i}-${j}@example.com`,
          password: await authHelpers.hashPassword('TestPassword123!'),
          role: j === 0 ? 'Admin' : 'Station Manager',
          organizationId: org.id,
          isEmailVerified: true,
        }
      });
      createdData.users.push(user);
    }

    for (let k = 0; k < stationsPerOrg; k++) {
      const station = await prisma.station.create({
        data: {
          name: `Test Station ${k + 1}`,
          brand: 'TestBrand',
          region: 'Test Region',
          address: `${k + 1} Test Street`,
          location: { lat: 0, lng: 0 },
          riskCategory: ['Low', 'Medium', 'High'][k % 3],
          auditFrequency: 'Annually',
          isActive: true,
          organizationId: org.id,
        }
      });
      createdData.stations.push(station);

      if (createdData.users.length > 0) {
        for (let l = 0; l < auditsPerStation; l++) {
          const audit = await prisma.audit.create({
            data: {
              stationId: station.id,
              auditorId: createdData.users[0].id,
              organizationId: org.id,
              scheduledDate: new Date(),
              status: 'Scheduled',
              auditType: 'Regular',
            }
          });
          createdData.audits.push(audit);
        }

        for (let m = 0; m < incidentsPerStation; m++) {
          const incident = await prisma.incident.create({
            data: {
              stationId: station.id,
              reportedById: createdData.users[0].id,
              organizationId: org.id,
              title: `Test Incident ${m + 1}`,
              description: 'Test incident description',
              severity: ['Low', 'Medium', 'High', 'Critical'][m % 4],
              status: 'Open',
              occurredAt: new Date(),
            }
          });
          createdData.incidents.push(incident);
        }
      }
    }
  }

  return createdData;
};

export const seedRBACData = async () => {
  const prisma = getTestPrisma();

  const roles = [
    { name: 'Admin', description: 'Full system access', isSystem: true },
    { name: 'Compliance Manager', description: 'Manage audits and compliance', isSystem: true },
    { name: 'Station Manager', description: 'Manage station operations', isSystem: true },
    { name: 'Contractor', description: 'View assigned work', isSystem: true },
    { name: 'Auditor', description: 'Conduct audits', isSystem: true },
  ];

  const permissions = [
    { resource: 'organizations', action: 'read', description: 'View organizations' },
    { resource: 'organizations', action: 'write', description: 'Create/update organizations' },
    { resource: 'organizations', action: 'delete', description: 'Delete organizations' },
    { resource: 'users', action: 'read', description: 'View users' },
    { resource: 'users', action: 'write', description: 'Create/update users' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'stations', action: 'read', description: 'View stations' },
    { resource: 'stations', action: 'write', description: 'Create/update stations' },
    { resource: 'stations', action: 'delete', description: 'Delete stations' },
    { resource: 'audits', action: 'read', description: 'View audits' },
    { resource: 'audits', action: 'write', description: 'Create/update audits' },
    { resource: 'audits', action: 'conduct', description: 'Conduct audits' },
    { resource: 'incidents', action: 'read', description: 'View incidents' },
    { resource: 'incidents', action: 'write', description: 'Create/update incidents' },
    { resource: 'reports', action: 'read', description: 'View reports' },
    { resource: 'reports', action: 'generate', description: 'Generate reports' },
  ];

  const createdRoles = [];
  const createdPermissions = [];

  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
    createdRoles.push(created);
  }

  for (const permission of permissions) {
    const created = await prisma.permission.upsert({
      where: { resource_action: { resource: permission.resource, action: permission.action } },
      update: permission,
      create: permission,
    });
    createdPermissions.push(created);
  }

  return { roles: createdRoles, permissions: createdPermissions };
};

export const cleanupSeededData = async (createdData) => {
  const prisma = getTestPrisma();

  try {
    if (createdData.incidents) {
      await prisma.incident.deleteMany({
        where: { id: { in: createdData.incidents.map(i => i.id) } }
      });
    }

    if (createdData.audits) {
      await prisma.audit.deleteMany({
        where: { id: { in: createdData.audits.map(a => a.id) } }
      });
    }

    if (createdData.stations) {
      await prisma.station.deleteMany({
        where: { id: { in: createdData.stations.map(s => s.id) } }
      });
    }

    if (createdData.users) {
      await prisma.user.deleteMany({
        where: { id: { in: createdData.users.map(u => u.id) } }
      });
    }

    if (createdData.organizations) {
      await prisma.organization.deleteMany({
        where: { id: { in: createdData.organizations.map(o => o.id) } }
      });
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
};
