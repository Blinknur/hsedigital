export const userFixtures = {
  // System Admin
  systemAdmin: {
    id: 'user-admin-001',
    name: 'System Administrator',
    email: 'admin@hsedigital.com',
    role: 'Admin',
    organizationId: null,
    password: 'AdminPassword123!',
    isEmailVerified: true,
    metadata: {
      department: 'IT',
      position: 'System Administrator',
    },
  },

  // Free tier users
  freeOrgOwner: {
    id: 'user-free-owner-001',
    name: 'John Smith',
    email: 'john.smith@quickfuel.com',
    role: 'Admin',
    organizationId: 'org-free-001',
    password: 'Password123!',
    isEmailVerified: true,
    metadata: {
      position: 'Owner',
      phone: '+923001234567',
    },
  },

  freeOrgManager: {
    id: 'user-free-manager-001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@quickfuel.com',
    role: 'Station Manager',
    organizationId: 'org-free-001',
    password: 'Password123!',
    isEmailVerified: true,
    assignedStationIds: ['station-free-001'],
    metadata: {
      position: 'Station Manager',
      phone: '+923001234568',
    },
  },

  // Pro tier users
  proOrgOwner: {
    id: 'user-pro-owner-001',
    name: 'Michael Chen',
    email: 'michael.chen@fastgas.com',
    role: 'Admin',
    organizationId: 'org-pro-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'North',
    metadata: {
      position: 'CEO',
      phone: '+923002345678',
    },
  },

  proOrgComplianceManager: {
    id: 'user-pro-cm-001',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@fastgas.com',
    role: 'Compliance Manager',
    organizationId: 'org-pro-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'North',
    assignedStationIds: ['station-pro-001', 'station-pro-002', 'station-pro-003'],
    metadata: {
      position: 'Compliance Manager',
      phone: '+923002345679',
    },
  },

  proOrgStationManager1: {
    id: 'user-pro-sm-001',
    name: 'David Lee',
    email: 'david.lee@fastgas-north.com',
    role: 'Station Manager',
    organizationId: 'org-pro-001',
    password: 'Password123!',
    isEmailVerified: true,
    assignedStationIds: ['station-pro-001'],
    metadata: {
      position: 'Station Manager',
      stationName: 'FastGas North Hub',
      phone: '+923002345680',
    },
  },

  proOrgStationManager2: {
    id: 'user-pro-sm-002',
    name: 'Lisa Wong',
    email: 'lisa.wong@fastgas-south.com',
    role: 'Station Manager',
    organizationId: 'org-pro-001',
    password: 'Password123!',
    isEmailVerified: true,
    assignedStationIds: ['station-pro-002'],
    metadata: {
      position: 'Station Manager',
      stationName: 'FastGas South Station',
      phone: '+923002345681',
    },
  },

  proOrgAuditor: {
    id: 'user-pro-auditor-001',
    name: 'Robert Taylor',
    email: 'robert.taylor@fastgas.com',
    role: 'Auditor',
    organizationId: 'org-pro-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'North',
    metadata: {
      position: 'Safety Auditor',
      certifications: ['ISO 9001', 'HSE Level 3'],
      phone: '+923002345682',
    },
  },

  // Enterprise tier users - Total Parco
  enterpriseOrgOwner: {
    id: 'user-ent-owner-001',
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@totalparco.com',
    role: 'Admin',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'National',
    metadata: {
      position: 'COO',
      phone: '+923003456789',
    },
  },

  enterpriseOrgComplianceManager1: {
    id: 'user-ent-cm-001',
    name: 'Fatima Khan',
    email: 'fatima.khan@totalparco.com',
    role: 'Compliance Manager',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'Punjab',
    assignedStationIds: ['station-ent-001', 'station-ent-002', 'station-ent-003', 'station-ent-004', 'station-ent-005'],
    metadata: {
      position: 'Regional Compliance Manager - Punjab',
      phone: '+923003456790',
    },
  },

  enterpriseOrgComplianceManager2: {
    id: 'user-ent-cm-002',
    name: 'Ali Raza',
    email: 'ali.raza@totalparco.com',
    role: 'Compliance Manager',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'Sindh',
    assignedStationIds: ['station-ent-006', 'station-ent-007', 'station-ent-008'],
    metadata: {
      position: 'Regional Compliance Manager - Sindh',
      phone: '+923003456791',
    },
  },

  enterpriseOrgStationManager1: {
    id: 'user-ent-sm-001',
    name: 'Bilal Ahmed',
    email: 'bilal.ahmed@totalparco-lahore.com',
    role: 'Station Manager',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    assignedStationIds: ['station-ent-001'],
    metadata: {
      position: 'Station Manager',
      stationName: 'Total Parco Model Town Lahore',
      phone: '+923003456792',
    },
  },

  enterpriseOrgStationManager2: {
    id: 'user-ent-sm-002',
    name: 'Zainab Hassan',
    email: 'zainab.hassan@totalparco-isb.com',
    role: 'Station Manager',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    assignedStationIds: ['station-ent-002'],
    metadata: {
      position: 'Station Manager',
      stationName: 'Total Parco F-8 Islamabad',
      phone: '+923003456793',
    },
  },

  enterpriseOrgStationManager3: {
    id: 'user-ent-sm-003',
    name: 'Imran Malik',
    email: 'imran.malik@totalparco-karachi.com',
    role: 'Station Manager',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    assignedStationIds: ['station-ent-006'],
    metadata: {
      position: 'Station Manager',
      stationName: 'Total Parco DHA Karachi',
      phone: '+923003456794',
    },
  },

  enterpriseOrgAuditor1: {
    id: 'user-ent-auditor-001',
    name: 'Dr. Ayesha Siddiqui',
    email: 'ayesha.siddiqui@totalparco.com',
    role: 'Auditor',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'Punjab',
    metadata: {
      position: 'Senior HSE Auditor',
      certifications: ['ISO 45001', 'NEBOSH', 'HSE Level 4'],
      phone: '+923003456795',
    },
  },

  enterpriseOrgAuditor2: {
    id: 'user-ent-auditor-002',
    name: 'Kamran Akmal',
    email: 'kamran.akmal@totalparco.com',
    role: 'Auditor',
    organizationId: 'org-enterprise-001',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'Sindh',
    metadata: {
      position: 'HSE Auditor',
      certifications: ['ISO 45001', 'HSE Level 3'],
      phone: '+923003456796',
    },
  },

  enterpriseOrgContractor: {
    id: 'user-ent-contractor-001',
    name: 'Rashid Minhas',
    email: 'rashid@volttech.pk',
    role: 'Contractor',
    organizationId: 'org-enterprise-001',
    contractorId: 'contractor-ent-001',
    password: 'Password123!',
    isEmailVerified: true,
    metadata: {
      company: 'VoltTech Solutions',
      specialization: 'Electrical',
      phone: '+923003456797',
    },
  },

  // Enterprise tier users - Shell
  enterprise2OrgOwner: {
    id: 'user-ent2-owner-001',
    name: 'Usman Khawaja',
    email: 'usman.khawaja@shell.com.pk',
    role: 'Admin',
    organizationId: 'org-enterprise-002',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'National',
    metadata: {
      position: 'Operations Director',
      phone: '+923004567890',
    },
  },

  enterprise2OrgComplianceManager: {
    id: 'user-ent2-cm-001',
    name: 'Sana Mir',
    email: 'sana.mir@shell.com.pk',
    role: 'Compliance Manager',
    organizationId: 'org-enterprise-002',
    password: 'Password123!',
    isEmailVerified: true,
    region: 'KPK',
    assignedStationIds: ['station-ent2-001', 'station-ent2-002', 'station-ent2-003'],
    metadata: {
      position: 'Compliance Manager - KPK',
      phone: '+923004567891',
    },
  },

  // Trial organization users
  trialOrgOwner: {
    id: 'user-trial-owner-001',
    name: 'James Wilson',
    email: 'james.wilson@greenfuel.com',
    role: 'Admin',
    organizationId: 'org-trial-001',
    password: 'Password123!',
    isEmailVerified: true,
    metadata: {
      position: 'Founder',
      phone: '+923005678901',
    },
  },

  trialOrgManager: {
    id: 'user-trial-manager-001',
    name: 'Maria Garcia',
    email: 'maria.garcia@greenfuel.com',
    role: 'Station Manager',
    organizationId: 'org-trial-001',
    password: 'Password123!',
    isEmailVerified: true,
    assignedStationIds: ['station-trial-001'],
    metadata: {
      position: 'Operations Manager',
      phone: '+923005678902',
    },
  },
};

export const getUsersByOrganization = (organizationId) => {
  return Object.values(userFixtures).filter(
    user => user.organizationId === organizationId
  );
};

export const getUsersByRole = (role) => {
  return Object.values(userFixtures).filter(
    user => user.role === role
  );
};

export const getAdminUsers = () => getUsersByRole('Admin');
export const getComplianceManagers = () => getUsersByRole('Compliance Manager');
export const getStationManagers = () => getUsersByRole('Station Manager');
export const getAuditors = () => getUsersByRole('Auditor');
export const getContractors = () => getUsersByRole('Contractor');
