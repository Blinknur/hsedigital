import helmet from 'helmet';

export const securityHeaders = () => {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                connectSrc: ["'self'", "https://api.stripe.com"],
                frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            }
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        frameguard: {
            action: 'deny'
        },
        xssFilter: true,
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
        }
    });
};

export const additionalSecurityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    res.removeHeader('X-Powered-By');
    
    next();
};
