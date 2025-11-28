import { getTestPrisma } from '../helpers/db.helpers.js';
import bcrypt from 'bcrypt';
import {
  organizationFixtures,
  userFixtures,
  stationFixtures,
  auditFixtures,
  incidentFixtures,
  contractorFixtures,
} from '../fixtures/index.js';

const prisma = getTestPrisma();

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export async function seedTestData() {
  console.log('🌱 Starting test data seeding...');

  try {
    await seedOrganizations();
    await seedUsers();
    await seedStations();
    await seedContractors();
    await seedAudits();
    await seedIncidents();

    console.log('✅ Test data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
    throw error;
  }
}

async function seedOrganizations() {
  console.log('  📦 Seeding organizations...');
  
  for (const [key, org] of Object.entries(organizationFixtures)) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: {},
      create: {
        ...org,
        ownerId: org.ownerId || `owner-${org.id}`,
      },
    });
  }
  
  console.log(`  ✓ Seeded ${Object.keys(organizationFixtures).length} organizations`);
}

async function seedUsers() {
  console.log('  👥 Seeding users...');
  
  for (const [key, user] of Object.entries(userFixtures)) {
    const hashedPassword = await hashPassword(user.password);
    
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        ...user,
        password: hashedPassword,
        assignedStationIds: user.assignedStationIds || [],
      },
    });
  }
  
  console.log(`  ✓ Seeded ${Object.keys(userFixtures).length} users`);
}

async function seedStations() {
  console.log('  🏪 Seeding stations...');
  
  for (const [key, station] of Object.entries(stationFixtures)) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: {},
      create: station,
    });
  }
  
  console.log(`  ✓ Seeded ${Object.keys(stationFixtures).length} stations`);
}

async function seedContractors() {
  console.log('  🔧 Seeding contractors...');
  
  for (const [key, contractor] of Object.entries(contractorFixtures)) {
    await prisma.contractor.upsert({
      where: { id: contractor.id },
      update: {},
      create: contractor,
    });
  }
  
  console.log(`  ✓ Seeded ${Object.keys(contractorFixtures).length} contractors`);
}

async function seedAudits() {
  console.log('  📋 Seeding audits...');
  
  for (const [key, audit] of Object.entries(auditFixtures)) {
    await prisma.audit.upsert({
      where: { id: audit.id },
      update: {},
      create: audit,
    });
  }
  
  console.log(`  ✓ Seeded ${Object.keys(auditFixtures).length} audits`);
}

async function seedIncidents() {
  console.log('  🚨 Seeding incidents...');
  
  for (const [key, incident] of Object.entries(incidentFixtures)) {
    await prisma.incident.upsert({
      where: { id: incident.id },
      update: {},
      create: incident,
    });
  }
  
  console.log(`  ✓ Seeded ${Object.keys(incidentFixtures).length} incidents`);
}

export async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  try {
    await prisma.incident.deleteMany({});
    await prisma.audit.deleteMany({});
    await prisma.contractor.deleteMany({});
    await prisma.station.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});

    console.log('✅ Test data cleanup completed!');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
