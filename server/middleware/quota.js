import { checkQuota, incrementUsage, checkFeatureAccess } from '../services/quotaService.js';

export const requireQuota = (resource) => {
    return async (req, res, next) => {
        try {
            const organizationId = req.tenantId;
            if (!organizationId) {
                return res.status(403).json({ 
                    error: 'No organization context',
                    code: 'NO_ORG_CONTEXT'
                });
            }
            
            const adminOverride = req.user?.role === 'Admin' && req.headers['x-admin-override'] === 'true';
            
            const quotaCheck = await checkQuota(organizationId, resource, adminOverride);
            
            if (!quotaCheck.allowed) {
                return res.status(403).json({
                    error: 'Quota exceeded',
                    code: 'QUOTA_EXCEEDED',
                    resource,
                    limit: quotaCheck.limit,
                    current: quotaCheck.current,
                    plan: quotaCheck.plan,
                    upgrade_required: true
                });
            }
            
            req.quotaCheck = quotaCheck;
            next();
        } catch (error) {
            console.error('Quota middleware error:', error);
            res.status(500).json({ error: 'Failed to check quota' });
        }
    };
};

export const trackUsage = (resource) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        
        res.json = function(data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const organizationId = req.tenantId;
                if (organizationId) {
                    incrementUsage(organizationId, resource)
                        .catch(err => console.error('Failed to increment usage:', err));
                }
            }
            return originalJson(data);
        };
        
        next();
    };
};

export const requireFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            const organizationId = req.tenantId;
            if (!organizationId) {
                return res.status(403).json({ 
                    error: 'No organization context',
                    code: 'NO_ORG_CONTEXT'
                });
            }
            
            const hasAccess = await checkFeatureAccess(organizationId, featureName);
            
            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Feature not available',
                    code: 'FEATURE_NOT_AVAILABLE',
                    feature: featureName,
                    upgrade_required: true
                });
            }
            
            next();
        } catch (error) {
            console.error('Feature check middleware error:', error);
            res.status(500).json({ error: 'Failed to check feature access' });
        }
    };
};
