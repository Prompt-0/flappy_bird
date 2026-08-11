/**
 * E2E Test Runner Script for Flappy Bird
 * Path: tests/run_e2e_tests.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import harness from './harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function main() {
  console.log('====================================================');
  console.log('         Flappy Bird E2E Test Suite Runner          ');
  console.log('====================================================\n');

  const testsDir = __dirname;
  const files = fs.readdirSync(testsDir);

  // Discover all tier test files matching tier*.js
  const tierFiles = files
    .filter(file => /^tier\d+.*\.js$/i.test(file))
    .sort();

  if (tierFiles.length === 0) {
    console.error('⚠️  No tier test files found matching "tests/tier*.js"!');
    process.exit(1);
  }

  console.log(`Discovered ${tierFiles.length} test file(s):`);
  for (const file of tierFiles) {
    console.log(` - ${file}`);
    await import(`./${file}`);
  }
  console.log('\nRunning E2E tests...\n');

  const results = await harness.runTestSuite();

  // Print individual test failure details if any
  if (results.failed > 0) {
    console.log('----------------------------------------------------');
    console.log('                  TEST FAILURES                     ');
    console.log('----------------------------------------------------');
    for (const test of results.testDetails) {
      if (test.status === 'FAILED') {
        console.log(`❌ [Tier ${test.tier}] ${test.suiteName} > ${test.name}`);
        console.log(`   Error: ${test.error}`);
        if (test.stack) {
          const stackLines = test.stack.split('\n').slice(1, 4).join('\n');
          console.log(`   Stack: ${stackLines}`);
        }
        console.log('');
      }
    }
  }

  // Format summary table
  console.log('========================================================================================');
  console.log('                                 E2E TEST SUMMARY TABLE                                 ');
  console.log('========================================================================================');
  console.log('| Tier   | Description                       | Total | Passed | Failed | Status | Duration |');
  console.log('|--------|-----------------------------------|-------|--------|--------|--------|----------|');

  const tierLabels = {
    1: 'Tier 1 - Feature Coverage Suite   ',
    2: 'Tier 2 - Boundary & Edge Cases    ',
    3: 'Tier 3 - Cross-Feature Pairwise   ',
    4: 'Tier 4 - Real-World Scenarios     '
  };

  for (let tier = 1; tier <= 4; tier++) {
    const t = results.tiers[tier];
    const statusStr = t.total === 0 ? 'N/A   ' : (t.failed === 0 ? 'PASS  ' : 'FAIL  ');
    const durStr = `${t.durationMs}ms`.padStart(8);
    const totalStr = String(t.total).padStart(5);
    const passStr = String(t.passed).padStart(6);
    const failStr = String(t.failed).padStart(6);
    const label = tierLabels[tier];

    console.log(`| Tier ${tier} | ${label} | ${totalStr} | ${passStr} | ${failStr} | ${statusStr} | ${durStr} |`);
  }

  console.log('|--------|-----------------------------------|-------|--------|--------|--------|----------|');
  
  const grandStatus = results.failed === 0 ? 'PASS  ' : 'FAIL  ';
  const totalDurStr = `${results.durationMs}ms`.padStart(8);
  const grandTotalStr = String(results.total).padStart(5);
  const grandPassStr = String(results.passed).padStart(6);
  const grandFailStr = String(results.failed).padStart(6);
  
  console.log(`| TOTAL  | All Executed Test Tiers           | ${grandTotalStr} | ${grandPassStr} | ${grandFailStr} | ${grandStatus} | ${totalDurStr} |`);
  console.log('========================================================================================\n');

  if (results.failed === 0) {
    console.log('🎉 SUCCESS: 100% of executed E2E tests PASSED!\n');
    process.exit(0);
  } else {
    console.error(`💥 FAILURE: ${results.failed} test(s) failed out of ${results.total}.\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled exception in test runner:', err);
  process.exit(1);
});
