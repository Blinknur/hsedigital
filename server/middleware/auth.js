import { authService } from '../services/authService.js';
import { tenantService } from '../services/tenantService.js';
import { tenantLogger } from '../utils/tenantLogger.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }

    const user = authService.verifyAccessToken(token);
    
    if (!user) {
        return res.sendStatus(403);
    }
    
    req.user = user;
    req.ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    req.userAgent = req.headers['user-agent'];
    next();
};

export const tenantContext = async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    let tenantId = null;

    if (user.role === 'Admin' && !user.organizationId) {
        tenantId = req.headers['x-tenant-id'] || null;
    } else {
        tenantId = user.organizationId;
    }
    
    if (!tenantId) {
        tenantLogger.logTenantAccessDenied(user.id, user.email, 'No tenant context');
        return res.status(403).json({ error: 'Access Denied: No Organization Context' });
    }

    const isValid = await tenantService.validateTenant(tenantId);
    if (!isValid) {
        tenantLogger.logTenantAccessDenied(user.id, user.email, `Invalid tenant: ${tenantId}`);
        return res.status(403).json({ error: 'Invalid organization' });
    }

    tenantLogger.logTenantSwitch(user.id, user.email, tenantId, req.path);
    req.tenantId = tenantId;
    next();
};
