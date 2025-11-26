import { getTestPrisma } from '../helpers/db.helpers.js';

export class TestCleanupManager {
  constructor() {
    this.trackedResources = {
      organizations: [],
      users: [],
      stations: [],
      audits: [],
      incidents: [],
      contractors: [],
      forms: [],
      notifications: [],
      roles: [],
      permissions: [],
    };
  }

  track(resourceType, id) {
    if (this.trackedResources[resourceType]) {
      if (Array.isArray(id)) {
        this.trackedResources[resourceType].push(...id);
      } else {
        this.trackedResources[resourceType].push(id);
      }
    }
  }

  trackMultiple(resources) {
    Object.entries(resources).forEach(([type, ids]) => {
      this.track(type, ids);
    });
  }

  async cleanup() {
    const prisma = getTestPrisma();

    const cleanupOrder = [
      'notifications',
      'incidents',
      'audits',
      'forms',
      'contractors',
      'stations',
      'users',
      'organizations',
      'permissions',
      'roles',
    ];

    for (const resourceType of cleanupOrder) {
      const ids = this.trackedResources[resourceType];
      if (ids && ids.length > 0) {
        try {
          const modelName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1, -1);
          await prisma[resourceType].deleteMany({
            where: { id: { in: ids } }
          });
        } catch (error) {
          console.warn(`Failed to cleanup ${resourceType}:`, error.message);
        }
      }
    }

    this.trackedResources = {
      organizations: [],
      users: [],
      stations: [],
      audits: [],
      incidents: [],
      contractors: [],
      forms: [],
      notifications: [],
      roles: [],
      permissions: [],
    };
  }

  clear() {
    this.trackedResources = {
      organizations: [],
      users: [],
      stations: [],
      audits: [],
      incidents: [],
      contractors: [],
      forms: [],
      notifications: [],
      roles: [],
      permissions: [],
    };
  }
}

export const cleanupTestResources = async (resourceMap) => {
  const prisma = getTestPrisma();

  const cleanupOrder = [
    'notifications',
    'incidents',
    'audits',
    'forms',
    'contractors',
    'stations',
    'users',
    'organizations',
  ];

  for (const resourceType of cleanupOrder) {
    if (resourceMap[resourceType]) {
      const ids = Array.isArray(resourceMap[resourceType]) 
        ? resourceMap[resourceType] 
        : [resourceMap[resourceType]];

      if (ids.length > 0) {
        try {
          await prisma[resourceType].deleteMany({
            where: { id: { in: ids.filter(id => id != null) } }
          });
        } catch (error) {
          console.warn(`Failed to cleanup ${resourceType}:`, error.message);
        }
      }
    }
  }
};

export const createCleanupManager = () => new TestCleanupManager();
