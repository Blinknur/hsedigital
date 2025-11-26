import { runSmokeTest } from './scenarios/smoke-test.js';
import { runStressTest } from './scenarios/stress-test.js';
import { runConcurrentTenantTest } from './scenarios/concurrent-tenant-test.js';
import { runSpikeTest } from './scenarios/spike-test.js';
import { runEnduranceTest } from './scenarios/endurance-test.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  COMPREHENSIVE LOAD TEST SUITE                ║');
  console.log('║                      HSE.Digital Platform                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0
    }
  };

  const startTime = Date.now();

  const tests = [
    { name: 'Smoke Test', fn: runSmokeTest, required: true },
    { name: 'Stress Test', fn: runStressTest, required: false },
    { name: 'Concurrent Tenant Test', fn: runConcurrentTenantTest, required: true },
    { name: 'Spike Test', fn: runSpikeTest, required: false },
    { name: 'Endurance Test', fn: runEnduranceTest, required: false }
  ];

  const skipEndurance = process.env.SKIP_ENDURANCE === 'true';

  for (const test of tests) {
    if (skipEndurance && test.name === 'Endurance Test') {
      console.log(`⏭️  Skipping ${test.name} (SKIP_ENDURANCE=true)\n`);
      continue;
    }

    results.overall.total++;
    
    try {
      console.log(`\n▶️  Starting: ${test.name}`);
      const testStartTime = Date.now();
      
      const result = await test.fn();
      
      const testDuration = (Date.now() - testStartTime) / 1000;
      
      results.tests.push({
        name: test.name,
        success: result.success,
        duration: testDuration,
        summary: result.summary,
        required: test.required
      });

      if (result.success) {
        results.overall.passed++;
        console.log(`✅ ${test.name} PASSED (${testDuration.toFixed(2)}s)\n`);
      } else {
        results.overall.failed++;
        console.log(`❌ ${test.name} FAILED (${testDuration.toFixed(2)}s)\n`);
        
        if (test.required) {
          console.log(`🛑 Required test failed. Stopping test suite.\n`);
          break;
        }
      }
      
      await sleep(5000);
      
    } catch (error) {
      results.overall.failed++;
      console.error(`❌ ${test.name} ERROR: ${error.message}\n`);
      
      results.tests.push({
        name: test.name,
        success: false,
        error: error.message,
        required: test.required
      });

      if (test.required) {
        console.log(`🛑 Required test failed. Stopping test suite.\n`);
        break;
      }
    }
  }

  results.overall.duration = (Date.now() - startTime) / 1000;

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL TEST RESULTS                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Overall Results:`);
  console.log(`   Total Tests: ${results.overall.total}`);
  console.log(`   Passed: ${results.overall.passed} ✅`);
  console.log(`   Failed: ${results.overall.failed} ❌`);
  console.log(`   Duration: ${results.overall.duration.toFixed(2)}s`);
  
  console.log(`\n📋 Test Breakdown:`);
  results.tests.forEach(test => {
    const status = test.success ? '✅' : '❌';
    const required = test.required ? '[REQUIRED]' : '[OPTIONAL]';
    console.log(`   ${status} ${test.name} ${required}`);
    if (test.summary) {
      console.log(`      - Requests: ${test.summary.totalRequests}`);
      console.log(`      - Avg Latency: ${test.summary.averageLatency.toFixed(2)}ms`);
      console.log(`      - Error Rate: ${test.summary.errorRate}`);
    }
  });

  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filepath = path.join(resultsDir, `complete-test-suite-${timestamp}.json`);
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  
  console.log(`\n💾 Complete results saved to: ${filepath}`);
  console.log('\n');

  const allRequiredPassed = results.tests
    .filter(t => t.required)
    .every(t => t.success);

  return {
    success: allRequiredPassed,
    results
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllTests()
    .then(result => {
      console.log(result.success ? '✅ All required tests passed!' : '❌ Some required tests failed!');
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

export { runAllTests };
