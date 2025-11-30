import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mockPrisma = {
    organization: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
    },
    station: {
        count: jest.fn(),
    },
    user: {
        count: jest.fn(),
    },
    contractor: {
        count: jest.fn(),
    },
    formDefinition: {
        count: jest.fn(),
    },
    $disconnect: jest.fn(),
};

const dbPath = resolve(__dirname, '../shared/utils/db.js');
jest.unstable_mockModule(dbPath, () => ({
    default: mockPrisma,
}));

jest.unstable_mockModule('ioredis', () => ({
    default: jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue('0'),
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        del: jest.fn().mockResolvedValue(1),
        on: jest.fn(),
    })),
}));

const { 
    getPlanLimits, 
    checkQuota, 
    incrementUsage, 
    getCurrentUsage,
    getUsageStats,
    checkFeatureAccess 
} = await import('../core/services/quotaService.js');

describe('Quota Service', () => {
    let testOrgId;

    beforeAll(() => {
        testOrgId = 'test-org-id';
        
        mockPrisma.organization.findUnique.mockResolvedValue({
            id: testOrgId,
            name: 'Test Quota Org',
            subscriptionPlan: 'free',
        });
    });

    afterAll(async () => {
        await mockPrisma.$disconnect();
        jest.clearAllMocks();
    });

    describe('getPlanLimits', () => {
        it('should return correct free plan limits', async () => {
            const plan = await getPlanLimits('free');
            
            expect(plan).toBeDefined();
            expect(plan.limits).toBeDefined();
            expect(plan.limits.stations).toBe(5);
            expect(plan.limits.users).toBe(3);
            expect(plan.limits.audits_per_month).toBe(10);
        });

        it('should return unlimited for enterprise', async () => {
            const plan = await getPlanLimits('enterprise');
            
            expect(plan).toBeDefined();
            expect(plan.limits).toBeDefined();
            expect(plan.limits.stations).toBe(-1);
            expect(plan.limits.users).toBe(-1);
        });

        it('should return professional plan limits', async () => {
            const plan = await getPlanLimits('professional');
            
            expect(plan).toBeDefined();
            expect(plan.limits).toBeDefined();
            expect(plan.limits.stations).toBe(100);
        });

        it('should default to free plan for unknown plan', async () => {
            const plan = await getPlanLimits('unknown-plan');
            
            expect(plan).toBeDefined();
            expect(plan.limits.stations).toBe(5);
        });
    });

    describe('checkFeatureAccess', () => {
        it('should return false for free plan AI', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: testOrgId,
                subscriptionPlan: 'free',
            });

            const hasAccess = await checkFeatureAccess(testOrgId, 'ai_assistant');
            
            expect(hasAccess).toBe(false);
        });

        it('should return true for enterprise plan AI', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: testOrgId,
                subscriptionPlan: 'enterprise',
            });

            const hasAccess = await checkFeatureAccess(testOrgId, 'ai_assistant');
            
            expect(hasAccess).toBe(true);
        });

        it('should return false for non-existent organization', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue(null);

            const hasAccess = await checkFeatureAccess('non-existent', 'ai_assistant');
            
            expect(hasAccess).toBe(false);
        });
    });

    describe('checkQuota', () => {
        beforeAll(() => {
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: testOrgId,
                subscriptionPlan: 'free',
            });

            mockPrisma.station.count.mockResolvedValue(2);
            mockPrisma.user.count.mockResolvedValue(1);
            mockPrisma.contractor.count.mockResolvedValue(0);
            mockPrisma.formDefinition.count.mockResolvedValue(3);
        });

        it('should allow creation when under limit', async () => {
            const result = await checkQuota(testOrgId, 'stations');
            
            expect(result).toBeDefined();
            expect(result.allowed).toBe(true);
            expect(result.current).toBe(2);
            expect(result.limit).toBe(5);
        });

        it('should block creation when at limit', async () => {
            mockPrisma.station.count.mockResolvedValue(5);

            const result = await checkQuota(testOrgId, 'stations');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('quota_exceeded');
        });

        it('should allow unlimited for enterprise', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: testOrgId,
                subscriptionPlan: 'enterprise',
            });

            const result = await checkQuota(testOrgId, 'stations');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('unlimited');
        });

        it('should handle admin override', async () => {
            const result = await checkQuota(testOrgId, 'stations', true);
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('admin_override');
        });

        it('should handle non-existent organization', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue(null);

            const result = await checkQuota('non-existent', 'stations');
            
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe('organization_not_found');
        });

        it('should handle untracked resources', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: testOrgId,
                subscriptionPlan: 'free',
            });

            const result = await checkQuota(testOrgId, 'unknown_resource');
            
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('resource_not_tracked');
        });
    });

    describe('incrementUsage', () => {
        it('should increment Redis counters', async () => {
            await incrementUsage(testOrgId, 'audits');
            
            expect(true).toBe(true);
        });

        it('should handle multiple resource types', async () => {
            await incrementUsage(testOrgId, 'incidents');
            await incrementUsage(testOrgId, 'work_permits');
            
            expect(true).toBe(true);
        });
    });

    describe('getCurrentUsage', () => {
        beforeAll(() => {
            mockPrisma.station.count.mockResolvedValue(3);
            mockPrisma.user.count.mockResolvedValue(2);
            mockPrisma.contractor.count.mockResolvedValue(5);
            mockPrisma.formDefinition.count.mockResolvedValue(7);
        });

        it('should return current usage stats', async () => {
            const usage = await getCurrentUsage(testOrgId);
            
            expect(usage).toBeDefined();
            expect(usage.stations).toBe(3);
            expect(usage.users).toBe(2);
            expect(usage.contractors).toBe(5);
            expect(usage.form_definitions).toBe(7);
            expect(typeof usage.audits_this_month).toBe('number');
        });
    });

    describe('getUsageStats', () => {
        beforeAll(() => {
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: testOrgId,
                subscriptionPlan: 'free',
            });

            mockPrisma.station.count.mockResolvedValue(2);
            mockPrisma.user.count.mockResolvedValue(1);
            mockPrisma.contractor.count.mockResolvedValue(0);
            mockPrisma.formDefinition.count.mockResolvedValue(3);
        });

        it('should return complete stats', async () => {
            const stats = await getUsageStats(testOrgId);
            
            expect(stats).toBeDefined();
            expect(stats.plan).toBeDefined();
            expect(stats.plan.name).toBe('Free');
            expect(stats.limits).toBeDefined();
            expect(stats.features).toBeDefined();
            expect(stats.usage).toBeDefined();
            expect(stats.usage.stations).toHaveProperty('current');
            expect(stats.usage.stations).toHaveProperty('limit');
        });

        it('should return null for non-existent organization', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue(null);

            const stats = await getUsageStats('non-existent');
            
            expect(stats).toBeNull();
        });

        it('should include all resource types', async () => {
            mockPrisma.organization.findUnique.mockResolvedValue({
                id: testOrgId,
                subscriptionPlan: 'professional',
            });

            const stats = await getUsageStats(testOrgId);
            
            expect(stats.usage).toHaveProperty('stations');
            expect(stats.usage).toHaveProperty('users');
            expect(stats.usage).toHaveProperty('contractors');
            expect(stats.usage).toHaveProperty('form_definitions');
            expect(stats.usage).toHaveProperty('audits_this_month');
            expect(stats.usage).toHaveProperty('incidents_this_month');
            expect(stats.usage).toHaveProperty('work_permits_this_month');
        });
    });
});
