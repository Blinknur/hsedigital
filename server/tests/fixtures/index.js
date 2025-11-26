export { organizationFixtures } from './organizations.fixture.js';
export { userFixtures } from './users.fixture.js';
export { stationFixtures } from './stations.fixture.js';

export const auditFixtures = {
  scheduledAudit: {
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'Scheduled',
    auditType: 'Regular',
  },

  completedAudit: {
    scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedDate: new Date(),
    status: 'Completed',
    auditType: 'Regular',
    score: 85,
  },

  failedAudit: {
    scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedDate: new Date(),
    status: 'Completed',
    auditType: 'Follow-up',
    score: 45,
  },
};

export const incidentFixtures = {
  lowSeverityIncident: {
    title: 'Minor Equipment Malfunction',
    description: 'Pump 3 display showing incorrect fuel grade',
    severity: 'Low',
    status: 'Open',
    occurredAt: new Date(),
  },

  mediumSeverityIncident: {
    title: 'Customer Complaint',
    description: 'Customer reported fuel quality issue',
    severity: 'Medium',
    status: 'Under Investigation',
    occurredAt: new Date(),
  },

  highSeverityIncident: {
    title: 'Safety Hazard Detected',
    description: 'Fire extinguisher expired and not replaced',
    severity: 'High',
    status: 'Open',
    occurredAt: new Date(),
  },

  criticalIncident: {
    title: 'Emergency Shutdown',
    description: 'Gas leak detected, station evacuated',
    severity: 'Critical',
    status: 'Under Investigation',
    occurredAt: new Date(),
  },

  resolvedIncident: {
    title: 'Resolved Issue',
    description: 'Issue was resolved successfully',
    severity: 'Medium',
    status: 'Resolved',
    occurredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    resolvedAt: new Date(),
  },
};

export const contractorFixtures = {
  electricalContractor: {
    name: 'ElectroTech Solutions',
    licenseNumber: 'EL-12345',
    specialization: 'Electrical',
    contactPerson: 'John Electrician',
    status: 'Active',
  },

  mechanicalContractor: {
    name: 'MechWorks Engineering',
    licenseNumber: 'ME-67890',
    specialization: 'Mechanical',
    contactPerson: 'Jane Mechanic',
    status: 'Active',
  },

  civilContractor: {
    name: 'BuildRight Construction',
    licenseNumber: 'CV-11223',
    specialization: 'Civil',
    contactPerson: 'Bob Builder',
    status: 'Active',
  },

  inactiveContractor: {
    name: 'Defunct Services',
    licenseNumber: 'XX-99999',
    specialization: 'General',
    contactPerson: 'Old Contact',
    status: 'Inactive',
  },
};

export const formFixtures = {
  dailyChecklist: {
    name: 'Daily Safety Checklist',
    frequency: 'Daily',
    schema: {
      components: [
        { type: 'header', label: 'Safety Checks', key: 'header1' },
        {
          label: 'Fire extinguishers accessible',
          type: 'radio',
          key: 'fireExtinguishers',
          values: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]
        },
        {
          label: 'Emergency exits clear',
          type: 'radio',
          key: 'emergencyExits',
          values: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]
        },
      ]
    },
  },

  weeklyInspection: {
    name: 'Weekly Equipment Inspection',
    frequency: 'Weekly',
    schema: {
      components: [
        { type: 'header', label: 'Equipment Status', key: 'header1' },
        {
          label: 'All pumps operational',
          type: 'checkbox',
          key: 'pumpsOperational',
        },
        {
          label: 'Notes',
          type: 'textarea',
          key: 'notes',
        },
      ]
    },
  },
};
