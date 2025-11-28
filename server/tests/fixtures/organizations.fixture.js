export const organizationFixtures = {
  // Free tier organization - Small fuel retailer
  freeOrganization: {
    id: 'org-free-001',
    name: 'QuickFuel Station',
    slug: 'quickfuel-station',
    subscriptionPlan: 'free',
    subscriptionStatus: 'active',
    monthlyRevenue: 5000,
    metadata: {
      industry: 'retail',
      size: 'small',
      stationCount: 1,
    },
  },

  // Pro tier organization - Regional chain
  proOrganization: {
    id: 'org-pro-001',
    name: 'FastGas Regional',
    slug: 'fastgas-regional',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'active',
    monthlyRevenue: 25000,
    metadata: {
      industry: 'retail',
      size: 'medium',
      stationCount: 5,
    },
  },

  // Enterprise tier organization - National chain
  enterpriseOrganization: {
    id: 'org-enterprise-001',
    name: 'Total Parco Pakistan',
    slug: 'total-parco-pakistan',
    subscriptionPlan: 'enterprise',
    subscriptionStatus: 'active',
    monthlyRevenue: 100000,
    ssoConfig: {
      enabled: true,
      domain: 'totalparco.com',
      provider: 'okta',
      clientId: 'test-client-id',
    },
    metadata: {
      industry: 'retail',
      size: 'large',
      stationCount: 20,
    },
  },

  // Enterprise tier - Another major brand
  enterpriseOrganization2: {
    id: 'org-enterprise-002',
    name: 'Shell Pakistan Ltd',
    slug: 'shell-pakistan-ltd',
    subscriptionPlan: 'enterprise',
    subscriptionStatus: 'active',
    monthlyRevenue: 120000,
    ssoConfig: {
      enabled: true,
      domain: 'shell.com.pk',
      provider: 'azure-ad',
    },
    metadata: {
      industry: 'retail',
      size: 'large',
      stationCount: 25,
    },
  },

  // Trial organization
  trialOrganization: {
    id: 'org-trial-001',
    name: 'GreenFuel Solutions',
    slug: 'greenfuel-solutions',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'trialing',
    monthlyRevenue: 0,
    metadata: {
      industry: 'retail',
      size: 'small',
      stationCount: 2,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },

  // Suspended organization
  suspendedOrganization: {
    id: 'org-suspended-001',
    name: 'Suspended Fuels Co',
    slug: 'suspended-fuels-co',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'suspended',
    monthlyRevenue: 0,
    metadata: {
      industry: 'retail',
      size: 'medium',
      stationCount: 3,
      suspendedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      suspensionReason: 'Payment failure',
    },
  },

  // Canceled organization
  canceledOrganization: {
    id: 'org-canceled-001',
    name: 'Closed Operations Inc',
    slug: 'closed-operations-inc',
    subscriptionPlan: 'free',
    subscriptionStatus: 'canceled',
    monthlyRevenue: 0,
    metadata: {
      industry: 'retail',
      size: 'small',
      stationCount: 1,
      canceledAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },

  // Past due organization
  pastDueOrganization: {
    id: 'org-pastdue-001',
    name: 'Delinquent Fuel Services',
    slug: 'delinquent-fuel-services',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'past_due',
    monthlyRevenue: 15000,
    metadata: {
      industry: 'retail',
      size: 'medium',
      stationCount: 4,
      paymentDueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
};

export const getOrganizationByTier = (tier) => {
  const mapping = {
    free: organizationFixtures.freeOrganization,
    pro: organizationFixtures.proOrganization,
    enterprise: organizationFixtures.enterpriseOrganization,
  };
  return mapping[tier] || null;
};

export const getAllActiveOrganizations = () => {
  return Object.values(organizationFixtures).filter(
    org => org.subscriptionStatus === 'active' || org.subscriptionStatus === 'trialing'
  );
};
