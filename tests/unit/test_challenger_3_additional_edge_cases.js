/**
 * Additional Edge Case Tests for StorageEngine
 * Milestone 3 Iteration 2 Adversarial Verification
 */

import assert from 'node:assert/strict';
import { StorageEngine } from '../../public/js/storage/StorageEngine.js';
import { SkinManager } from '../../public/js/storage/SkinManager.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function test(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
  } catch (err) {
    failedTests++;
    console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${testName}`);
    errors.push({ testName, error: err });
  }
}

// Helper mock storage
function createMockLocalStorage(storeMap = new Map()) {
  return {
    getItem(key) { return storeMap.get(key) || null; },
    setItem(key, val) { storeMap.set(key, String(val)); },
    removeItem(key) { storeMap.delete(key); },
    clear() { storeMap.clear(); }
  };
}

console.log('\n\x1b[36m▶ Running Additional StorageEngine Edge Cases\x1b[0m');

test('setHighScore(-1) returns false and leaves score unchanged', () => {
  const storage = new StorageEngine('test_add_hs_neg');
  storage.setHighScore(10);
  assert.equal(storage.setHighScore(-1), false);
  assert.equal(storage.getHighScore(), 10);
});

test('setHighScore(NaN) returns false and leaves score unchanged', () => {
  const storage = new StorageEngine('test_add_hs_nan');
  storage.setHighScore(10);
  assert.equal(storage.setHighScore(NaN), false);
  assert.equal(storage.getHighScore(), 10);
});

test('setHighScore with non-numbers (string, boolean, object, null, undefined) returns false', () => {
  const storage = new StorageEngine('test_add_hs_types');
  storage.setHighScore(5);
  ['100', true, false, null, undefined, {}, [50]].forEach(val => {
    assert.equal(storage.setHighScore(val), false, `Failed for input: ${val}`);
  });
  assert.equal(storage.getHighScore(), 5);
});

test('updateStats({ totalPipes: -100 }) ignores negative delta', () => {
  const storage = new StorageEngine('test_add_stats_neg');
  storage.updateStats({ totalPipes: 10 });
  const result = storage.updateStats({ totalPipes: -100 });
  assert.equal(result.totalPipes, 10);
  assert.equal(storage.getStats().totalPipes, 10);
});

test('updateStats with NaN, Infinity, -Infinity, strings, and booleans ignores invalid deltas', () => {
  const storage = new StorageEngine('test_add_stats_invalid');
  storage.updateStats({ totalGames: 5, totalFlaps: 20, totalPipes: 8, totalTime: 100 });
  const result = storage.updateStats({
    totalGames: NaN,
    totalFlaps: Infinity,
    totalPipes: -Infinity,
    totalTime: '500'
  });
  assert.deepEqual(result, { totalGames: 5, totalFlaps: 20, totalPipes: 8, totalTime: 100 });
});

test('Corrupt JSON: boolean score {"highScore": true} defaults to 0', () => {
  const store = new Map([['test_corrupt_bool', '{"highScore": true}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_corrupt_bool');
  assert.equal(storage.getHighScore(), 0);
  delete globalThis.localStorage;
});

test('Corrupt JSON: string score {"highScore": "100"} defaults to 0', () => {
  const store = new Map([['test_corrupt_str', '{"highScore": "100"}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_corrupt_str');
  assert.equal(storage.getHighScore(), 0);
  delete globalThis.localStorage;
});

test('Corrupt JSON: object score {"highScore": {"val": 50}} defaults to 0', () => {
  const store = new Map([['test_corrupt_obj', '{"highScore": {"val": 50}}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_corrupt_obj');
  assert.equal(storage.getHighScore(), 0);
  delete globalThis.localStorage;
});

test('Corrupt JSON: array score {"highScore": [50]} defaults to 0', () => {
  const store = new Map([['test_corrupt_arr', '{"highScore": [50]}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_corrupt_arr');
  assert.equal(storage.getHighScore(), 0);
  delete globalThis.localStorage;
});

test('Corrupt JSON: negative score {"highScore": -50} defaults to 0', () => {
  const store = new Map([['test_corrupt_neg', '{"highScore": -50}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_corrupt_neg');
  assert.equal(storage.getHighScore(), 0);
  delete globalThis.localStorage;
});

test('Corrupt JSON: float score {"highScore": 15.9} is floored to 15', () => {
  const store = new Map([['test_corrupt_float', '{"highScore": 15.9}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_corrupt_float');
  assert.equal(storage.getHighScore(), 15);
  delete globalThis.localStorage;
});

test('Corrupt JSON: invalid audio prefs {"audio": {"muted": "yes", "volume": "loud"}} default to false & 0.8', () => {
  const store = new Map([['test_corrupt_audio', '{"audio": {"muted": "yes", "volume": "loud"}}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_corrupt_audio');
  assert.deepEqual(storage.getAudioPrefs(), { muted: false, volume: 0.8 });
  delete globalThis.localStorage;
});

test('Corrupt JSON: volume out of bounds {"audio": {"volume": 99}} clamps to 1.0', () => {
  const store = new Map([['test_volume_high', '{"audio": {"volume": 99}}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_volume_high');
  assert.equal(storage.getAudioPrefs().volume, 1.0);
  delete globalThis.localStorage;
});

test('Corrupt JSON: volume negative {"audio": {"volume": -10}} clamps to 0.0', () => {
  const store = new Map([['test_volume_low', '{"audio": {"volume": -10}}']]);
  globalThis.localStorage = createMockLocalStorage(store);
  const storage = new StorageEngine('test_volume_low');
  assert.equal(storage.getAudioPrefs().volume, 0.0);
  delete globalThis.localStorage;
});

test('saveSkins with non-string selectedSkin or non-array unlockedArray handles arguments safely', () => {
  const storage = new StorageEngine('test_save_skins_safe');
  storage.saveSkins(12345, 'not_an_array');
  assert.equal(storage.getSkins().selectedSkin, 'classic_yellow');
  assert.deepEqual(storage.getSkins().unlockedSkins, ['classic_yellow']);
});

test('reset() resets all data back to DEFAULT_DATA', () => {
  const storage = new StorageEngine('test_reset');
  storage.setHighScore(100);
  storage.updateStats({ totalGames: 20 });
  storage.setAudioPrefs({ muted: true, volume: 0.2 });
  storage.saveSkins('neon_cyber', ['classic_yellow', 'neon_cyber']);

  const res = storage.reset();
  assert.equal(res.highScore, 0);
  assert.equal(res.stats.totalGames, 0);
  assert.equal(res.audio.muted, false);
  assert.equal(res.audio.volume, 0.8);
  assert.equal(res.selectedSkin, 'classic_yellow');
  assert.deepEqual(res.unlockedSkins, ['classic_yellow']);
  assert.equal(storage.getHighScore(), 0);
});

console.log(`\nTotal Edge Case Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}\n`);
if (failedTests > 0) {
  errors.forEach(e => console.error(e.testName, e.error));
  process.exit(1);
} else {
  console.log('✔ ALL ADDITIONAL EDGE CASE TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
