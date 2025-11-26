#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_TAGS_FILE = path.join(__dirname, '../.test-tags.json');
const COVERAGE_DIR = path.join(__dirname, '../coverage');
const TEST_RESULTS_DIR = path.join(__dirname, '../test-results');

const testTags = JSON.parse(fs.readFileSync(TEST_TAGS_FILE, 'utf8'));

const mode = process.argv[2] || 'all';

function ensureDirectories() {
  if (!fs.existsSync(COVERAGE_DIR)) {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }
}

function getTestPattern(mode) {
  switch (mode) {
    case 'fast':
      return testTags.fast.map(f => `src/tests/${f}`).join('|');
    case 'critical':
      return testTags.critical.map(f => `src/tests/${f}`).join('|');
    case 'slow':
      return testTags.slow.map(f => `src/tests/${f}`).join('|');
    case 'unit':
      return testTags.unit.map(f => `src/tests/${f}`).join('|');
    case 'integration':
      return testTags.integration.map(f => `src/tests/${f}`).join('|');
    case 'all':
    default:
      return 'src/tests/**/*.test.js';
  }
}

function runTests(pattern) {
  ensureDirectories();

  const jestArgs = [
    '--coverage',
    '--coverageDirectory=coverage',
    '--testMatch',
    `"<rootDir>/${pattern}"`,
  ];

  const command = `node --experimental-vm-modules node_modules/jest/bin/jest.js ${jestArgs.join(' ')}`;

  console.log(`\n🧪 Running ${mode} regression tests...\n`);
  console.log(`Pattern: ${pattern}\n`);

  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    console.log(`\n✅ ${mode} tests completed successfully!\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${mode} tests failed!\n`);
    return false;
  }
}

function generateSummary() {
  const coverageSummaryPath = path.join(COVERAGE_DIR, 'coverage-summary.json');
  
  if (!fs.existsSync(coverageSummaryPath)) {
    console.log('⚠️  Coverage summary not found');
    return;
  }

  const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
  const total = coverageSummary.total;

  console.log('\n📊 Coverage Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Lines      : ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
  console.log(`Statements : ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
  console.log(`Functions  : ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
  console.log(`Branches   : ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📄 Full HTML report: file://${path.join(COVERAGE_DIR, 'index.html')}`);
  console.log(`📄 Test results: file://${path.join(TEST_RESULTS_DIR, 'index.html')}\n`);
}

if (mode === 'fast') {
  const success = runTests(getTestPattern('fast'));
  if (success) generateSummary();
  process.exit(success ? 0 : 1);
} else if (mode === 'critical') {
  const success = runTests(getTestPattern('critical'));
  if (success) generateSummary();
  process.exit(success ? 0 : 1);
} else if (mode === 'all') {
  const success = runTests('src/tests/**/*.test.js');
  if (success) generateSummary();
  process.exit(success ? 0 : 1);
} else {
  console.error(`Unknown test mode: ${mode}`);
  console.log('Available modes: all, fast, critical, slow, unit, integration');
  process.exit(1);
}
