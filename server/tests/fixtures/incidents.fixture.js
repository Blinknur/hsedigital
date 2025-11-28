export const incidentFixtures = {
  openIncident1: {
    id: 'incident-001',
    organizationId: 'org-enterprise-001',
    stationId: 'station-ent-001',
    reporterId: 'user-ent-sm-001',
    incidentType: 'Fuel Spill',
    severity: 'High',
    description: 'Minor fuel spill during refueling operation',
    status: 'Open',
    reportedAt: new Date('2024-01-12T10:30:00Z'),
  },

  resolvedIncident1: {
    id: 'incident-002',
    organizationId: 'org-enterprise-001',
    stationId: 'station-ent-001',
    reporterId: 'user-ent-sm-001',
    incidentType: 'Equipment Failure',
    severity: 'Medium',
    description: 'Pump 3 malfunctioned, immediately shut down',
    status: 'Resolved',
    reportedAt: new Date('2023-12-20T14:15:00Z'),
    resolvedAt: new Date('2023-12-21T09:00:00Z'),
  },

  openIncident2: {
    id: 'incident-003',
    organizationId: 'org-pro-001',
    stationId: 'station-pro-001',
    reporterId: 'user-pro-sm-001',
    incidentType: 'Safety Violation',
    severity: 'Low',
    description: 'Customer smoking near pumps, asked to leave',
    status: 'Open',
    reportedAt: new Date('2024-01-11T16:45:00Z'),
  },

  criticalIncident1: {
    id: 'incident-004',
    organizationId: 'org-enterprise-002',
    stationId: 'station-ent2-001',
    reporterId: 'user-ent2-cm-001',
    incidentType: 'Fire Hazard',
    severity: 'Critical',
    description: 'Electrical short circuit in control room',
    status: 'Under Investigation',
    reportedAt: new Date('2024-01-13T08:00:00Z'),
  },
};

export const getIncidentsByOrganization = (organizationId) => {
  return Object.values(incidentFixtures).filter(
    incident => incident.organizationId === organizationId
  );
};

export const getIncidentsByStation = (stationId) => {
  return Object.values(incidentFixtures).filter(
    incident => incident.stationId === stationId
  );
};

export const getIncidentsBySeverity = (severity) => {
  return Object.values(incidentFixtures).filter(
    incident => incident.severity === severity
  );
};