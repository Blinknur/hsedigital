import { LoadTestRunner } from '../load-test-runner.js';
import { setupLoadTestData } from '../test-data-generator.js';
import { fileURLToPath } from 'url';

export async function runEnduranceTest() {
  console.log('═══════════════════════════════════════════════');
  console.log('⏱️  ENDURANCE TEST - Long-duration stability');
  console.log('═══════════════════════════════════════════════\n');

  const runner = new LoadTestRunner();
  const duration = parseInt(process.env.ENDURANCE_DURATION) || 600;
  
  console.log('Setting up test data (3 tenants, large dataset)...');
  const { tenants, generator } = await setupLoadTestData(3, 'large');

  try {
    const endpoints = ['stations', 'audits', 'incidents', 'contractors'];
    const iterations = Math.floor(duration / 120);
    
    console.log(`\n🏃 Running endurance test for ~${duration} seconds (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      const tenant = tenants[i % tenants.length];
      const testUser = tenant.users[0];
      
      console.log(`\n📍 Iteration ${i + 1}/${iterations} - Tenant ${(i % tenants.length) + 1}`);
      
      for (const endpoint of endpoints) {
        await runner.runSingleEndpointTest(endpoint, 'moderate', testUser);
        await runner.sleep(2000);
      }
      
      if (i < iterations - 1) {
        console.log('   💤 Cooling down for 10 seconds...');
        await runner.sleep(10000);
      }
    }

    await runner.saveResults('endurance-test-results.json');

    const summary = runner.generateOverallSummary();
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 ENDURANCE TEST SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Test Duration: ~${duration} seconds`);
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Average Latency: ${summary.averageLatency.toFixed(2)}ms`);
    console.log(`Average Throughput: ${summary.averageThroughput.toFixed(2)} req/s`);
    console.log(`Error Rate: ${summary.errorRate}`);
    console.log(`Tests Passed: ${summary.testsPassed}/${summary.testsPassed + summary.testsFailed}`);
    
    console.log('\n📈 Stability Analysis:');
    const firstQuarter = runner.results.slice(0, Math.floor(runner.results.length / 4));
    const lastQuarter = runner.results.slice(-Math.floor(runner.results.length / 4));
    
    const avgLatencyFirst = firstQuarter.reduce((sum, r) => sum + r.autocannon.latency.mean, 0) / firstQuarter.length;
    const avgLatencyLast = lastQuarter.reduce((sum, r) => sum + r.autocannon.latency.mean, 0) / lastQuarter.length;
    const degradation = ((avgLatencyLast - avgLatencyFirst) / avgLatencyFirst * 100).toFixed(2);
    
    console.log(`   First 25%: ${avgLatencyFirst.toFixed(2)}ms avg latency`);
    console.log(`   Last 25%: ${avgLatencyLast.toFixed(2)}ms avg latency`);
    console.log(`   Degradation: ${degradation}%`);
    
    console.log('═══════════════════════════════════════════════\n');

    const stable = Math.abs(parseFloat(degradation)) < 20;
    return { success: summary.testsPassed === runner.results.length && stable, summary, degradation };
  } finally {
    await generator.cleanup(tenants.map(t => t.organization.id));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runEnduranceTest()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('Endurance test failed:', err);
      process.exit(1);
    });
}
