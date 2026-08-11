/**
 * test_high_frequency_stats_stress.js
 * Empirical high-frequency stat update & StorageEngine stress test suite.
 */

import { StorageEngine } from '../../public/js/storage/StorageEngine.js';
import { SkinManager } from '../../public/js/storage/SkinManager.js';
import { AudioManager } from '../../public/js/audio/AudioManager.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    console.error(`  ✖ FAIL: ${message}`);
  }
}

console.log('===================================================');
console.log(' STRESS HARNESS — HIGH-FREQUENCY STAT UPDATES');
console.log('===================================================\n');

// Mock localStorage if not present in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

// ----------------------------------------------------
// Test 1: 100,000 Rapid Stat Updates Performance & Accuracy
// ----------------------------------------------------
console.log('▶ Test 1: 100,000 Rapid Stat Updates Performance & Data Integrity');
{
  const storage = new StorageEngine('stress_key_100k');
  storage.reset();

  const iterations = 100000;
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    storage.updateStats({
      totalGames: 1,
      totalFlaps: 3,
      totalPipes: 2,
      totalTime: 0.016
    });
  }

  const elapsed = Date.now() - start;
  const stats = storage.getStats();

  console.log(`  ⏱ Executed ${iterations} stat updates in ${elapsed}ms (${(iterations / elapsed * 1000).toFixed(0)} ops/sec)`);

  assert(stats.totalGames === iterations, `totalGames equals ${iterations} (actual: ${stats.totalGames})`);
  assert(stats.totalFlaps === iterations * 3, `totalFlaps equals ${iterations * 3} (actual: ${stats.totalFlaps})`);
  assert(stats.totalPipes === iterations * 2, `totalPipes equals ${iterations * 2} (actual: ${stats.totalPipes})`);
  assert(Math.abs(stats.totalTime - (iterations * 0.016)) < 0.001, `totalTime correctly accumulated (${stats.totalTime.toFixed(3)})`);

  // Verify reload from storage
  const reloadedStorage = new StorageEngine('stress_key_100k');
  const reloadedStats = reloadedStorage.getStats();
  assert(reloadedStats.totalGames === iterations, `Reloaded totalGames matches persisted value`);
  assert(reloadedStats.totalFlaps === iterations * 3, `Reloaded totalFlaps matches persisted value`);
}

// ----------------------------------------------------
// Test 2: Boundary & Malformed Input Injection during High-Freq Burst
// ----------------------------------------------------
console.log('\n▶ Test 2: Malformed & Adversarial Inputs Injection under Load');
{
  const storage = new StorageEngine('stress_key_adversarial');
  storage.reset();

  const initialStats = storage.getStats();
  
  // Inject malicious / edge case deltas
  const badDeltas = [
    { totalGames: -10, totalFlaps: -5 },
    { totalGames: NaN, totalFlaps: Infinity, totalPipes: -Infinity },
    { totalGames: '100', totalFlaps: true, totalPipes: null },
    { totalGames: 0, totalFlaps: 0 },
    { totalGames: undefined },
    null,
    "string payload",
    12345,
    { totalGames: 1e308 },
    { totalGames: -0.00001 }
  ];

  for (let i = 0; i < 5000; i++) {
    const badDelta = badDeltas[i % badDeltas.length];
    storage.updateStats(badDelta);
  }

  const postStats = storage.getStats();
  assert(postStats.totalGames >= 0 && Number.isFinite(postStats.totalGames), `totalGames remains finite non-negative number (${postStats.totalGames})`);
  assert(postStats.totalFlaps >= 0 && Number.isFinite(postStats.totalFlaps), `totalFlaps remains finite non-negative number (${postStats.totalFlaps})`);
  assert(postStats.totalPipes >= 0 && Number.isFinite(postStats.totalPipes), `totalPipes remains finite non-negative number (${postStats.totalPipes})`);
  assert(!isNaN(postStats.totalGames) && !isNaN(postStats.totalFlaps), `Stats are completely free of NaN contamination`);
}

// ----------------------------------------------------
// Test 3: Interleaved Operations under High Load
// ----------------------------------------------------
console.log('\n▶ Test 3: Interleaved Multi-System Operations under Load');
{
  const storage = new StorageEngine('stress_key_interleaved');
  storage.reset();
  const skinManager = new SkinManager(storage);
  const audioManager = new AudioManager({ storageEngine: storage });

  let unlockedCount = 0;
  for (let i = 0; i < 10000; i++) {
    // Interleaved updates
    storage.updateStats({ totalGames: 1, totalFlaps: 2, totalPipes: 1 });
    storage.setHighScore(i % 150);
    audioManager.setVolume((i % 100) / 100);
    audioManager.toggleMute();
    
    const newlyUnlocked = skinManager.checkUnlocks(i % 150, storage.getStats());
    if (newlyUnlocked.length > 0) {
      unlockedCount += newlyUnlocked.length;
    }
  }

  const finalStats = storage.getStats();
  const finalScore = storage.getHighScore();
  const finalSkins = storage.getSkins();

  assert(finalStats.totalGames === 10000, `Interleaved totalGames equals 10000`);
  assert(finalScore === 149, `Interleaved high score is 149`);
  assert(finalSkins.unlockedSkins.length === 5, `All 5 skins unlocked via interleaved operations`);
}

// ----------------------------------------------------
// Test 4: Mid-Stream Quota Exhaustion & Fallback Transition
// ----------------------------------------------------
console.log('\n▶ Test 4: Mid-Stream Storage Failure Fallback Transition');
{
  const storageKey = 'stress_key_quota_fail';
  const storage = new StorageEngine(storageKey);
  storage.reset();

  // Perform 1,000 normal updates
  for (let i = 0; i < 1000; i++) {
    storage.updateStats({ totalFlaps: 1 });
  }
  assert(storage.getStats().totalFlaps === 1000, `Normal updates before quota exception: 1000 flaps`);

  // Simulate QuotaExceededError on localStorage.setItem
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = () => {
    const err = new Error('QuotaExceededError: Storage quota exceeded');
    err.name = 'QuotaExceededError';
    throw err;
  };

  // Perform 1,000 more updates while localStorage throws
  for (let i = 0; i < 1000; i++) {
    storage.updateStats({ totalFlaps: 1 });
  }

  const fallbackStats = storage.getStats();
  assert(storage.useMemoryFallback === true, `StorageEngine seamlessly switched to memory fallback`);
  assert(fallbackStats.totalFlaps === 2000, `Memory fallback accurately preserved all 2000 flap updates`);

  // Restore original setItem
  localStorage.setItem = originalSetItem;
}

console.log('\n===================================================');
console.log(` Total Assertions: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
console.log('===================================================');

if (totalTests === passedTests) {
  console.log('\n✔ STRESS HARNESS PASSED WITH ZERO FAILURES!');
  process.exit(0);
} else {
  console.error('\n✖ STRESS HARNESS FAILED!');
  process.exit(1);
}
