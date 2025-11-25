import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
];

const sqlInjectionPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b|\bEXEC\b|\bEXECUTE\b)/i,
    /(;|\-\-|\/\*|\*\/|xp_|sp_)/,
];

const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    let sanitized = str.trim();
    
    dangerousPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
    });
    
    sanitized = sanitized
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    
    return sanitized;
};

const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const sanitizedKey = sanitizeString(key);
            sanitized[sanitizedKey] = sanitizeObject(value);
        }
        return sanitized;
    }
    
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    
    return obj;
};

const detectSQLInjection = (input) => {
    if (typeof input !== 'string') return false;
    
    return sqlInjectionPatterns.some(pattern => pattern.test(input));
};

const checkForSQLInjection = (obj) => {
    if (typeof obj === 'string') {
        return detectSQLInjection(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.some(item => checkForSQLInjection(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => checkForSQLInjection(value));
    }
    
    return false;
};

export const sanitizeRequest = (options = {}) => {
    const { skipBody = false, skipQuery = false, skipParams = false } = options;
    
    return (req, res, next) => {
        try {
            if (!skipBody && req.body) {
                if (checkForSQLInjection(req.body)) {
                    return res.status(400).json({
                        error: 'Potential SQL injection detected'
                    });
                }
                req.body = sanitizeObject(req.body);
            }
            
            if (!skipQuery && req.query) {
                if (checkForSQLInjection(req.query)) {
                    return res.status(400).json({
                        error: 'Potential SQL injection detected'
                    });
                }
                req.query = sanitizeObject(req.query);
            }
            
            if (!skipParams && req.params) {
                if (checkForSQLInjection(req.params)) {
                    return res.status(400).json({
                        error: 'Potential SQL injection detected'
                    });
                }
                req.params = sanitizeObject(req.params);
            }
            
            next();
        } catch (error) {
            console.error('Sanitization error:', error);
            return res.status(500).json({
                error: 'Request sanitization failed'
            });
        }
    };
};

export const sanitizeHTML = (html) => {
    return purify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href']
    });
};
