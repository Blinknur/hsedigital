import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { withSpan, addSpanAttributes, recordException, addSpanEvent } from '../utils/tracing.js';

const prisma = new PrismaClient();
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
    return await withSpan(
        'stripe.checkout.create',
        {
            'stripe.operation': 'checkout.session.create',
            'stripe.plan_id': planId,
            'organization.id': organizationId
        },
        async (span) => {
            if (!stripe) throw new Error('Stripe not configured');
            
            const planConfig = PLAN_CONFIGS[planId];
            if (!planConfig) throw new Error('Invalid plan');

            addSpanEvent('fetching_organization', { organizationId });
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

            addSpanEvent('creating_checkout_session', { planName: planConfig.name });
            const session = await stripe.checkout.sessions.create(sessionParams);
            
            span.setAttribute('stripe.session_id', session.id);
            span.setAttribute('stripe.checkout_url', session.url);
            
            return { url: session.url, sessionId: session.id };
        }
    );
};

export const createPortalSession = async (organizationId) => {
    return await withSpan(
        'stripe.portal.create',
        {
            'stripe.operation': 'billing_portal.session.create',
            'organization.id': organizationId
        },
        async (span) => {
            if (!stripe) throw new Error('Stripe not configured');

            const org = await prisma.organization.findUnique({ where: { id: organizationId } });
            if (!org || !org.stripeCustomerId) {
                throw new Error('No Stripe customer found');
            }

            span.setAttribute('stripe.customer_id', org.stripeCustomerId);

            const session = await stripe.billingPortal.sessions.create({
                customer: org.stripeCustomerId,
                return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/settings`
            });

            span.setAttribute('stripe.portal_url', session.url);

            return { url: session.url };
        }
    );
};

export const handleCheckoutComplete = async (session) => {
    return await withSpan(
        'stripe.webhook.checkout.completed',
        {
            'stripe.event': 'checkout.session.completed',
            'stripe.session_id': session.id
        },
        async (span) => {
            const organizationId = session.client_reference_id || session.metadata?.organizationId;
            if (!organizationId) {
                console.error('No organization ID in checkout session');
                return;
            }

            const customerId = session.customer;
            const subscriptionId = session.subscription;
            const planId = session.metadata?.planId;

            span.setAttribute('organization.id', organizationId);
            span.setAttribute('stripe.customer_id', customerId);
            span.setAttribute('stripe.subscription_id', subscriptionId);
            span.setAttribute('subscription.plan', planId);

            await prisma.organization.update({
                where: { id: organizationId },
                data: {
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    subscriptionPlan: planId || 'professional',
                    subscriptionStatus: 'active'
                }
            });

            addSpanEvent('checkout_completed', {
                organizationId,
                subscriptionId,
                planId
            });

            console.log(`✅ Checkout completed for org ${organizationId}, subscription ${subscriptionId}`);
        }
    );
};

export const handleSubscriptionUpdated = async (subscription) => {
    return await withSpan(
        'stripe.webhook.subscription.updated',
        {
            'stripe.event': 'customer.subscription.updated',
            'stripe.subscription_id': subscription.id
        },
        async (span) => {
            const org = await prisma.organization.findUnique({
                where: { stripeSubscriptionId: subscription.id }
            });

            if (!org) {
                console.warn(`Subscription ${subscription.id} not found in database`);
                span.setAttribute('result', 'subscription_not_found');
                return;
            }

            const status = subscription.status;
            const planId = subscription.metadata?.planId || org.subscriptionPlan;

            span.setAttribute('organization.id', org.id);
            span.setAttribute('subscription.status', status);
            span.setAttribute('subscription.plan', planId);

            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    subscriptionStatus: status,
                    subscriptionPlan: status === 'active' || status === 'trialing' ? planId : org.subscriptionPlan
                }
            });

            addSpanEvent('subscription_updated', {
                organizationId: org.id,
                status,
                planId
            });

            console.log(`✅ Subscription ${subscription.id} updated: status=${status}`);
        }
    );
};

export const handleSubscriptionDeleted = async (subscription) => {
    return await withSpan(
        'stripe.webhook.subscription.deleted',
        {
            'stripe.event': 'customer.subscription.deleted',
            'stripe.subscription_id': subscription.id
        },
        async (span) => {
            const org = await prisma.organization.findUnique({
                where: { stripeSubscriptionId: subscription.id }
            });

            if (!org) {
                console.warn(`Subscription ${subscription.id} not found in database`);
                span.setAttribute('result', 'subscription_not_found');
                return;
            }

            span.setAttribute('organization.id', org.id);

            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    subscriptionStatus: 'canceled',
                    subscriptionPlan: 'free',
                    stripeSubscriptionId: null
                }
            });

            addSpanEvent('subscription_canceled', {
                organizationId: org.id
            });

            console.log(`✅ Subscription ${subscription.id} canceled for org ${org.id}`);
        }
    );
};

export const handlePaymentFailed = async (invoice) => {
    return await withSpan(
        'stripe.webhook.invoice.payment_failed',
        {
            'stripe.event': 'invoice.payment_failed',
            'stripe.invoice_id': invoice.id
        },
        async (span) => {
            if (!invoice.subscription) return;

            const org = await prisma.organization.findUnique({
                where: { stripeSubscriptionId: invoice.subscription }
            });

            if (!org) return;

            span.setAttribute('organization.id', org.id);
            span.setAttribute('stripe.subscription_id', invoice.subscription);

            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    subscriptionStatus: 'past_due'
                }
            });

            addSpanEvent('payment_failed', {
                organizationId: org.id,
                invoiceId: invoice.id
            });

            console.log(`⚠️ Payment failed for org ${org.id}`);
        }
    );
};

export const constructWebhookEvent = (payload, signature) => {
    if (!stripe) throw new Error('Stripe not configured');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};
