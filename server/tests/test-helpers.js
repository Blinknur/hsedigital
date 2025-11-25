export const generateTestEmail = () => `test-${Date.now()}@example.com`;
export const generateTestSubdomain = () => `test-org-${Date.now()}`;
export const generateTestPassword = () => 'TestPassword123!';

export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await waitFor(delay);
        }
    }
};

export const createTestOrganization = (prisma) => async (name = 'Test Organization') => {
    return await prisma.organization.create({
        data: {
            name,
            slug: `test-${Date.now()}`,
            ownerId: 'test-owner-' + Date.now(),
            subscriptionPlan: 'free',
            subscriptionStatus: 'active'
        }
    });
};

export const createTestUser = (prisma) => async (orgId, email = generateTestEmail()) => {
    const { authService } = await import('../services/authService.js');
    return await prisma.user.create({
        data: {
            name: 'Test User',
            email,
            password: await authService.hashPassword(generateTestPassword()),
            role: 'Admin',
            organizationId: orgId,
            isEmailVerified: true
        }
    });
};

export const createTestStation = (prisma) => async (orgId) => {
    return await prisma.station.create({
        data: {
            name: 'Test Station',
            brand: 'TestBrand',
            region: 'Test Region',
            address: '123 Test Street',
            location: { lat: 0, lng: 0 },
            organizationId: orgId
        }
    });
};
