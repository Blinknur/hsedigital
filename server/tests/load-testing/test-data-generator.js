import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export class TestDataGenerator {
  constructor(volumeType = 'medium') {
    this.volumes = {
      small: { stations: 10, audits: 50, incidents: 20, users: 5, contractors: 5 },
      medium: { stations: 100, audits: 500, incidents: 200, users: 50, contractors: 20 },
      large: { stations: 1000, audits: 5000, incidents: 2000, users: 500, contractors: 100 }
    };
    this.volumeType = volumeType;
    this.data = this.volumes[volumeType];
  }

  async createTestOrganization(index) {
    const slug = `load-test-org-${index}-${Date.now()}`;
    const org = await prisma.organization.create({
      data: {
        name: `Load Test Org ${index}`,
        slug,
        ownerId: 'system',
        subscriptionPlan: index % 3 === 0 ? 'enterprise' : index % 2 === 0 ? 'professional' : 'free'
      }
    });
    return org;
  }

  async createTestUsers(organizationId, count) {
    const users = [];
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    for (let i = 0; i < count; i++) {
      const user = await prisma.user.create({
        data: {
          name: `Test User ${i}`,
          email: `testuser${i}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
          password: hashedPassword,
          role: i === 0 ? 'Admin' : i % 3 === 0 ? 'Manager' : 'User',
          organizationId,
          region: ['North', 'South', 'East', 'West'][i % 4],
          isEmailVerified: true
        }
      });
      users.push(user);
    }
    return users;
  }

  async createTestStations(organizationId, count) {
    const stations = [];
    const brands = ['Shell', 'BP', 'Esso', 'Total', 'Chevron'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const riskCategories = ['Low', 'Medium', 'High'];
    
    for (let i = 0; i < count; i++) {
      const station = await prisma.station.create({
        data: {
          name: `Test Station ${i}`,
          brand: brands[i % brands.length],
          region: regions[i % regions.length],
          address: `${i} Test Street, Test City`,
          location: { lat: 51.5074 + (i * 0.001), lng: -0.1278 + (i * 0.001) },
          riskCategory: riskCategories[i % riskCategories.length],
          auditFrequency: i % 2 === 0 ? 'Quarterly' : 'Annually',
          isActive: true,
          organizationId
        }
      });
      stations.push(station);
    }
    return stations;
  }

  async createTestAudits(organizationId, stationIds, userIds, count) {
    const audits = [];
    const statuses = ['Scheduled', 'In Progress', 'Completed'];
    
    for (let i = 0; i < count; i++) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (i % 30));
      
      const audit = await prisma.audit.create({
        data: {
          auditNumber: `AUD-LOAD-${Date.now()}-${i}`,
          scheduledDate,
          completedDate: i % 3 === 0 ? new Date() : null,
          formId: `form-${i % 5}`,
          status: statuses[i % statuses.length],
          findings: { items: [], score: Math.random() * 100 },
          overallScore: Math.random() * 100,
          organizationId,
          stationId: stationIds[i % stationIds.length],
          auditorId: userIds[i % userIds.length]
        }
      });
      audits.push(audit);
    }
    return audits;
  }

  async createTestIncidents(organizationId, stationIds, userIds, count) {
    const incidents = [];
    const severities = ['Low', 'Medium', 'High', 'Critical'];
    const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    
    for (let i = 0; i < count; i++) {
      const incident = await prisma.incident.create({
        data: {
          title: `Test Incident ${i}`,
          description: `This is a test incident created for load testing purposes. Incident number ${i}.`,
          severity: severities[i % severities.length],
          status: statuses[i % statuses.length],
          reportedDate: new Date(),
          resolvedDate: i % 2 === 0 ? new Date() : null,
          organizationId,
          stationId: stationIds[i % stationIds.length],
          reporterId: userIds[i % userIds.length]
        }
      });
      incidents.push(incident);
    }
    return incidents;
  }

  async createTestContractors(organizationId, count) {
    const contractors = [];
    const specializations = ['Electrical', 'Plumbing', 'HVAC', 'Construction', 'Maintenance'];
    
    for (let i = 0; i < count; i++) {
      const contractor = await prisma.contractor.create({
        data: {
          name: `Test Contractor ${i}`,
          licenseNumber: `LIC-${Date.now()}-${i}`,
          specialization: specializations[i % specializations.length],
          contactPerson: `Contact Person ${i}`,
          email: `contractor${i}-${Date.now()}@example.com`,
          status: i % 10 === 0 ? 'Inactive' : 'Active',
          organizationId
        }
      });
      contractors.push(contractor);
    }
    return contractors;
  }

  async generateFullDataset(organizationId) {
    console.log(`Generating ${this.volumeType} dataset for org ${organizationId}...`);
    
    const users = await this.createTestUsers(organizationId, this.data.users);
    const stations = await this.createTestStations(organizationId, this.data.stations);
    const contractors = await this.createTestContractors(organizationId, this.data.contractors);
    
    const stationIds = stations.map(s => s.id);
    const userIds = users.map(u => u.id);
    
    const audits = await this.createTestAudits(organizationId, stationIds, userIds, this.data.audits);
    const incidents = await this.createTestIncidents(organizationId, stationIds, userIds, this.data.incidents);
    
    console.log(`Dataset generated: ${users.length} users, ${stations.length} stations, ${audits.length} audits, ${incidents.length} incidents, ${contractors.length} contractors`);
    
    return {
      organization: { id: organizationId },
      users,
      stations,
      audits,
      incidents,
      contractors
    };
  }

  async setupMultipleTenants(count, volumeType = 'medium') {
    const tenants = [];
    
    for (let i = 0; i < count; i++) {
      const org = await this.createTestOrganization(i);
      const data = await this.generateFullDataset(org.id);
      tenants.push(data);
    }
    
    return tenants;
  }

  async cleanup(organizationIds) {
    console.log(`Cleaning up ${organizationIds.length} test organizations...`);
    
    for (const orgId of organizationIds) {
      await prisma.organization.delete({
        where: { id: orgId }
      });
    }
    
    console.log('Cleanup complete');
  }
}

export async function setupLoadTestData(tenantCount = 10, volumeType = 'medium') {
  const generator = new TestDataGenerator(volumeType);
  const tenants = await generator.setupMultipleTenants(tenantCount, volumeType);
  return { tenants, generator };
}
