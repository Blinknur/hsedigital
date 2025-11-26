#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(__dirname, '../modules');
const REQUIRED_SUBDIRS = ['routes', 'services', 'controllers', 'validators'];
const SPECIAL_MODULES = ['shared'];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkModuleStructure(moduleName, modulePath) {
  const issues = [];
  const warnings = [];

  if (SPECIAL_MODULES.includes(moduleName)) {
    log(`  ⊘ Skipping special module: ${moduleName}`, 'blue');
    return { issues, warnings };
  }

  const subdirs = fs.readdirSync(modulePath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const requiredDir of REQUIRED_SUBDIRS) {
    if (!subdirs.includes(requiredDir)) {
      issues.push(`Missing required directory: ${requiredDir}/`);
    }
  }

  const indexPath = path.join(modulePath, 'index.js');
  if (!fs.existsSync(indexPath)) {
    issues.push('Missing index.js');
  }

  if (subdirs.includes('routes')) {
    const routesIndexPath = path.join(modulePath, 'routes', 'index.js');
    if (!fs.existsSync(routesIndexPath)) {
      issues.push('Missing routes/index.js');
    }
  }

  return { issues, warnings };
}

function main() {
  log('\n🔍 Module Structure Validator\n', 'bright');
  
  if (!fs.existsSync(MODULES_DIR)) {
    log('❌ Modules directory not found!', 'red');
    process.exit(1);
  }

  const modules = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  log(`Found ${modules.length} modules\n`, 'blue');

  let totalIssues = 0;

  for (const moduleName of modules) {
    const modulePath = path.join(MODULES_DIR, moduleName);
    log(`📦 Checking: ${moduleName}`, 'bright');
    
    const { issues } = checkModuleStructure(moduleName, modulePath);

    if (issues.length === 0) {
      log('  ✓ Valid', 'green');
    } else {
      issues.forEach(issue => log(`  ❌ ${issue}`, 'red'));
      totalIssues += issues.length;
    }
    log('');
  }

  if (totalIssues === 0) {
    log('✅ All modules valid!\n', 'green');
    process.exit(0);
  } else {
    log(`❌ ${totalIssues} issue(s) found!\n`, 'red');
    process.exit(1);
  }
}

main();
