import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export function validateRequiredEnvVars() {
    const required = ['JWT_SECRET', 'REFRESH_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please configure these variables in your .env file before starting the server.');
        console.error('See config/README.md for environment setup instructions.');
        process.exit(1);
    }
}

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    
    database: {
        url: process.env.DATABASE_URL,
        connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10),
        connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10),
        poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10000', 10),
        poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    },
    
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.REFRESH_SECRET,
    },
    
    redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },
    
    queue: {
        host: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
        password: process.env.QUEUE_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
        maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
        backoffDelay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000', 10),
    },
    
    client: {
        url: process.env.CLIENT_URL || 'http://localhost:5173',
        corsOrigin: process.env.CORS_ORIGIN || '*',
    },
    
    integrations: {
        googleAI: {
            apiKey: process.env.API_KEY,
        },
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            prices: {
                starter: process.env.STRIPE_PRICE_STARTER,
                professional: process.env.STRIPE_PRICE_PROFESSIONAL,
                enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
            },
        },
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    },
    
    monitoring: {
        logLevel: process.env.LOG_LEVEL || 'info',
        slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10),
        sentry: {
            dsn: process.env.SENTRY_DSN,
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
            profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
            release: process.env.SENTRY_RELEASE,
            dist: process.env.SENTRY_DIST,
        },
        otel: {
            enabled: process.env.OTEL_ENABLED === 'true',
            serviceName: process.env.OTEL_SERVICE_NAME || 'hse-digital-backend',
            endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
            headers: process.env.OTEL_EXPORTER_OTLP_HEADERS || '{}',
        },
        tracing: {
            sampleRates: {
                enterprise: parseFloat(process.env.TRACE_SAMPLE_RATE_ENTERPRISE || '1.0'),
                professional: parseFloat(process.env.TRACE_SAMPLE_RATE_PROFESSIONAL || '0.5'),
                starter: parseFloat(process.env.TRACE_SAMPLE_RATE_STARTER || '0.1'),
                free: parseFloat(process.env.TRACE_SAMPLE_RATE_FREE || '0.01'),
                default: parseFloat(process.env.TRACE_SAMPLE_RATE_DEFAULT || '0.1'),
            },
        },
    },
    
    alerting: {
        errorRateThreshold: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || '0.05'),
        responseTimeMs: parseInt(process.env.ALERT_RESPONSE_TIME_MS || '5000', 10),
        dbQueryTimeMs: parseInt(process.env.ALERT_DB_QUERY_TIME_MS || '2000', 10),
        rateLimitHits: parseInt(process.env.ALERT_RATE_LIMIT_HITS || '100', 10),
        emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        slackWebhook: process.env.SLACK_WEBHOOK_URL,
        pagerDutyKey: process.env.PAGERDUTY_INTEGRATION_KEY,
    },
    
    aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3: {
            bucketName: process.env.S3_BUCKET_NAME,
            reportsPrefix: process.env.S3_REPORTS_PREFIX || 'reports/',
        },
    },
    
    reports: {
        storageType: process.env.REPORTS_STORAGE_TYPE || 's3',
        localPath: process.env.REPORTS_LOCAL_PATH || './public/reports',
        retentionDays: parseInt(process.env.REPORT_RETENTION_DAYS || '90', 10),
    },
    
    backup: {
        dir: process.env.BACKUP_DIR || '/var/backups/hse-digital',
        s3Enabled: process.env.S3_ENABLED === 'true',
        s3Bucket: process.env.S3_BUCKET,
        s3Region: process.env.S3_REGION || 'us-east-1',
        s3Prefix: process.env.S3_PREFIX || 'backups/',
        notificationEmail: process.env.NOTIFICATION_EMAIL,
        notificationWebhook: process.env.NOTIFICATION_WEBHOOK,
    },
    
    audit: {
        retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365', 10),
    },
    
    multiRegion: {
        deploymentRegion: process.env.DEPLOYMENT_REGION || 'US_EAST',
        cdnEnabled: process.env.CDN_ENABLED === 'true',
        cdnProvider: process.env.CDN_PROVIDER || 'cloudflare',
        autoFailoverEnabled: process.env.AUTO_FAILOVER_ENABLED === 'true',
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
        healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
        maxConsecutiveFailures: parseInt(process.env.MAX_CONSECUTIVE_FAILURES || '3', 10),
    },
};

export function loadEnvironmentConfig(environment) {
    const envFile = path.resolve(__dirname, `environments/.env.${environment}`);
    dotenv.config({ path: envFile, override: true });
}

export function isDevelopment() {
    return config.env === 'development';
}

export function isProduction() {
    return config.env === 'production';
}

export function isStaging() {
    return config.env === 'staging';
}

export function isTest() {
    return config.env === 'test';
}

export default config;
