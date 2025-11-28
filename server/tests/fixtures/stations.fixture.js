export const stationFixtures = {
  freeStation1: {
    id: 'station-free-001',
    organizationId: 'org-free-001',
    name: 'QuickFuel Main Station',
    brand: 'QuickFuel',
    region: 'Lahore',
    address: 'Main Boulevard, Gulberg III, Lahore',
    location: { lat: 31.5204, lon: 74.3587 },
    riskCategory: 'Low',
    auditFrequency: 'Annually',
    isActive: true,
  },

  proStation1: {
    id: 'station-pro-001',
    organizationId: 'org-pro-001',
    name: 'FastGas North Hub',
    brand: 'FastGas',
    region: 'Islamabad',
    address: 'Blue Area, Jinnah Avenue, Islamabad',
    location: { lat: 33.7077, lon: 73.0469 },
    riskCategory: 'Medium',
    auditFrequency: 'Semi-Annually',
    isActive: true,
  },

  proStation2: {
    id: 'station-pro-002',
    organizationId: 'org-pro-001',
    name: 'FastGas South Station',
    brand: 'FastGas',
    region: 'Karachi',
    address: 'Shahrah-e-Faisal, Karachi',
    location: { lat: 24.8607, lon: 67.0011 },
    riskCategory: 'Medium',
    auditFrequency: 'Semi-Annually',
    isActive: true,
  },

  proStation3: {
    id: 'station-pro-003',
    organizationId: 'org-pro-001',
    name: 'FastGas Express Highway',
    brand: 'FastGas',
    region: 'Lahore',
    address: 'Lahore-Islamabad Motorway, M2',
    location: { lat: 31.4504, lon: 73.1350 },
    riskCategory: 'Low',
    auditFrequency: 'Annually',
    isActive: true,
  },

  enterpriseStation1: {
    id: 'station-ent-001',
    organizationId: 'org-enterprise-001',
    name: 'Total Parco Model Town Lahore',
    brand: 'Total Parco',
    region: 'Punjab',
    address: 'Model Town Link Road, Lahore',
    location: { lat: 31.4725, lon: 74.3245 },
    riskCategory: 'Low',
    auditFrequency: 'Quarterly',
    isActive: true,
  },

  enterpriseStation2: {
    id: 'station-ent-002',
    organizationId: 'org-enterprise-001',
    name: 'Total Parco F-8 Islamabad',
    brand: 'Total Parco',
    region: 'Punjab',
    address: 'F-8 Markaz, Islamabad',
    location: { lat: 33.7100, lon: 73.0360 },
    riskCategory: 'Low',
    auditFrequency: 'Quarterly',
    isActive: true,
  },

  enterpriseStation3: {
    id: 'station-ent-003',
    organizationId: 'org-enterprise-001',
    name: 'Total Parco DHA Lahore',
    brand: 'Total Parco',
    region: 'Punjab',
    address: 'Phase 5, DHA, Lahore',
    location: { lat: 31.4697, lon: 74.4088 },
    riskCategory: 'Low',
    auditFrequency: 'Quarterly',
    isActive: true,
  },

  enterpriseStation4: {
    id: 'station-ent-004',
    organizationId: 'org-enterprise-001',
    name: 'Total Parco DHA Karachi',
    brand: 'Total Parco',
    region: 'Sindh',
    address: 'Phase 5, DHA, Karachi',
    location: { lat: 24.8146, lon: 67.0628 },
    riskCategory: 'Medium',
    auditFrequency: 'Quarterly',
    isActive: true,
  },

  enterprise2Station1: {
    id: 'station-ent2-001',
    organizationId: 'org-enterprise-002',
    name: 'Shell Hayatabad Peshawar',
    brand: 'Shell',
    region: 'KPK',
    address: 'Phase 3, Hayatabad, Peshawar',
    location: { lat: 33.9870, lon: 71.4390 },
    riskCategory: 'High',
    auditFrequency: 'Monthly',
    isActive: true,
  },

  enterprise2Station2: {
    id: 'station-ent2-002',
    organizationId: 'org-enterprise-002',
    name: 'Shell University Road Peshawar',
    brand: 'Shell',
    region: 'KPK',
    address: 'University Road, Peshawar',
    location: { lat: 34.0151, lon: 71.5805 },
    riskCategory: 'High',
    auditFrequency: 'Monthly',
    isActive: true,
  },

  trialStation1: {
    id: 'station-trial-001',
    organizationId: 'org-trial-001',
    name: 'GreenFuel Eco Station',
    brand: 'GreenFuel',
    region: 'Lahore',
    address: 'Canal Road, Lahore',
    location: { lat: 31.5000, lon: 74.3200 },
    riskCategory: 'Low',
    auditFrequency: 'Semi-Annually',
    isActive: true,
  },
};

export const getStationsByOrganization = (organizationId) => {
  return Object.values(stationFixtures).filter(
    station => station.organizationId === organizationId
  );
};

export const getStationsByRisk = (riskCategory) => {
  return Object.values(stationFixtures).filter(
    station => station.riskCategory === riskCategory
  );
};
