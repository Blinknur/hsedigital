# Load Testing Suite - HSE.Digital

Comprehensive load testing framework for measuring API performance, identifying bottlenecks, and capacity planning.

## Overview

This load testing suite simulates realistic concurrent tenant operations with various data volumes to evaluate system performance under different load conditions.

## Features

- **Multi-Scenario Testing**: Smoke, stress, spike, endurance, and concurrent tenant tests
- **Realistic Data Generation**: Automatically generates tenants with realistic data volumes
- **Comprehensive Metrics**: Latency percentiles, throughput, error rates, resource usage
- **Multi-Tenant Isolation**: Tests tenant isolation under concurrent load
- **Automated Reporting**: HTML and Markdown reports with detailed analysis
- **Threshold Validation**: Configurable performance thresholds

## Test Scenarios

### 1. Smoke Test (Quick Validation)
- **Duration**: 30 seconds
- **Connections**: 10
- **Purpose**: Basic functionality check
- **Usage**: `node scenarios/smoke-test.js`

### 2. Stress Test (High Load)
- **Duration**: 5 minutes
- **Connections**: 500
- **Purpose**: System behavior under sustained high load
- **Usage**: `node scenarios/stress-test.js`

### 3. Concurrent Tenant Test
- **Duration**: 2 minutes per tenant
- **Tenants**: Configurable (default: 10)
- **Purpose**: Multi-tenant isolation and performance
- **Usage**: `CONCURRENT_TENANTS=20 node scenarios/concurrent-tenant-test.js`

### 4. Spike Test (Traffic Surge)
- **Duration**: 60 seconds
- **Connections**: Up to 1000
- **Purpose**: Recovery from sudden traffic spikes
- **Usage**: `node scenarios/spike-test.js`

### 5. Endurance Test (Long Duration)
- **Duration**: 10+ minutes
- **Connections**: 100
- **Purpose**: Memory leaks and performance degradation
- **Usage**: `ENDURANCE_DURATION=1800 node scenarios/endurance-test.js`

## Installation

```bash
cd server
npm install
```

## Configuration

Edit `load-test.config.js` to customize:

```javascript
{
  scenarios: {
    moderate: {
      duration: 120,
      connections: 100,
      pipelining: 5
    }
  },
  thresholds: {
    p50: 200,    // 50th percentile < 200ms
    p95: 500,    // 95th percentile < 500ms
    p99: 1000,   // 99th percentile < 1000ms
    maxErrorRate: 0.05,  // < 5% error rate
    minThroughput: 100   // > 100 req/s
  },
  tenants: {
    concurrent: 10,
    dataVolumes: {
      small: { stations: 10, audits: 50, incidents: 20 },
      medium: { stations: 100, audits: 500, incidents: 200 },
      large: { stations: 1000, audits: 5000, incidents: 2000 }
    }
  }
}
```

## Usage

### Run Individual Tests

```bash
# Smoke test (quick validation)
cd server
node tests/load-testing/scenarios/smoke-test.js

# Stress test
node tests/load-testing/scenarios/stress-test.js

# Concurrent tenant test with custom tenant count
CONCURRENT_TENANTS=20 node tests/load-testing/scenarios/concurrent-tenant-test.js

# Spike test
node tests/load-testing/scenarios/spike-test.js

# Endurance test with custom duration (seconds)
ENDURANCE_DURATION=1800 node tests/load-testing/scenarios/endurance-test.js
```

### Run Complete Test Suite

```bash
# Run all tests
node tests/load-testing/run-all-tests.js

# Skip endurance test (saves time)
SKIP_ENDURANCE=true node tests/load-testing/run-all-tests.js
```

### Generate Reports

```bash
# Auto-generated after each test run
# Or manually generate from results file:
node tests/load-testing/report-generator.js results/complete-test-suite-2024-01-15T10-30-00.json
```

## Docker Testing

```bash
# Start services
npm run docker:up

# Wait for services to be ready
npm run docker:health

# Run tests against Docker instance
BASE_URL=http://localhost:3001 node tests/load-testing/run-all-tests.js

# Clean up
npm run docker:down
```

## Metrics Collected

### Request Metrics
- Total requests
- Successful/failed requests
- Error rate
- Response time distribution (min, max, mean, p50, p75, p90, p95, p99)

