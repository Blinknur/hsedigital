import { LoadTestRunner } from '../load-test-runner.js';
import { setupLoadTestData } from '../test-data-generator.js';
import { fileURLToPath } from 'url';

export async function runSpikeTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('⚡ SPIKE TEST - Sudden traffic surge handling');
  console.log('═══════════════════════════════════════════════\n');

  const runner = new LoadTestRunner();
  
  console.log('Setting up test data (3 tenants, small dataset)...');
  const { tenants, generator } = await setupLoadTestData(3, 'small');

  try {
    console.log('\n🔄 Phase 1: Normal load (light scenario)');
    const testUser = tenants[0].users[0];
    await runner.runSingleEndpointTest('stations', 'light', testUser);
    await runner.sleep(3000);

    console.log('\n⚡ Phase 2: SPIKE! (spike scenario)');
    await runner.runSingleEndpointTest('stations', 'spike', testUser);
    await runner.sleep(3000);

    console.log('\n🔄 Phase 3: Recovery (light scenario)');
    await runner.runSingleEndpointTest('stations', 'light', testUser);

    await runner.saveResults('spike-test-results.json');

    const summary = runner.generateOverallSummary();
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 SPIKE TEST SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Average Latency: ${summary.averageLatency.toFixed(2)}ms`);
    console.log(`Average Throughput: ${summary.averageThroughput.toFixed(2)} req/s`);
    console.log(`Error Rate: ${summary.errorRate}`);
    console.log(`Tests Passed: ${summary.testsPassed}/${summary.testsPassed + summary.testsFailed}`);
    
    console.log('\n📈 Phase Breakdown:');
    runner.results.forEach((result, index) => {
      const phase = index === 0 ? 'Normal' : index === 1 ? 'SPIKE' : 'Recovery';
      console.log(`   ${phase}: ${result.autocannon.latency.mean.toFixed(2)}ms latency, ${result.autocannon.throughput.mean.toFixed(2)} req/s`);
    });
    
    console.log('═══════════════════════════════════════════════\n');

    return { success: summary.errorRate === '0%' || parseFloat(summary.errorRate) < 5, summary };
  } finally {
    await generator.cleanup(tenants.map(t => t.organization.id));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSpikeTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('Spike test failed:', err);
      process.exit(1);
    });
}
