import express from 'express';
import { createCheckoutSession, createPortalSession } from '../services/tracedStripeService.js';

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/create-checkout-session', asyncHandler(async (req, res) => {
    const { planId } = req.body;
    const user = req.user;

    if (!user || !user.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!planId) {
        return res.status(400).json({ error: 'Plan ID required' });
    }

    try {
        const session = await createCheckoutSession(planId, user.organizationId, user.email);
        res.json(session);
    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: error.message });
    }
}));

router.post('/create-portal-session', asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user || !user.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const session = await createPortalSession(user.organizationId);
        res.json(session);
    } catch (error) {
        console.error('Portal session error:', error);
        res.status(500).json({ error: error.message });
    }
}));

export default router;
