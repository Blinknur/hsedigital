import express from 'express';
import { advancedAlertingService } from '../../core/services/alertingService.js';
import { requireRole } from '../middleware/rbac.js';
import { logger } from '../../shared/utils/logger.js';

const router = express.Router();

router.get('/stats', requireRole('Admin'), async (req, res) => {
    try {
        const stats = await advancedAlertingService.getAlertStats();
        res.json(stats);
    } catch (error) {
        logger.error({ error }, 'Failed to get alert stats');
        res.status(500).json({ error: 'Failed to retrieve alert statistics' });
    }
});

router.post('/test', requireRole('Admin'), async (req, res) => {
    try {
        const { type, severity, title, message, metadata } = req.body;
        
        await advancedAlertingService.sendAlert({
            type: type || 'test',
            severity: severity || 'INFO',
            title: title || 'Test Alert',
            message: message || 'This is a test alert from the alerting system',
            metadata: metadata || { test: true, timestamp: new Date().toISOString() },
            channels: ['slack', 'email'],
            tenantId: req.tenantId
        });
        
        res.json({ success: true, message: 'Test alert sent' });
    } catch (error) {
        logger.error({ error }, 'Failed to send test alert');
        res.status(500).json({ error: 'Failed to send test alert' });
    }
});

router.post('/cancel-escalation', requireRole('Admin'), async (req, res) => {
    try {
        const { alertKey } = req.body;
        
        if (!alertKey) {
            return res.status(400).json({ error: 'alertKey is required' });
        }
        
        advancedAlertingService.cancelEscalation(alertKey);
        
        res.json({ success: true, message: 'Escalation cancelled' });
    } catch (error) {
        logger.error({ error }, 'Failed to cancel escalation');
        res.status(500).json({ error: 'Failed to cancel escalation' });
    }
});

export default router;
