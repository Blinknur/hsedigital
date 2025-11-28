export const contractorFixtures = {
  electricalContractor1: {
    id: 'contractor-ent-001',
    organizationId: 'org-enterprise-001',
    name: 'VoltTech Solutions',
    licenseNumber: 'EL-9921',
    specialization: 'Electrical',
    contactPerson: 'Rashid Minhas',
    email: 'info@volttech.pk',
    status: 'Active',
  },

  civilContractor1: {
    id: 'contractor-ent-002',
    organizationId: 'org-enterprise-001',
    name: 'CivilStruct Builders',
    licenseNumber: 'CV-4432',
    specialization: 'Civil',
    contactPerson: 'Tariq Jamil',
    email: 'contact@civilstruct.com',
    status: 'Active',
  },

  mechanicalContractor1: {
    id: 'contractor-ent2-001',
    organizationId: 'org-enterprise-002',
    name: 'SecureWeld Engineering',
    licenseNumber: 'ME-1122',
    specialization: 'Mechanical/Welding',
    contactPerson: 'Kamran Akmal',
    email: 'kamran@secureweld.com',
    status: 'Active',
  },

  inactiveContractor1: {
    id: 'contractor-pro-001',
    organizationId: 'org-pro-001',
    name: 'Old Services Ltd',
    licenseNumber: 'GN-5566',
    specialization: 'General',
    contactPerson: 'Ahmed Ali',
    email: 'contact@oldservices.com',
    status: 'Inactive',
  },
};

export const getContractorsByOrganization = (organizationId) => {
  return Object.values(contractorFixtures).filter(
    contractor => contractor.organizationId === organizationId
  );
};

export const getActiveContractors = () => {
  return Object.values(contractorFixtures).filter(
    contractor => contractor.status === 'Active'
  );
};