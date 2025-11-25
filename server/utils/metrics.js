import promClient from 'prom-client';

const register = new promClient.Registry();

promClient.collectDefaultMetrics({ 
  register,
  prefix: 'hse_digital_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

export const httpRequestDuration = new promClient.Histogram({
  name: 'hse_digital_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
});

export const httpRequestTotal = new promClient.Counter({
  name: 'hse_digital_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id']
});

export const httpRequestErrors = new promClient.Counter({
  name: 'hse_digital_http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code', 'tenant_id', 'error_type']
});

export const activeConnections = new promClient.Gauge({
  name: 'hse_digital_active_connections',
  help: 'Number of active connections',
  labelNames: ['tenant_id']
});

export const databaseQueryDuration = new promClient.Histogram({
  name: 'hse_digital_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['model', 'operation', 'tenant_id'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
});

export const databaseQueryTotal = new promClient.Counter({
  name: 'hse_digital_database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['model', 'operation', 'tenant_id', 'status']
});

export const cacheHitTotal = new promClient.Counter({
  name: 'hse_digital_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key', 'tenant_id']
});

export const cacheMissTotal = new promClient.Counter({
  name: 'hse_digital_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key', 'tenant_id']
});

export const rateLimitHitTotal = new promClient.Counter({
  name: 'hse_digital_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limit_type', 'tenant_id']
});

export const authAttemptsTotal = new promClient.Counter({
  name: 'hse_digital_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status', 'tenant_id']
});

export const authFailuresTotal = new promClient.Counter({
  name: 'hse_digital_auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['method', 'reason', 'tenant_id']
});

export const tenantRequestsTotal = new promClient.Counter({
  name: 'hse_digital_tenant_requests_total',
  help: 'Total number of requests per tenant',
  labelNames: ['tenant_id', 'endpoint']
});

export const tenantLatency = new promClient.Histogram({
  name: 'hse_digital_tenant_latency_seconds',
  help: 'Request latency per tenant',
  labelNames: ['tenant_id', 'endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

export const tenantErrorsTotal = new promClient.Counter({
  name: 'hse_digital_tenant_errors_total',
  help: 'Total number of errors per tenant',
  labelNames: ['tenant_id', 'error_type']
});

export const tenantFeatureUsage = new promClient.Counter({
  name: 'hse_digital_tenant_feature_usage_total',
  help: 'Total feature usage per tenant',
  labelNames: ['tenant_id', 'feature', 'action']
});

export const tenantApiCalls = new promClient.Counter({
  name: 'hse_digital_tenant_api_calls_total',
  help: 'Total API calls per tenant by endpoint',
  labelNames: ['tenant_id', 'endpoint', 'method', 'status_code']
});

export const tenantDataStorage = new promClient.Gauge({
  name: 'hse_digital_tenant_data_storage_bytes',
  help: 'Data storage usage per tenant in bytes',
  labelNames: ['tenant_id', 'data_type']
});

export const tenantResourceCost = new promClient.Gauge({
  name: 'hse_digital_tenant_resource_cost_estimate',
  help: 'Estimated resource cost per tenant',
  labelNames: ['tenant_id', 'resource_type']
});

export const tenantConcurrentUsers = new promClient.Gauge({
  name: 'hse_digital_tenant_concurrent_users',
  help: 'Number of concurrent users per tenant',
  labelNames: ['tenant_id']
});

export const tenantSubscriptionPlan = new promClient.Gauge({
  name: 'hse_digital_tenant_subscription_plan',
  help: 'Tenant subscription plan (0=free, 1=basic, 2=premium, 3=enterprise)',
  labelNames: ['tenant_id', 'plan']
});

export const tenantQuotaUsage = new promClient.Gauge({
  name: 'hse_digital_tenant_quota_usage_percent',
  help: 'Tenant quota usage percentage',
  labelNames: ['tenant_id', 'quota_type']
});

export const tenantDataTransfer = new promClient.Counter({
  name: 'hse_digital_tenant_data_transfer_bytes_total',
  help: 'Total data transfer per tenant',
  labelNames: ['tenant_id', 'direction']
});

export const tenantCacheOperations = new promClient.Counter({
  name: 'hse_digital_tenant_cache_operations_total',
  help: 'Total cache operations per tenant',
  labelNames: ['tenant_id', 'operation']
});

export const tenantDatabaseOperations = new promClient.Counter({
  name: 'hse_digital_tenant_database_operations_total',
  help: 'Total database operations per tenant',
  labelNames: ['tenant_id', 'operation_type']
});

export const tenantPerformanceScore = new promClient.Gauge({
  name: 'hse_digital_tenant_performance_score',
  help: 'Tenant performance score (0-100)',
  labelNames: ['tenant_id']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(databaseQueryTotal);
register.registerMetric(cacheHitTotal);
register.registerMetric(cacheMissTotal);
register.registerMetric(rateLimitHitTotal);
register.registerMetric(authAttemptsTotal);
register.registerMetric(authFailuresTotal);
register.registerMetric(tenantRequestsTotal);
register.registerMetric(tenantLatency);
register.registerMetric(tenantErrorsTotal);
register.registerMetric(tenantFeatureUsage);
register.registerMetric(tenantApiCalls);
register.registerMetric(tenantDataStorage);
register.registerMetric(tenantResourceCost);
register.registerMetric(tenantConcurrentUsers);
register.registerMetric(tenantSubscriptionPlan);
register.registerMetric(tenantQuotaUsage);
register.registerMetric(tenantDataTransfer);
register.registerMetric(tenantCacheOperations);
register.registerMetric(tenantDatabaseOperations);
register.registerMetric(tenantPerformanceScore);

export { register };
