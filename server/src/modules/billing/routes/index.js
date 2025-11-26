import express from 'express';
import { billingController } from '../controllers/billing.controller.js';
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';

const router = express.Router();

router.use(prismaMiddleware);
router.use(authenticateToken);
router.use(tenantContext);

router.post('/create-checkout-session', billingController.createCheckoutSession);
router.post('/create-portal-session', billingController.createPortalSession);

export default router;
