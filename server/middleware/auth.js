import { authService } from '../services/authService.js';

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
    next();
};

export const tenantContext = async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (user.role === 'Admin' && !user.organizationId) {
        req.tenantId = req.headers['x-tenant-id'] || null;
        return next();
    }
    
    if (!user.organizationId) {
        return res.status(403).json({ error: 'Access Denied: No Organization Context' });
    }
    
    req.tenantId = user.organizationId;
    next();
};
