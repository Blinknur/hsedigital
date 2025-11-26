import express from 'express';
import { authenticateToken, tenantContext } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { notificationService } from '../../core/services/notificationService.js';
import { logger } from '../../shared/utils/logger.js';

const router = express.Router();

router.get('/status', authenticateToken, tenantContext, async (req, res) => {
    try {
        const tenantConnections = notificationService.getTenantConnectedClientsCount(req.tenantId);
        const userConnections = notificationService.getUserConnectedClientsCount(req.user.id);

        res.json({
            tenant: {
                id: req.tenantId,
                connections: tenantConnections
            },
            user: {
                id: req.user.id,
                connections: userConnections
            },
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        logger.error({ err: error, tenantId: req.tenantId }, 'Failed to get notification status');
        res.status(500).json({ error: 'Failed to get notification status' });
    }
});

router.post('/test', authenticateToken, tenantContext, requirePermission('system', 'admin'), async (req, res) => {
    try {
        const { type = 'user', event = 'test:notification', message = 'Test notification' } = req.body;

        if (type === 'tenant') {
            notificationService.emitToTenant(req.tenantId, event, {
                title: 'Test Notification',
                message,
                level: 'info',
                test: true
            });
        } else if (type === 'user') {
            notificationService.emitToUser(req.user.id, event, {
                title: 'Test Notification',
                message,
                level: 'info',
                test: true
            });
        } else if (type === 'broadcast') {
            notificationService.broadcast(event, {
                title: 'Test Broadcast',
                message,
                level: 'info',
                test: true
            });
        } else {
            return res.status(400).json({ error: 'Invalid notification type' });
        }

        res.json({ 
            success: true, 
            message: `Test notification sent to ${type}`,
            event
        });
    } catch (error) {
        logger.error({ err: error, tenantId: req.tenantId }, 'Failed to send test notification');
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

router.post('/broadcast', authenticateToken, requirePermission('system', 'admin'), async (req, res) => {
    try {
        const { event, title, message, level = 'info', data = {} } = req.body;

        if (!event || !message) {
            return res.status(400).json({ error: 'Event and message are required' });
        }

        notificationService.broadcast(event, {
            title: title || 'System Broadcast',
            message,
            level,
            data
        });

        res.json({ 
            success: true, 
            message: 'Broadcast sent successfully',
            event
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to broadcast notification');
        res.status(500).json({ error: 'Failed to broadcast notification' });
    }
});

router.post('/system', authenticateToken, tenantContext, requirePermission('system', 'admin'), async (req, res) => {
    try {
        const { title, message, level = 'info', data = {} } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        notificationService.systemNotification(req.tenantId, {
            title: title || 'System Notification',
            message,
            level,
            data
        });

        res.json({ 
            success: true, 
            message: 'System notification sent successfully'
        });
    } catch (error) {
        logger.error({ err: error, tenantId: req.tenantId }, 'Failed to send system notification');
        res.status(500).json({ error: 'Failed to send system notification' });
    }
});

export default router;
