export const stationFixtures = {
  lowRiskStation: {
    name: 'Low Risk Station',
    brand: 'TestBrand',
    region: 'North',
    address: '123 Safe Street',
    location: { lat: 33.710, lng: 73.036 },
    riskCategory: 'Low',
    auditFrequency: 'Annually',
    isActive: true,
  },

  mediumRiskStation: {
    name: 'Medium Risk Station',
    brand: 'TestBrand',
    region: 'South',
    address: '456 Moderate Ave',
    location: { lat: 24.860, lng: 67.001 },
    riskCategory: 'Medium',
    auditFrequency: 'Semi-Annually',
    isActive: true,
  },

  highRiskStation: {
    name: 'High Risk Station',
    brand: 'TestBrand',
    region: 'Central',
    address: '789 Danger Road',
    location: { lat: 31.520, lng: 74.358 },
    riskCategory: 'High',
    auditFrequency: 'Quarterly',
    isActive: true,
  },

  inactiveStation: {
    name: 'Inactive Station',
    brand: 'TestBrand',
    region: 'East',
    address: '321 Closed Blvd',
    location: { lat: 30.191, lng: 67.008 },
    riskCategory: 'Low',
    auditFrequency: 'Annually',
    isActive: false,
  },
};
