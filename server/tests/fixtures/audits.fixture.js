export const auditFixtures = {
  scheduledAudit1: {
    id: 'audit-001',
    organizationId: 'org-enterprise-001',
    stationId: 'station-ent-001',
    auditorId: 'user-ent-auditor-001',
    auditNumber: 'AUD-2024-001',
    scheduledDate: new Date('2024-01-15'),
    status: 'Scheduled',
    formId: 'form-daily-1',
    findings: [],
    overallScore: 0,
  },

  completedAudit1: {
    id: 'audit-002',
    organizationId: 'org-enterprise-001',
    stationId: 'station-ent-001',
    auditorId: 'user-ent-auditor-001',
    auditNumber: 'AUD-2023-045',
    scheduledDate: new Date('2023-12-01'),
    completedDate: new Date('2023-12-01'),
    status: 'Completed',
    formId: 'form-daily-1',
    findings: [
      { category: 'Safety', issue: 'Fire extinguisher expired', severity: 'Medium', resolved: true },
      { category: 'Compliance', issue: 'Minor documentation gaps', severity: 'Low', resolved: true },
    ],
    overallScore: 85,
  },

  inProgressAudit1: {
    id: 'audit-003',
    organizationId: 'org-pro-001',
    stationId: 'station-pro-001',
    auditorId: 'user-pro-auditor-001',
    auditNumber: 'AUD-2024-002',
    scheduledDate: new Date('2024-01-10'),
    status: 'In Progress',
    formId: 'form-daily-1',
    findings: [
      { category: 'Safety', issue: 'Incomplete signage', severity: 'Low', resolved: false },
    ],
    overallScore: 0,
  },
};

export const getAuditsByOrganization = (organizationId) => {
  return Object.values(auditFixtures).filter(
    audit => audit.organizationId === organizationId
  );
};

export const getAuditsByStation = (stationId) => {
  return Object.values(auditFixtures).filter(
    audit => audit.stationId === stationId
  );
};