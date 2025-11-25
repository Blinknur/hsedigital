import express from 'express';
import { 
    constructWebhookEvent,
    handleCheckoutComplete,
    handleSubscriptionUpdated,
    handleSubscriptionDeleted,
    handlePaymentFailed
} from '../services/tracedStripeService.js';

const router = express.Router();

const WEBHOOK_RETRY_DELAY = 5000;
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryHandler = async (fn, retries = MAX_RETRIES) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await fn();
            return;
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message);
            if (attempt < retries) {
                await sleep(WEBHOOK_RETRY_DELAY * (attempt + 1));
            } else {
                throw error;
            }
        }
    }
};

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
        event = constructWebhookEvent(req.body, signature);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log(`📨 Webhook received: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await retryHandler(() => handleCheckoutComplete(event.data.object));
                break;

            case 'customer.subscription.updated':
                await retryHandler(() => handleSubscriptionUpdated(event.data.object));
                break;

            case 'customer.subscription.deleted':
                await retryHandler(() => handleSubscriptionDeleted(event.data.object));
                break;

            case 'invoice.payment_failed':
                await retryHandler(() => handlePaymentFailed(event.data.object));
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error(`Failed to process webhook ${event.type}:`, error);
        res.status(500).json({ error: 'Webhook processing failed', details: error.message });
    }
});

export default router;
