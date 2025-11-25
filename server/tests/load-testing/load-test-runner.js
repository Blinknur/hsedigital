import autocannon from 'autocannon';
import { LOAD_TEST_CONFIG } from './load-test.config.js';
import { MetricsCollector } from './metrics-collector.js';
import { AuthHelper } from './auth-helper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LoadTestRunner {
  constructor(baseUrl = LOAD_TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.config = LOAD_TEST_CONFIG;
    this.metricsCollector = new MetricsCollector();
    this.authHelper = new AuthHelper();
    this.results = [];
  }

  async runSingleEndpointTest(endpointKey, scenarioName = 'moderate', user = null) {
    const endpoint = this.config.endpoints[endpointKey];
    const scenario = this.config.scenarios[scenarioName];

    if (!endpoint || !scenario) {
      throw new Error(`Invalid endpoint (${endpointKey}) or scenario (${scenarioName})`);
    }

    console.log(`\n🚀 Running ${scenarioName} test for ${endpointKey}...`);
    console.log(`   Duration: ${scenario.duration}s, Connections: ${scenario.connections}, Pipelining: ${scenario.pipelining}`);

    const url = `${this.baseUrl}${endpoint.path}`;
    const headers = endpoint.requiresAuth && user ? this.authHelper.getAuthHeaders(user) : {};

    const testConfig = {
      url,
      connections: scenario.connections,
      pipelining: scenario.pipelining,
      duration: scenario.duration,
      method: endpoint.method || 'GET',
      headers,
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      setupClient: (client) => {
        client.on('response', (statusCode, resBytes, responseTime) => {
          this.metricsCollector.recordRequest(responseTime, statusCode, endpointKey);
        });
      }
    };

    this.metricsCollector.start();

    try {
      const result = await autocannon(testConfig);
      this.metricsCollector.stop();

      const detailedMetrics = this.metricsCollector.getDetailedReport();
      
      const testResult = {
        endpoint: endpointKey,
        scenario: scenarioName,
        timestamp: new Date().toISOString(),
        autocannon: {
          requests: {
            total: result.requests.total,
            average: result.requests.average,
            mean: result.requests.mean,
            stddev: result.requests.stddev,
            min: result.requests.min,
            max: result.requests.max
          },
          latency: {
            mean: result.latency.mean,
            stddev: result.latency.stddev,
            min: result.latency.min,
            max: result.latency.max,
            p50: result.latency.p50,
            p75: result.latency.p75,
            p90: result.latency.p90,
            p99: result.latency.p99,
            p999: result.latency.p999
          },
          throughput: {
            mean: result.throughput.mean,
            stddev: result.throughput.stddev,
            min: result.throughput.min,
            max: result.throughput.max
          },
          errors: result.errors,
          timeouts: result.timeouts,
          non2xx: result.non2xx,
          duration: result.duration
        },
        customMetrics: detailedMetrics,
        thresholdsPassed: this.evaluateThresholds(detailedMetrics.summary)
      };

      this.results.push(testResult);
      this.printTestSummary(testResult);
      
      return testResult;
    } catch (error) {
      this.metricsCollector.stop();
      console.error(`❌ Test failed for ${endpointKey}:`, error.message);
      throw error;
    }
  }

  async runMultiEndpointTest(endpointKeys, scenarioName = 'moderate', user = null) {
    console.log(`\n📊 Running multi-endpoint test: ${endpointKeys.join(', ')}`);
    const results = [];

    for (const endpointKey of endpointKeys) {
      const result = await this.runSingleEndpointTest(endpointKey, scenarioName, user);
      results.push(result);
      await this.sleep(2000);
    }

    return results;
  }

  async runConcurrentTenantTest(tenants, endpointKeys, scenarioName = 'moderate') {
    console.log(`\n🏢 Running concurrent tenant test with ${tenants.length} tenants...`);
    
    const promises = tenants.map(async (tenant, index) => {
      const user = tenant.users[0];
      console.log(`   Tenant ${index + 1}: ${tenant.organization.id}`);
      
      const results = [];
      for (const endpointKey of endpointKeys) {
        const result = await this.runSingleEndpointTest(endpointKey, scenarioName, user);
        results.push(result);
      }
      
      return { tenant: tenant.organization.id, results };
    });

    return await Promise.all(promises);
  }

  evaluateThresholds(summary) {
    const thresholds = this.config.thresholds;
    const passed = {
      p50: summary.latency.p50 <= thresholds.p50,
      p95: summary.latency.p95 <= thresholds.p95,
      p99: summary.latency.p99 <= thresholds.p99,
      errorRate: parseFloat(summary.requests.errorRate) <= thresholds.maxErrorRate * 100,
      throughput: summary.throughput.requestsPerSecond >= thresholds.minThroughput
    };

    passed.all = Object.values(passed).every(v => v === true);
    return passed;
  }

  printTestSummary(result) {
    console.log(`\n📈 Test Summary for ${result.endpoint}:`);
    console.log(`   Total Requests: ${result.autocannon.requests.total}`);
    console.log(`   Throughput: ${result.autocannon.throughput.mean.toFixed(2)} req/sec`);
    console.log(`   Latency (mean): ${result.autocannon.latency.mean.toFixed(2)}ms`);
    console.log(`   Latency (p95): ${result.autocannon.latency.p95.toFixed(2)}ms`);
    console.log(`   Latency (p99): ${result.autocannon.latency.p99.toFixed(2)}ms`);
    console.log(`   Errors: ${result.autocannon.errors}`);
    console.log(`   Non-2xx: ${result.autocannon.non2xx}`);
    console.log(`   Memory (peak): ${result.customMetrics.summary.resources.memory.peak.toFixed(2)} MB`);
    
    const thresholds = result.thresholdsPassed;
    console.log(`\n✅ Thresholds: ${thresholds.all ? 'PASSED' : 'FAILED'}`);
    console.log(`   P50 (${result.customMetrics.summary.latency.p50.toFixed(2)}ms): ${thresholds.p50 ? '✅' : '❌'}`);
    console.log(`   P95 (${result.customMetrics.summary.latency.p95.toFixed(2)}ms): ${thresholds.p95 ? '✅' : '❌'}`);
    console.log(`   P99 (${result.customMetrics.summary.latency.p99.toFixed(2)}ms): ${thresholds.p99 ? '✅' : '❌'}`);
    console.log(`   Error Rate (${result.customMetrics.summary.requests.errorRate}): ${thresholds.errorRate ? '✅' : '❌'}`);
    console.log(`   Throughput (${result.customMetrics.summary.throughput.requestsPerSecond.toFixed(2)} req/s): ${thresholds.throughput ? '✅' : '❌'}`);
  }

  async saveResults(filename = null) {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filepath = path.join(resultsDir, filename || `load-test-${timestamp}.json`);

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        baseUrl: this.baseUrl,
        totalTests: this.results.length
      },
      results: this.results,
      summary: this.generateOverallSummary()
    };

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    
    return filepath;
  }

  generateOverallSummary() {
    if (this.results.length === 0) return null;

    const allLatencies = this.results.map(r => r.autocannon.latency.mean);
    const allThroughputs = this.results.map(r => r.autocannon.throughput.mean);
    const allErrors = this.results.reduce((sum, r) => sum + r.autocannon.errors, 0);
    const allRequests = this.results.reduce((sum, r) => sum + r.autocannon.requests.total, 0);

    return {
      averageLatency: allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length,
      averageThroughput: allThroughputs.reduce((a, b) => a + b, 0) / allThroughputs.length,
      totalErrors: allErrors,
      totalRequests: allRequests,
      errorRate: allRequests > 0 ? (allErrors / allRequests * 100).toFixed(2) + '%' : '0%',
      testsPassed: this.results.filter(r => r.thresholdsPassed.all).length,
      testsFailed: this.results.filter(r => !r.thresholdsPassed.all).length
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset() {
    this.results = [];
    this.metricsCollector.reset();
  }
}