### Throughput Metrics
- Requests per second
- Requests per minute
- Peak throughput

### Resource Metrics
- Memory usage (RSS, heap, external)
- CPU usage (user, system)
- System load average

### Per-Endpoint Metrics
- Individual endpoint performance
- Endpoint-specific error rates
- Comparative analysis

## Performance Thresholds

Default thresholds (configurable):

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| P50 Latency | < 200ms | Median response time |
| P95 Latency | < 500ms | 95% of requests |
| P99 Latency | < 1000ms | 99% of requests |
| Error Rate | < 5% | Request failures |
| Throughput | > 100 req/s | Minimum capacity |

## Results Analysis

### Result Files

All test results are saved in `server/tests/load-testing/results/`:

- `*-test-results.json` - Individual test results
- `complete-test-suite-*.json` - Full suite results
- `report-*.html` - HTML report
- `report-*.md` - Markdown report

### Key Metrics to Monitor

1. **Latency Trends**: Check if p95/p99 stay within thresholds
2. **Error Rates**: Should remain under 5%
3. **Throughput**: Should meet minimum requirements
4. **Memory Growth**: Monitor for leaks in endurance tests
5. **Tenant Isolation**: Verify consistent performance across tenants

## Capacity Planning Recommendations

Based on test results:

### Small Deployment (< 10 tenants)
- **CPU**: 2 cores
- **Memory**: 2GB
- **Expected Load**: 50 req/s
- **Data Volume**: Small datasets

### Medium Deployment (10-50 tenants)
- **CPU**: 4 cores
- **Memory**: 4GB
- **Expected Load**: 200 req/s
- **Data Volume**: Medium datasets

### Large Deployment (50+ tenants)
- **CPU**: 8+ cores
- **Memory**: 8GB+
- **Expected Load**: 500+ req/s
- **Data Volume**: Large datasets
- **Considerations**: Load balancing, database replication

## Bottleneck Identification

### Common Bottlenecks

1. **Database Queries**
   - Monitor slow query logs
   - Check index usage
   - Optimize N+1 queries

2. **Memory Usage**
   - Look for memory leaks in endurance tests
   - Monitor heap growth
   - Check for large object retention

3. **CPU Usage**
   - Identify CPU-intensive operations
   - Profile hot code paths
   - Consider caching

4. **Network I/O**
   - Monitor connection pool utilization
   - Check for connection leaks
   - Optimize payload sizes

### Diagnostic Steps

1. Run smoke test to establish baseline
2. Run stress test to identify breaking points
3. Run endurance test to detect memory leaks
4. Run concurrent tenant test to verify isolation
5. Analyze results and identify bottlenecks
6. Apply optimizations
7. Re-run tests to validate improvements

## Integration with Monitoring

Test results can be correlated with:

- **Prometheus Metrics**: `/metrics` endpoint
- **Grafana Dashboards**: Resource utilization
- **Jaeger Traces**: Request flow analysis
- **Sentry**: Error tracking

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/load-test.yml
name: Load Testing
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run docker:up
      - run: sleep 30
      - run: SKIP_ENDURANCE=true node tests/load-testing/run-all-tests.js
      - uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: server/tests/load-testing/results/
```

## Troubleshooting

### Tests Timing Out
- Increase scenario duration
- Check database connectivity
- Verify service health

### High Error Rates
- Check rate limiting configuration
- Verify authentication tokens
- Review application logs

### Inconsistent Results
- Ensure clean database state
- Run tests during low-traffic periods
- Increase warm-up time

### Resource Exhaustion
- Reduce concurrent connections
- Decrease data volumes
- Add delays between requests

## Best Practices

1. **Baseline First**: Run smoke test before heavy tests
2. **Clean State**: Always start with clean database
3. **Monitor Resources**: Watch system metrics during tests
4. **Gradual Increase**: Ramp up load gradually
5. **Document Results**: Keep historical data for comparison
6. **Test Regularly**: Run in CI/CD pipeline
7. **Realistic Data**: Use production-like data volumes

## Contributing

When adding new test scenarios:

1. Create scenario file in `scenarios/`
2. Follow existing patterns
3. Add to `run-all-tests.js`
4. Update this README
5. Test thoroughly

## Support

For issues or questions:
- Check existing test results
- Review application logs
- Check monitoring dashboards
- Contact DevOps team
