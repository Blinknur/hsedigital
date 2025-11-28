#!/usr/bin/env node

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const NAMESPACE = process.env.NAMESPACE || 'hse-staging';
const SERVICE_NAME = process.env.SERVICE_NAME || 'hse-app-service';
const TIMEOUT = parseInt(process.env.TIMEOUT || '300000', 10);

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}`);
  if (details) console.log(`  ${details}`);
  
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

async function getPodName() {
  try {
    const { stdout } = await execAsync(
      `kubectl get pods -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}'`
    );
    return stdout.trim();
  } catch (error) {
    throw new Error('Failed to get pod name: ' + error.message);
  }
}

async function getServiceIP() {
  try {
    const { stdout } = await execAsync(
      `kubectl get svc ${SERVICE_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}'`
    );
    return stdout.trim();
  } catch (error) {
    throw new Error('Failed to get service IP: ' + error.message);
  }
}

async function execInPod(podName, command) {
  try {
    const { stdout, stderr } = await execAsync(
      `kubectl exec -n ${NAMESPACE} ${podName} -- ${command}`
    );
    return { stdout, stderr, success: true };
  } catch (error) {
    return { stdout: '', stderr: error.message, success: false };
  }
}

async function testHealthEndpoint(podName) {
  console.log('\n🔍 Test: Health Endpoint');
  
  const result = await execInPod(podName, 'wget -q -O- http://localhost:3001/api/health');
  
  if (result.success) {
    try {
      const health = JSON.parse(result.stdout);
      logTest('Health endpoint responds', health.status === 'healthy', `Status: ${health.status}`);
      logTest('Database connected', health.database === 'connected', `DB: ${health.database}`);
      logTest('Redis connected', health.redis === 'connected', `Redis: ${health.redis}`);
      return true;
    } catch (e) {
      logTest('Health endpoint responds', false, 'Invalid JSON response');
      return false;
    }
  } else {
    logTest('Health endpoint responds', false, result.stderr);
    return false;
  }
}

async function testPrismaConnectivity(podName) {
  console.log('\n🔍 Test: Prisma Connectivity');
  
  const query = `node -e "import('./shared/utils/db.js').then(m => m.default.user.findFirst().then(() => { console.log('OK'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); }))"`;
  
  const result = await execInPod(podName, query);
  logTest('Prisma query execution', result.success && result.stdout.includes('OK'), result.stderr);
  
  return result.success;
}

async function testAPIFunctionality(podName) {
  console.log('\n🔍 Test: API Functionality');
  
  const endpoints = [
    { path: '/api/health', expected: 200 },
    { path: '/metrics', expected: 200 },
    { path: '/api/unknown', expected: 404 }
  ];
  
  for (const endpoint of endpoints) {
    const result = await execInPod(
      podName,
      `wget -q -O- --server-response http://localhost:3001${endpoint.path} 2>&1 | grep 'HTTP/' | awk '{print $2}'`
    );
    
    const statusCode = parseInt(result.stdout.trim(), 10);
    logTest(
      `${endpoint.path} returns ${endpoint.expected}`,
      statusCode === endpoint.expected,
      `Got: ${statusCode}`
    );
  }
}

async function testResourceUsage(podName) {
  console.log('\n🔍 Test: Resource Usage');
  
  try {
    const { stdout: memUsage } = await execAsync(
      `kubectl top pod ${podName} -n ${NAMESPACE} --no-headers | awk '{print $3}'`
    );
    
    const memValue = parseInt(memUsage.replace('Mi', ''), 10);
    logTest('Memory usage < 900Mi', memValue < 900, `Current: ${memUsage}`);
  } catch (error) {
    logTest('Memory usage check', false, 'Metrics server not available');
  }
}

async function testReplicaHealth() {
  console.log('\n🔍 Test: Replica Health');
  
  try {
    const { stdout: desired } = await execAsync(
      `kubectl get deployment -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].spec.replicas}'`
    );
    
    const { stdout: ready } = await execAsync(
      `kubectl get deployment -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].status.readyReplicas}'`
    );
    
    const desiredCount = parseInt(desired.trim(), 10);
    const readyCount = parseInt(ready.trim() || '0', 10);
    
    logTest(
      'All replicas ready',
      desiredCount === readyCount,
      `${readyCount}/${desiredCount} ready`
    );
  } catch (error) {
    logTest('Replica health check', false, error.message);
  }
}

async function testSentryIntegration(podName) {
  console.log('\n🔍 Test: Sentry Integration');
  
  const result = await execInPod(
    podName,
    'node -e "console.log(process.env.SENTRY_DSN ? \'configured\' : \'not-configured\')"'
  );
  
  logTest(
    'Sentry DSN configured',
    result.stdout.includes('configured'),
    result.stdout.trim()
  );
}

async function testPrometheusMetrics(podName) {
  console.log('\n🔍 Test: Prometheus Metrics');
  
  const result = await execInPod(podName, 'wget -q -O- http://localhost:3001/metrics');
  
  if (result.success) {
    const hasNodeMetrics = result.stdout.includes('nodejs_');
    const hasHttpMetrics = result.stdout.includes('http_');
    const hasCustomMetrics = result.stdout.includes('hse_');
    
    logTest('Node.js metrics exposed', hasNodeMetrics);
    logTest('HTTP metrics exposed', hasHttpMetrics);
    logTest('Custom app metrics exposed', hasCustomMetrics);
  } else {
    logTest('Metrics endpoint accessible', false, result.stderr);
  }
}

async function runAllTests() {
  console.log('🧪 Starting Advanced Smoke Tests');
  console.log('=' .repeat(50));
  console.log(`Namespace: ${NAMESPACE}`);
  console.log(`Service: ${SERVICE_NAME}`);
  console.log('');
  
  try {
    console.log('⏳ Waiting for pods to be ready...');
    await execAsync(
      `kubectl wait --for=condition=ready pod -l app=hse-app -n ${NAMESPACE} --timeout=300s`
    );
    console.log('✓ Pods are ready\n');
    
    const podName = await getPodName();
    console.log(`Pod: ${podName}\n`);
    
    await testHealthEndpoint(podName);
    await testPrismaConnectivity(podName);
    await testAPIFunctionality(podName);
    await testResourceUsage(podName);
    await testReplicaHealth();
    await testSentryIntegration(podName);
    await testPrometheusMetrics(podName);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Tests passed: \x1b[32m${results.passed}\x1b[0m`);
    console.log(`Tests failed: \x1b[31m${results.failed}\x1b[0m`);
    console.log(`Total tests: ${results.passed + results.failed}`);
    console.log('');
    
    if (results.failed === 0) {
      console.log('\x1b[32m✅ All smoke tests passed!\x1b[0m');
      process.exit(0);
    } else {
      console.log('\x1b[31m❌ Some tests failed. Deployment may have issues.\x1b[0m');
      process.exit(1);
    }
  } catch (error) {
    console.error('\x1b[31m❌ Test suite failed:\x1b[0m', error.message);
    process.exit(1);
  }
}

runAllTests();
