import { setTenantContext, clearTenantContext } from '../../shared/utils/prismaClient.js';

export function withTenantContext(handler) {
    return async (req, res, next) => {
        try {
            if (req.tenantId) {
                setTenantContext(req.tenantId);
            }

            await handler(req, res, next);
        } finally {
            clearTenantContext();
        }
    };
}

export function applyTenantContext(req, res, next) {
    if (req.tenantId) {
        setTenantContext(req.tenantId);
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    res.json = function(...args) {
        clearTenantContext();
        return originalJson(...args);
    };
    
    res.send = function(...args) {
        clearTenantContext();
        return originalSend(...args);
    };

    res.on('finish', () => {
        clearTenantContext();
    });

    next();
}
