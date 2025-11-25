import { LoadTestRunner } from '../load-test-runner.js';
import { setupLoadTestData } from '../test-data-generator.js';
import { fileURLToPath } from 'url';

export async function runSmokeTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('🔥 SMOKE TEST - Quick validation');
  console.log('═══════════════════════════════════════════════\n');

  const runner = new LoadTestRunner();
  
  console.log('Setting up test data (1 tenant, small dataset)...');
  const { tenants, generator } = await setupLoadTestData(1, 'small');
  const testUser = tenants[0].users[0];

  try {
    await runner.runMultiEndpointTest(
      ['health', 'stations', 'audits', 'incidents'],
      'smoke',
      testUser
    );

    await runner.saveResults('smoke-test-results.json');

    const summary = runner.generateOverallSummary();
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Average Latency: ${summary.averageLatency.toFixed(2)}ms`);
    console.log(`Average Throughput: ${summary.averageThroughput.toFixed(2)} req/s`);
    console.log(`Error Rate: ${summary.errorRate}`);
    console.log(`Tests Passed: ${summary.testsPassed}/${summary.testsPassed + summary.testsFailed}`);
    console.log('═══════════════════════════════════════════════\n');

    return { success: summary.testsPassed === runner.results.length, summary };
  } finally {
    await generator.cleanup(tenants.map(t => t.organization.id));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSmokeTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('Smoke test failed:', err);
      process.exit(1);
    });
}
