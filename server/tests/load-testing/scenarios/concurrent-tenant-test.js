import { LoadTestRunner } from '../load-test-runner.js';
import { setupLoadTestData } from '../test-data-generator.js';
import { fileURLToPath } from 'url';

export async function runConcurrentTenantTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('🏢 CONCURRENT TENANT TEST - Multi-tenant isolation');
  console.log('═══════════════════════════════════════════════\n');

  const runner = new LoadTestRunner();
  const tenantCount = parseInt(process.env.CONCURRENT_TENANTS) || 10;
  
  console.log(`Setting up test data (${tenantCount} tenants, medium dataset)...`);
  const { tenants, generator } = await setupLoadTestData(tenantCount, 'medium');

  try {
    const endpoints = ['stations', 'audits', 'incidents'];
    
    console.log(`\n🚀 Running concurrent tests across ${tenantCount} tenants...`);
    const results = await runner.runConcurrentTenantTest(tenants, endpoints, 'moderate');

    await runner.saveResults('concurrent-tenant-test-results.json');

    const summary = runner.generateOverallSummary();
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 CONCURRENT TENANT TEST SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Tenants Tested: ${tenantCount}`);
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Average Latency: ${summary.averageLatency.toFixed(2)}ms`);
    console.log(`Average Throughput: ${summary.averageThroughput.toFixed(2)} req/s`);
    console.log(`Error Rate: ${summary.errorRate}`);
    console.log(`Tests Passed: ${summary.testsPassed}/${summary.testsPassed + summary.testsFailed}`);
    
    console.log('\n📈 Per-Tenant Performance:');
    results.forEach((result, index) => {
      const avgLatency = result.results.reduce((sum, r) => sum + r.autocannon.latency.mean, 0) / result.results.length;
      console.log(`   Tenant ${index + 1}: ${avgLatency.toFixed(2)}ms avg latency`);
    });
    
    console.log('═══════════════════════════════════════════════\n');

    return { success: summary.testsPassed === runner.results.length, summary, results };
  } finally {
    await generator.cleanup(tenants.map(t => t.organization.id));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runConcurrentTenantTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('Concurrent tenant test failed:', err);
      process.exit(1);
    });
}
