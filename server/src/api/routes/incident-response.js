import express from 'express';
import { incidentResponseService } from '../../core/services/incidentResponseService.js';
import { logger } from '../../shared/utils/logger.js';

const router = express.Router();

router.get('/incidents', async (req, res) => {
    try {
        const history = await incidentResponseService.getIncidentHistory();
        res.json(history);
    } catch (error) {
        logger.error({ error }, 'Failed to get incident history');
        res.status(500).json({ error: 'Failed to retrieve incident history' });
    }
});

router.get('/pool-health', async (req, res) => {
    try {
        const health = await incidentResponseService.checkDatabasePoolHealth();
        res.json(health);
    } catch (error) {
        logger.error({ error }, 'Failed to check pool health');
        res.status(500).json({ error: 'Failed to check pool health' });
    }
});

router.get('/pool-metrics', async (req, res) => {
    try {
        const metrics = await incidentResponseService.exportPoolMetrics();
        res.json(metrics);
    } catch (error) {
        logger.error({ error }, 'Failed to export pool metrics');
        res.status(500).json({ error: 'Failed to export pool metrics' });
    }
});

router.post('/incidents/:incidentId/resolve', async (req, res) => {
    try {
        const { incidentId } = req.params;
        const incident = await incidentResponseService.resolveIncident(incidentId);
        
        if (incident) {
            res.json({ success: true, incident });
        } else {
            res.status(404).json({ error: 'Incident not found' });
        }
    } catch (error) {
        logger.error({ error }, 'Failed to resolve incident');
        res.status(500).json({ error: 'Failed to resolve incident' });
    }
});

router.post('/collect-diagnostics', async (req, res) => {
    try {
        const { alertType = 'manual', alertData = {} } = req.body;
        
        const { incidentId, diagnosticsPath } = await incidentResponseService.handleCriticalAlert(
            alertType,
            alertData
        );
        
        res.json({
            success: true,
            incidentId,
            diagnosticsPath
        });
    } catch (error) {
        logger.error({ error }, 'Failed to collect diagnostics');
        res.status(500).json({ error: 'Failed to collect diagnostics' });
    }
});

export default router;
