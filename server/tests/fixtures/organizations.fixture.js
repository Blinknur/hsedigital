export const organizationFixtures = {
  freeOrganization: {
    name: 'Free Tier Organization',
    slug: 'free-org',
    subscriptionPlan: 'free',
    subscriptionStatus: 'active',
  },

  proOrganization: {
    name: 'Pro Tier Organization',
    slug: 'pro-org',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'active',
  },

  enterpriseOrganization: {
    name: 'Enterprise Organization',
    slug: 'enterprise-org',
    subscriptionPlan: 'enterprise',
    subscriptionStatus: 'active',
    ssoConfig: {
      enabled: true,
      domain: 'example.com',
      provider: 'okta',
    },
  },

  suspendedOrganization: {
    name: 'Suspended Organization',
    slug: 'suspended-org',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'suspended',
  },

  canceledOrganization: {
    name: 'Canceled Organization',
    slug: 'canceled-org',
    subscriptionPlan: 'free',
    subscriptionStatus: 'canceled',
  },
};
