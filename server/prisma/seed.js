
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_ORGANIZATIONS = [
    { id: 'org-1', name: 'Total Parco Pakistan', ownerId: 'user-cm-1', subscriptionPlan: 'enterprise', ssoConfig: { enabled: true, domain: 'totalparco.com' } },
    { id: 'org-2', name: 'Shell Pakistan Ltd', ownerId: 'user-cm-2', subscriptionPlan: 'pro' },
    { id: 'org-3', name: 'PSO Franchise Group', ownerId: 'user-cm-3', subscriptionPlan: 'free' }
];

const MOCK_USERS = [
    { id: 'user-admin-1', name: 'Aamir Khan', email: 'aamir.khan@saas-admin.com', role: 'Admin', password: 'password' },
    { id: 'user-cm-1', name: 'Bilal Ahmed', email: 'bilal.ahmed@totalparco.com', role: 'Compliance Manager', organizationId: 'org-1', region: 'South', assignedStationIds: ['station-tp-1', 'station-tp-2'], password: 'password' },
    { id: 'user-sm-7', name: 'Imad Wasim', email: 'imad.wasim@totalparco-s1.com', role: 'Station Manager', organizationId: 'org-1', assignedStationIds: ['station-tp-1'], password: 'password'},
    { id: 'user-sm-4', name: 'Maryam Choudhry', email: 'maryam.c@totalparco-s2.com', role: 'Station Manager', organizationId: 'org-1', assignedStationIds: ['station-tp-2'], password: 'password' },
    { id: 'user-cont-1', name: 'Rashid Minhas', email: 'rashid@volttech.pk', role: 'Contractor', organizationId: 'org-1', contractorId: 'cont-1', password: 'password' },
    { id: 'user-cm-2', name: 'Usman Malik', email: 'usman.malik@shell.com.pk', role: 'Compliance Manager', organizationId: 'org-2', region: 'Punjab', assignedStationIds: ['station-sh-1', 'station-sh-2'], password: 'password' },
    { id: 'user-sm-2', name: 'Zainab Hasan', email: 'zainab.hasan@shell-dha.com', role: 'Station Manager', organizationId: 'org-2', assignedStationIds: ['station-sh-1'], password: 'password' },
    { id: 'user-cm-3', name: 'Iqbal Qasim', email: 'iqbal.qasim@psogroup.com', role: 'Compliance Manager', organizationId: 'org-3', region: 'North', assignedStationIds: ['station-pso-1', 'station-pso-2'], password: 'password'},
    { id: 'user-sm-3', name: 'Ali Raza', email: 'ali.raza@pso-gulberg.com', role: 'Station Manager', organizationId: 'org-3', assignedStationIds: ['station-pso-1'], password: 'password' },
];

const MOCK_STATIONS = [
    { id: 'station-tp-1', organizationId: 'org-1', name: 'Total Parco F-8 Markaz', brand: 'Total Parco', region: 'Islamabad', address: 'F-8 Markaz, Islamabad', location: {lat: 33.710, lon: 73.036}, riskCategory: 'Low', auditFrequency: 'Annually', isActive: true },
    { id: 'station-tp-2', organizationId: 'org-1', name: 'Total Parco Model Town', brand: 'Total Parco', region: 'Lahore', address: 'Model Town Link Rd, Lahore', location: { lat: 31.4725, lon: 74.3245 }, riskCategory: 'Low', auditFrequency: 'Annually', isActive: true },
    { id: 'station-sh-1', organizationId: 'org-2', name: 'Shell DHA Service Station', brand: 'Shell', region: 'Karachi', address: 'Phase 5, DHA, Karachi', location: { lat: 24.8146, lon: 67.0628 }, riskCategory: 'Medium', auditFrequency: 'Semi-Annually', isActive: true },
    { id: 'station-sh-2', organizationId: 'org-2', name: 'Shell Hayatabad', brand: 'Shell', region: 'Peshawar', address: 'Phase 3, Hayatabad, Peshawar', location: {lat: 33.987, lon: 71.439}, riskCategory: 'Medium', auditFrequency: 'Semi-Annually', isActive: true },
    { id: 'station-pso-1', organizationId: 'org-3', name: 'PSO Gulberg Fuel Point', brand: 'PSO', region: 'Lahore', address: 'Main Boulevard, Gulberg, Lahore', location: { lat: 31.5204, lon: 74.3587 }, riskCategory: 'Medium', auditFrequency: 'Semi-Annually', isActive: true },
    { id: 'station-pso-2', organizationId: 'org-3', name: 'PSO Jinnah Road', brand: 'PSO', region: 'Quetta', address: 'Jinnah Road, Quetta', location: {lat: 30.191, lon: 67.008}, riskCategory: 'High', auditFrequency: 'Quarterly', isActive: true },
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
        schema: {
            components: [
                { type: 'header', label: 'Fuel Operations', key: 'header1' },
                { label: 'Check for fuel spills/leaks around pumps', type: 'radio', key: 'fuelSpills', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { label: 'Verify dispenser nozzles in good condition', type: 'radio', key: 'dispenserCondition', values: [{label: 'Compliant', value: 'Compliant'}, {label: 'Non-Compliant', value: 'NonCompliant'}, {label: 'N/A', value: 'NA'}]},
                { type: 'button', label: 'Submit', action: 'submit', key: 'submit' }
            ]
        }
    }
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
      await prisma.user.upsert({
          where: { id: user.id },
          update: {},
          create: user,
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
