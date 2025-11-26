import prisma from '../utils/db.js';
import { 
    getPlanLimits, 
    checkQuota, 
    incrementUsage, 
    getCurrentUsage,
    getUsageStats,
    checkFeatureAccess 
} from '../services/quotaService.js';

describe('Quota Service', () => {
    let testOrgId;

    beforeAll(async () => {
        const org = await prisma.organization.create({
            data: {
                name: 'Test Quota Org',
                ownerId: 'test-owner-id',
                subscriptionPlan: 'free'
            }
        });
        testOrgId = org.id;
    });

    afterAll(async () => {
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    test('getPlanLimits returns correct free plan limits', async () => {
        const plan = await getPlanLimits('free');
        expect(plan.limits.stations).toBe(5);
        expect(plan.limits.users).toBe(3);
        expect(plan.limits.audits_per_month).toBe(10);
    });

    test('getPlanLimits returns unlimited for enterprise', async () => {
        const plan = await getPlanLimits('enterprise');
        expect(plan.limits.stations).toBe(-1);
        expect(plan.limits.users).toBe(-1);
    });

    test('checkFeatureAccess returns false for free plan AI', async () => {
        const hasAccess = await checkFeatureAccess(testOrgId, 'ai_assistant');
        expect(hasAccess).toBe(false);
    });

    test('checkQuota allows creation when under limit', async () => {
        const result = await checkQuota(testOrgId, 'stations');
        expect(result.allowed).toBe(true);
    });

    test('incrementUsage updates Redis counters', async () => {
        await incrementUsage(testOrgId, 'audits');
        const usage = await getCurrentUsage(testOrgId);
        expect(usage.audits_this_month).toBeGreaterThan(0);
    });

    test('getUsageStats returns complete stats', async () => {
        const stats = await getUsageStats(testOrgId);
        expect(stats).toBeDefined();
        expect(stats.plan.name).toBe('Free');
        expect(stats.limits).toBeDefined();
        expect(stats.features).toBeDefined();
        expect(stats.usage).toBeDefined();
    });

    test('admin override bypasses quota check', async () => {
        const result = await checkQuota(testOrgId, 'stations', true);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('admin_override');
    });
});
