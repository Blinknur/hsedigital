import prisma from '../utils/db.js';

const SUBSCRIPTION_PLANS = [
    {
        id: 'plan-free',
        name: 'free',
        stripePriceId: 'price_free',
        stripeProductId: 'prod_free',
        interval: 'month',
        amount: 0,
        currency: 'usd',
        features: {
            basic_audits: true,
            basic_incidents: true,
            advanced_reporting: false,
            api_access: false,
            email_notifications: false,
            sso: false,
            custom_branding: false,
            priority_support: false,
            ai_insights: false
        },
        limits: {
            stations: 2,
            users: 3,
            audits_per_month: 10,
            incidents_per_month: 20,
            permits_per_month: 5,
            api_calls_per_day: 100
        },
        isActive: true,
        trialDays: 0
    },
    {
        id: 'plan-pro-monthly',
        name: 'pro',
        stripePriceId: 'price_pro_monthly',
        stripeProductId: 'prod_pro',
        interval: 'month',
        amount: 4900,
        currency: 'usd',
        features: {
            basic_audits: true,
            basic_incidents: true,
            advanced_reporting: true,
            api_access: true,
            email_notifications: true,
            sso: false,
            custom_branding: false,
            priority_support: false,
            ai_insights: false
        },
        limits: {
            stations: 10,
            users: 15,
            audits_per_month: 100,
            incidents_per_month: 200,
            permits_per_month: 50,
            api_calls_per_day: 1000
        },
        isActive: true,
        trialDays: 14
    },
    {
        id: 'plan-pro-yearly',
        name: 'pro',
        stripePriceId: 'price_pro_yearly',
        stripeProductId: 'prod_pro',
        interval: 'year',
        amount: 49000,
        currency: 'usd',
        features: {
            basic_audits: true,
            basic_incidents: true,
            advanced_reporting: true,
            api_access: true,
            email_notifications: true,
            sso: false,
            custom_branding: false,
            priority_support: false,
            ai_insights: false
        },
        limits: {
            stations: 10,
            users: 15,
            audits_per_month: 100,
            incidents_per_month: 200,
            permits_per_month: 50,
            api_calls_per_day: 1000
        },
        isActive: true,
        trialDays: 14
    },
    {
        id: 'plan-enterprise-monthly',
        name: 'enterprise',
        stripePriceId: 'price_enterprise_monthly',
        stripeProductId: 'prod_enterprise',
        interval: 'month',
        amount: 19900,
        currency: 'usd',
        features: {
            basic_audits: true,
            basic_incidents: true,
            advanced_reporting: true,
            api_access: true,
            email_notifications: true,
            sso: true,
            custom_branding: true,
            priority_support: true,
            ai_insights: true
        },
        limits: {
            stations: -1,
            users: -1,
            audits_per_month: -1,
            incidents_per_month: -1,
            permits_per_month: -1,
            api_calls_per_day: 10000
        },
        isActive: true,
        trialDays: 30
    },
    {
        id: 'plan-enterprise-yearly',
        name: 'enterprise',
        stripePriceId: 'price_enterprise_yearly',
        stripeProductId: 'prod_enterprise',
        interval: 'year',
        amount: 199000,
        currency: 'usd',
        features: {
            basic_audits: true,
            basic_incidents: true,
            advanced_reporting: true,
            api_access: true,
            email_notifications: true,
            sso: true,
            custom_branding: true,
            priority_support: true,
            ai_insights: true
        },
        limits: {
            stations: -1,
            users: -1,
            audits_per_month: -1,
            incidents_per_month: -1,
            permits_per_month: -1,
            api_calls_per_day: 10000
        },
        isActive: true,
        trialDays: 30
    }
];

async function main() {
    console.log('🌱 Seeding subscription plans...');

    for (const plan of SUBSCRIPTION_PLANS) {
        await prisma.subscriptionPlan.upsert({
            where: { id: plan.id },
            update: {},
            create: plan,
        });
        console.log(`  ✓ Created/Updated: ${plan.name} (${plan.interval})`);
    }

    console.log('✅ Subscription plans seeded successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Seeding failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
