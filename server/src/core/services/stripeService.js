import Stripe from 'stripe';
import prisma from '../../shared/utils/db.js';
const stripe = process.env.STRIPE_SECRET_KEY 
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    : null;

if (!stripe) {
    console.warn("⚠️ STRIPE_SECRET_KEY not found. Payments will not work.");
}

const PLAN_CONFIGS = {
    starter: {
        name: 'Starter Plan',
        priceId: process.env.STRIPE_PRICE_STARTER,
        amount: 4900,
        currency: 'usd',
        interval: 'month'
    },
    professional: {
        name: 'Professional Plan',
        priceId: process.env.STRIPE_PRICE_PROFESSIONAL,
        amount: 14900,
        currency: 'usd',
        interval: 'month'
    },
    enterprise: {
        name: 'Enterprise Plan',
        priceId: process.env.STRIPE_PRICE_ENTERPRISE,
        amount: 49900,
        currency: 'usd',
        interval: 'month'
    }
};

export const createCheckoutSession = async (planId, organizationId, userEmail) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    const planConfig = PLAN_CONFIGS[planId];
    if (!planConfig) throw new Error('Invalid plan');

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new Error('Organization not found');

    const sessionParams = {
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: org.stripeCustomerId ? undefined : userEmail,
        customer: org.stripeCustomerId || undefined,
        client_reference_id: organizationId,
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings?success=true`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings?canceled=true`,
        metadata: {
            organizationId,
            planId
        }
    };

    if (planConfig.priceId) {
        sessionParams.line_items = [{
            price: planConfig.priceId,
            quantity: 1
        }];
    } else {
        sessionParams.line_items = [{
            price_data: {
                currency: planConfig.currency,
                product_data: {
                    name: planConfig.name,
                    description: `${planConfig.name} subscription`
                },
                unit_amount: planConfig.amount,
                recurring: {
                    interval: planConfig.interval
                }
            },
            quantity: 1
        }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return { url: session.url, sessionId: session.id };
};

export const createPortalSession = async (organizationId) => {
    if (!stripe) throw new Error('Stripe not configured');

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || !org.stripeCustomerId) {
        throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings`
    });

    return { url: session.url };
};

export const handleCheckoutComplete = async (session) => {
    const organizationId = session.client_reference_id || session.metadata?.organizationId;
    if (!organizationId) {
        console.error('No organization ID in checkout session');
        return;
    }

    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const planId = session.metadata?.planId;

    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionPlan: planId || 'professional',
            subscriptionStatus: 'active'
        }
    });

    console.log(`✅ Checkout completed for org ${organizationId}, subscription ${subscriptionId}`);
};

export const handleSubscriptionUpdated = async (subscription) => {
    const org = await prisma.organization.findUnique({
        where: { stripeSubscriptionId: subscription.id }
    });

    if (!org) {
        console.warn(`Subscription ${subscription.id} not found in database`);
        return;
    }

    const status = subscription.status;
    const planId = subscription.metadata?.planId || org.subscriptionPlan;

    await prisma.organization.update({
        where: { id: org.id },
        data: {
            subscriptionStatus: status,
            subscriptionPlan: status === 'active' || status === 'trialing' ? planId : org.subscriptionPlan
        }
    });

    console.log(`✅ Subscription ${subscription.id} updated: status=${status}`);
};

export const handleSubscriptionDeleted = async (subscription) => {
    const org = await prisma.organization.findUnique({
        where: { stripeSubscriptionId: subscription.id }
    });

    if (!org) {
        console.warn(`Subscription ${subscription.id} not found in database`);
        return;
    }

    await prisma.organization.update({
        where: { id: org.id },
        data: {
            subscriptionStatus: 'canceled',
            subscriptionPlan: 'free',
            stripeSubscriptionId: null
        }
    });

    console.log(`✅ Subscription ${subscription.id} canceled for org ${org.id}`);
};

export const handlePaymentFailed = async (invoice) => {
    if (!invoice.subscription) return;

    const org = await prisma.organization.findUnique({
        where: { stripeSubscriptionId: invoice.subscription }
    });

    if (!org) return;

    await prisma.organization.update({
        where: { id: org.id },
        data: {
            subscriptionStatus: 'past_due'
        }
    });

    console.log(`⚠️ Payment failed for org ${org.id}`);
};

export const constructWebhookEvent = (payload, signature) => {
    if (!stripe) throw new Error('Stripe not configured');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};
