import crypto from 'crypto';

const csrfTokenStore = new Map();
const TOKEN_EXPIRY = 60 * 60 * 1000;

const generateCSRFToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const verifyCSRFToken = (token, sessionId) => {
    const stored = csrfTokenStore.get(sessionId);
    
    if (!stored) return false;
    
    if (Date.now() - stored.timestamp > TOKEN_EXPIRY) {
        csrfTokenStore.delete(sessionId);
        return false;
    }
    
    return stored.token === token;
};

export const csrfProtection = () => {
    return (req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            const sessionId = req.headers['x-session-id'] || req.user?.id || 'anonymous';
            const token = generateCSRFToken();
            
            csrfTokenStore.set(sessionId, {
                token,
                timestamp: Date.now()
            });
            
            res.setHeader('X-CSRF-Token', token);
            return next();
        }
        
        const token = req.headers['x-csrf-token'] || req.body?._csrf;
        const sessionId = req.headers['x-session-id'] || req.user?.id;
        
        if (!token || !sessionId) {
            return res.status(403).json({
                error: 'CSRF token missing'
            });
        }
        
        if (!verifyCSRFToken(token, sessionId)) {
            return res.status(403).json({
                error: 'Invalid CSRF token'
            });
        }
        
        next();
    };
};

export const generateCSRFMiddleware = () => {
    return (req, res, next) => {
        const sessionId = req.headers['x-session-id'] || req.user?.id || 'anonymous';
        const token = generateCSRFToken();
        
        csrfTokenStore.set(sessionId, {
            token,
            timestamp: Date.now()
        });
        
        req.csrfToken = () => token;
        res.locals.csrfToken = token;
        
        next();
    };
};

setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of csrfTokenStore.entries()) {
        if (now - data.timestamp > TOKEN_EXPIRY) {
            csrfTokenStore.delete(sessionId);
        }
    }
}, TOKEN_EXPIRY);
