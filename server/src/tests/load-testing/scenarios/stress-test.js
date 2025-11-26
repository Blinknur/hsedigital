import { LoadTestRunner } from '../load-test-runner.js';
import { setupLoadTestData } from '../test-data-generator.js';
import { fileURLToPath } from 'url';

export async function runStressTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('💪 STRESS TEST - High load sustained testing');
  console.log('═══════════════════════════════════════════════\n');

  const runner = new LoadTestRunner();
  
  console.log('Setting up test data (5 tenants, medium dataset)...');
  const { tenants, generator } = await setupLoadTestData(5, 'medium');

  try {
    const endpoints = ['stations', 'audits', 'incidents', 'contractors'];
    
    for (const tenant of tenants) {
      const testUser = tenant.users[0];
      console.log(`\n🏢 Testing tenant: ${tenant.organization.id}`);
      
      await runner.runMultiEndpointTest(endpoints, 'stress', testUser);
      await runner.sleep(5000);
    }

    await runner.saveResults('stress-test-results.json');

    const summary = runner.generateOverallSummary();
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 STRESS TEST SUMMARY');
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
  runStressTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('Stress test failed:', err);
      process.exit(1);
    });
}
