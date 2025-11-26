#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [];

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  checks.push({ description, exists, path: filePath });
  return exists;
}

function checkPackageScript(scriptName) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const exists = !!pkg.scripts[scriptName];
  checks.push({ description: `npm script: ${scriptName}`, exists, path: 'package.json' });
  return exists;
}

function checkDependency(depName, dev = false) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = dev ? pkg.devDependencies : pkg.dependencies;
  const exists = !!deps[depName];
  checks.push({ description: `${dev ? 'devDep' : 'dep'}: ${depName}`, exists, path: 'package.json' });
  return exists;
}

console.log('\n🔍 Validating Regression Test Setup...\n');

checkFile('jest.config.js', 'Jest configuration');
checkFile('jest.setup.js', 'Jest setup file');
checkFile('.test-tags.json', 'Test categories configuration');
checkFile('scripts/run-regression-tests.js', 'Test runner script');
checkFile('scripts/generate-test-summary.js', 'Summary generator script');
checkFile('REGRESSION_TESTING.md', 'Testing documentation');
checkFile('../.github/workflows/regression-tests.yml', 'GitHub Actions workflow');

checkPackageScript('test:regression');
checkPackageScript('test:regression:fast');
checkPackageScript('test:regression:critical');
checkPackageScript('test:regression:unit');
checkPackageScript('test:regression:integration');
checkPackageScript('test:coverage');
checkPackageScript('test:watch');

checkDependency('jest', true);
checkDependency('jest-html-reporter', true);
checkDependency('jest-junit', true);
checkDependency('supertest', true);

const allPassed = checks.every(check => check.exists);

console.log('📋 Check Results:\n');
checks.forEach(check => {
  const icon = check.exists ? '✅' : '❌';
  console.log(`${icon} ${check.description}`);
  if (!check.exists) {
    console.log(`   Missing: ${check.path}`);
  }
});

console.log('\n' + '='.repeat(60) + '\n');

if (allPassed) {
  console.log('✅ All checks passed! Setup is complete.\n');
  console.log('🚀 Next steps:');
  console.log('   1. Run tests: npm run test:regression:fast');
  console.log('   2. View coverage: open coverage/index.html');
  console.log('   3. Push to trigger CI/CD');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the missing items.\n');
  process.exit(1);
}
