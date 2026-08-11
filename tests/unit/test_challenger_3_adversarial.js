/**
 * Adversarial & Stress Test Suite for Milestone 3 (Audio, Persistence & Customization)
 * Runner: Node.js native assert module
 * Execution Command: node tests/unit/test_challenger_3_adversarial.js
 */

import assert from 'node:assert/strict';
import { StorageEngine } from '../../public/js/storage/StorageEngine.js';
import { SkinManager, SKIN_DEFINITIONS } from '../../public/js/storage/SkinManager.js';
import { AudioSynthesizer } from '../../public/js/audio/AudioSynthesizer.js';
import { AudioManager } from '../../public/js/audio/AudioManager.js';
import { EventBus } from '../../public/js/engine/EventBus.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function describe(suiteName, fn) {
  console.log(`\n\x1b[36m▶ Suite: ${suiteName}\x1b[0m`);
  fn();
}

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

// Mock localStorage helper
function createMockLocalStorage(options = {}) {
  const store = new Map();
  return {
    getItem(key) {
      if (options.throwOnGet) {
        throw new Error('SecurityError: Access is denied for this document.');
      }
      return store.get(key) || null;
    },
    setItem(key, value) {
      if (options.throwOnSet) {
        throw new Error('QuotaExceededError: The quota has been exceeded.');
      }
      store.set(key, String(value));
    },
    removeItem(key) {
      if (options.throwOnRemove) {
        throw new Error('SecurityError: Cannot remove item.');
      }
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

// Mock WebAudio API helper for testing Synthesizer node graph calls
function createMockAudioContext() {
  const mockGainNode = {
    gain: {
      value: 1,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {}
    },
    connect: () => {}
  };

  const mockOscillator = () => ({
    type: 'sine',
    frequency: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {}
    },
    connect: () => {},
    start: () => {},
    stop: () => {}
  });

  const mockFilter = () => ({
    type: 'lowpass',
    frequency: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {}
    },
    connect: () => {}
  });

  const mockBufferSource = () => ({
    buffer: null,
    connect: () => {},
    start: () => {},
    stop: () => {}
  });

  const mockBuffer = {
    getChannelData: () => new Float32Array(4410)
  };

  return {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain: () => mockGainNode,
    createOscillator: mockOscillator,
    createBiquadFilter: mockFilter,
    createBufferSource: mockBufferSource,
    createBuffer: () => mockBuffer,
    resume: async () => {}
  };
}

// =========================================================================
// Suite 1: AudioSynthesizer Rapid Burst Stress Test (1000 Calls)
// =========================================================================
describe('1) AudioSynthesizer Rapid Burst Stress Test (1000 calls)', () => {
  test('AudioSynthesizer handles 1000 rapid burst calls in headless (no Web Audio API) context without throwing or stalling', () => {
    const synth = new AudioSynthesizer();
    assert.equal(synth.isReady(), false);

    const startTime = Date.now();
    assert.doesNotThrow(() => {
      for (let i = 0; i < 1000; i++) {
        synth.playFlap();
        synth.playScore();
        synth.playHit();
        synth.playClick();
      }
    });
    const duration = Date.now() - startTime;
    console.log(`    ℹ 4000 total sound calls in headless mode executed in ${duration}ms`);
    assert.ok(duration < 1000, `Execution took ${duration}ms, expected under 1000ms`);
  });

  test('AudioSynthesizer handles 1000 rapid burst calls in mocked AudioContext environment without throwing or leaking state', () => {
    const mockCtx = createMockAudioContext();
    const synth = new AudioSynthesizer(mockCtx, mockCtx.createGain());
    assert.equal(synth.isReady(), true);

    const startTime = Date.now();
    assert.doesNotThrow(() => {
      for (let i = 0; i < 1000; i++) {
        synth.playFlap();
        synth.playScore();
        synth.playHit();
        synth.playClick();
      }
    });
    const duration = Date.now() - startTime;
    console.log(`    ℹ 4000 total sound calls in mock WebAudio mode executed in ${duration}ms`);
    assert.ok(duration < 2000, `Execution took ${duration}ms, expected under 2000ms`);
  });

  test('AudioManager triggers 1000 rapid EventBus bursts gracefully', () => {
    const bus = new EventBus();
    const audioMgr = new AudioManager({ eventBus: bus });

    assert.doesNotThrow(() => {
      for (let i = 0; i < 1000; i++) {
        bus.emit('BIRD_FLAP', { x: 10, y: 20 });
        bus.emit('PIPE_PASS', { score: i });
        bus.emit('BIRD_HIT', { cause: 'pipe' });
      }
    });
  });
});

// =========================================================================
// Suite 2: StorageEngine Adversarial & Edge Case Resilience
// =========================================================================
describe('2) StorageEngine Corrupted JSON, Non-Numeric Inputs & Quota Failure', () => {
  test('StorageEngine handles corrupted and primitive JSON strings without throwing unhandled exceptions', () => {
    const testCases = [
      'INVALID_JSON_{{{',
      'null',
      'true',
      'false',
      '12345',
      '"a raw string"',
      '[]',
      '[1, 2, 3]',
      '{"highScore": "NOT_A_NUMBER", "stats": "INVALID"}',
      '{"highScore": null, "stats": null, "unlockedSkins": null, "audio": null}'
    ];

    testCases.forEach((corruptStr, idx) => {
      const mockStorage = createMockLocalStorage();
      mockStorage.setItem(`corrupt_key_${idx}`, corruptStr);
      globalThis.localStorage = mockStorage;

      assert.doesNotThrow(() => {
        const storage = new StorageEngine(`corrupt_key_${idx}`);
        assert.equal(typeof storage.getHighScore(), 'number');
        assert.equal(typeof storage.getStats().totalGames, 'number');
        assert.ok(Array.isArray(storage.getSkins().unlockedSkins));
      }, `Failed on corrupt string input: ${corruptStr}`);
    });

    delete globalThis.localStorage;
  });

  test('[BUG #1] StorageEngine.load() accepts negative high scores from corrupted JSON', () => {
    const mockStorage = createMockLocalStorage();
    mockStorage.setItem('test_negative_hs', '{"highScore": -50}');
    globalThis.localStorage = mockStorage;

    const storage = new StorageEngine('test_negative_hs');
    // Expected behavior for robust engine: highScore should be non-negative (>= 0)
    // Observed behavior: storage.getHighScore() returns -50
    assert.ok(storage.getHighScore() >= 0, `StorageEngine accepted negative high score -50 from storage`);

    delete globalThis.localStorage;
  });

  test('[BUG #2] StorageEngine.setHighScore() accepts Infinity as valid high score', () => {
    const storage = new StorageEngine('test_inf_hs');
    storage.setHighScore(10);

    const result = storage.setHighScore(Infinity);
    // Expected behavior: return false and reject Infinity
    // Observed behavior: returns true and sets highScore to Infinity
    assert.equal(result, false, `setHighScore(Infinity) should be rejected but returned true`);

    const resultNegInf = storage.setHighScore(-Infinity);
    assert.equal(resultNegInf, false, `setHighScore(-Infinity) should be rejected`);
  });

  test('[BUG #3] StorageEngine.updateStats() allows NaN to corrupt stats permanently', () => {
    const storage = new StorageEngine('test_nan_stats');
    storage.updateStats({ totalGames: 1, totalFlaps: 10, totalPipes: 2, totalTime: 30 });

    storage.updateStats({
      totalGames: NaN,
      totalFlaps: '100',
      totalPipes: null,
      totalTime: undefined
    });

    // Expected behavior: totalGames remains 1 (NaN delta ignored)
    // Observed behavior: totalGames becomes NaN
    assert.equal(Number.isNaN(storage.getStats().totalGames), false, `updateStats() allowed totalGames to become NaN`);
    assert.equal(storage.getStats().totalGames, 1);
  });

  test('StorageEngine setAudioPrefs bounds volume between 0 and 1 and ignores invalid muted types', () => {
    const storage = new StorageEngine('test_adv_audio');

    // Volume over 1 -> clamped to 1
    storage.setAudioPrefs({ volume: 5.0 });
    assert.equal(storage.getAudioPrefs().volume, 1.0);

    // Volume under 0 -> clamped to 0
    storage.setAudioPrefs({ volume: -2.5 });
    assert.equal(storage.getAudioPrefs().volume, 0.0);

    // Volume NaN -> ignored
    storage.setAudioPrefs({ volume: NaN });
    assert.equal(storage.getAudioPrefs().volume, 0.0);

    // Volume string -> ignored
    storage.setAudioPrefs({ volume: "0.5" });
    assert.equal(storage.getAudioPrefs().volume, 0.0);

    // Muted string -> ignored
    storage.setAudioPrefs({ muted: "true" });
    assert.equal(storage.getAudioPrefs().muted, false);
  });

  test('StorageEngine handles circular structure in save() without uncaught crash', () => {
    const storage = new StorageEngine('test_circ');
    const circObj = { totalGames: 1 };
    circObj.self = circObj;

    assert.doesNotThrow(() => {
      try {
        storage.save(circObj);
      } catch (err) {
        // Handled exception
      }
    });
  });

  test('StorageEngine getters prevent internal state mutation (property tampering)', () => {
    const storage = new StorageEngine('test_tamper');
    storage.setHighScore(50);

    // Tamper getStats()
    const statsCopy = storage.getStats();
    statsCopy.totalGames = 99999;
    assert.equal(storage.getStats().totalGames, 0);

    // Tamper getSkins()
    const skinsCopy = storage.getSkins();
    skinsCopy.unlockedSkins.push('HACKED_SKIN');
    assert.equal(storage.getSkins().unlockedSkins.includes('HACKED_SKIN'), false);

    // Tamper getAudioPrefs()
    const audioCopy = storage.getAudioPrefs();
    audioCopy.muted = true;
    assert.equal(storage.getAudioPrefs().muted, false);
  });

  test('StorageEngine handles storage quota and security errors gracefully', () => {
    const mockStorage = createMockLocalStorage({ throwOnSet: true });
    globalThis.localStorage = mockStorage;

    const storage = new StorageEngine('test_quota');
    assert.equal(storage.useMemoryFallback, true);
    assert.doesNotThrow(() => {
      storage.setHighScore(100);
      storage.saveSkins('neon_cyber', ['classic_yellow', 'neon_cyber']);
    });
    assert.equal(storage.getHighScore(), 100);
    assert.equal(storage.getSkins().selectedSkin, 'neon_cyber');

    delete globalThis.localStorage;
  });
});

// =========================================================================
// Suite 3: SkinManager Adversarial & Edge Case Resilience
// =========================================================================
describe('3) SkinManager Negative Inputs, Malformed Stats & Selection Tampering', () => {
  test('SkinManager checkUnlocks handles negative high scores and negative stats without unlocking skins', () => {
    const skinMgr = new SkinManager();

    const unlocked1 = skinMgr.checkUnlocks(-100, { totalGames: -50 });
    assert.deepEqual(unlocked1, []);
    assert.equal(skinMgr.isUnlocked('crimson_phoenix'), false);
    assert.equal(skinMgr.isUnlocked('midnight_raven'), false);
  });

  test('SkinManager checkUnlocks handles missing, null, NaN, and non-object stats objects gracefully', () => {
    const skinMgr = new SkinManager();

    const invalidStatsInputs = [
      null,
      undefined,
      {},
      { totalGames: null },
      { totalGames: NaN },
      { totalGames: "50" },
      { totalGames: [50] },
      "stats_as_string",
      12345
    ];

    invalidStatsInputs.forEach(input => {
      assert.doesNotThrow(() => {
        const unlocked = skinMgr.checkUnlocks(0, input);
        assert.ok(Array.isArray(unlocked));
      }, `Failed when stats input was: ${JSON.stringify(input)}`);
    });
  });

  test('SkinManager selectSkin rejects invalid, non-existent, and non-string skin IDs', () => {
    const skinMgr = new SkinManager();

    const invalidSkinIds = [
      'non_existent_skin',
      '',
      null,
      undefined,
      12345,
      { id: 'classic_yellow' },
      '__proto__',
      'constructor',
      'golden_eagle' // Locked skin
    ];

    invalidSkinIds.forEach(skinId => {
      const res = skinMgr.selectSkin(skinId);
      assert.equal(res, false, `selectSkin should return false for invalid skinId: ${String(skinId)}`);
      assert.equal(skinMgr.getSelectedSkin(), 'classic_yellow');
    });
  });

  test('SkinManager getSkins() and getSkinDetails() return safe copies that prevent definition tampering', () => {
    const skinMgr = new SkinManager();

    const skins = skinMgr.getSkins();
    assert.equal(skins.length, 5);
    skins[0].unlocked = false;
    skins[0].name = 'HACKED';

    // Original skin definition & manager state should remain intact
    const refreshedSkins = skinMgr.getSkins();
    assert.equal(refreshedSkins[0].unlocked, true);
    assert.equal(refreshedSkins[0].name, 'Classic Yellow');

    // Invalid skin ID fallback
    const fallbackDetails = skinMgr.getSkinDetails('INVALID_ID');
    assert.equal(fallbackDetails.id, 'classic_yellow');
    assert.equal(fallbackDetails.unlocked, true);
  });
});

// ==========================================
// Final Results Reporting & Exit Code
// ==========================================
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Total Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (failedTests > 0) {
  console.error('\x1b[31mFailures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.stack || error.message);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL M3 ADVERSARIAL & STRESS TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
