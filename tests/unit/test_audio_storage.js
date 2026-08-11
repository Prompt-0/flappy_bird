/**
 * Unit Test Suite for Milestone 3 (Audio, Persistence & Customization)
 * Runner: Node.js native assert module
 * Execution Command: node tests/unit/test_audio_storage.js
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

// Mock localStorage helper for testing storage failure scenarios
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

// ==========================================
// Suite 1: StorageEngine Fallback Mechanics
// ==========================================
describe('1) StorageEngine & In-Memory Fallback Behavior', () => {
  test('StorageEngine operates seamlessly in Node.js without window.localStorage', () => {
    const storage = new StorageEngine('test_key_node_1');
    assert.equal(storage.useMemoryFallback, true);
    assert.equal(storage.getHighScore(), 0);
    assert.deepEqual(storage.getStats(), { totalGames: 0, totalFlaps: 0, totalPipes: 0, totalTime: 0 });
    assert.deepEqual(storage.getAudioPrefs(), { muted: false, volume: 0.8 });
    assert.deepEqual(storage.getSkins(), { selectedSkin: 'classic_yellow', unlockedSkins: ['classic_yellow'] });
  });

  test('StorageEngine fallback retains data in memory when written', () => {
    const storage = new StorageEngine('test_key_node_2');
    storage.setHighScore(42);
    storage.updateStats({ totalGames: 5, totalFlaps: 120, totalPipes: 35, totalTime: 180 });
    storage.setAudioPrefs({ muted: true, volume: 0.5 });
    storage.saveSkins('crimson_phoenix', ['classic_yellow', 'crimson_phoenix']);

    assert.equal(storage.getHighScore(), 42);
    assert.deepEqual(storage.getStats(), { totalGames: 5, totalFlaps: 120, totalPipes: 35, totalTime: 180 });
    assert.deepEqual(storage.getAudioPrefs(), { muted: true, volume: 0.5 });
    assert.deepEqual(storage.getSkins(), { selectedSkin: 'crimson_phoenix', unlockedSkins: ['classic_yellow', 'crimson_phoenix'] });
  });

  test('StorageEngine handles simulated SecurityError/QuotaExceededError without crashing', () => {
    // Case A: getItem / setItem throws during initialization check
    const mockStorageA = createMockLocalStorage({ throwOnSet: true });
    globalThis.localStorage = mockStorageA;

    const storageA = new StorageEngine('test_key_security_a');
    assert.equal(storageA.useMemoryFallback, true);
    assert.doesNotThrow(() => {
      storageA.setHighScore(100);
    });
    assert.equal(storageA.getHighScore(), 100);

    // Case B: initialization check passes, but subsequent save() throws QuotaExceededError
    let failOnSet = false;
    const mockStorageB = {
      getItem() { return null; },
      setItem(k, v) {
        if (failOnSet) {
          throw new Error('QuotaExceededError: The quota has been exceeded.');
        }
      },
      removeItem() {}
    };
    globalThis.localStorage = mockStorageB;

    const storageB = new StorageEngine('test_key_security_b');
    assert.equal(storageB.useMemoryFallback, false);

    failOnSet = true;
    assert.doesNotThrow(() => {
      storageB.setHighScore(200);
    });
    assert.equal(storageB.useMemoryFallback, true);
    assert.equal(storageB.getHighScore(), 200);

    delete globalThis.localStorage;
  });

  test('StorageEngine gracefully handles corrupt JSON data in storage', () => {
    const mockStorage = createMockLocalStorage();
    mockStorage.setItem('test_corrupt_key', 'INVALID_CORRUPT_JSON_DATA{{{');
    globalThis.localStorage = mockStorage;

    const storage = new StorageEngine('test_corrupt_key');
    assert.equal(storage.getHighScore(), 0);
    assert.equal(storage.getSkins().selectedSkin, 'classic_yellow');

    delete globalThis.localStorage;
  });
});

// ==========================================
// Suite 2: High Score and Stats Persistence
// ==========================================
describe('2) High Score & Lifetime Stats Persistence', () => {
  test('High score updates only when new score is strictly greater', () => {
    const storage = new StorageEngine('test_hs_key');
    assert.equal(storage.getHighScore(), 0);

    const updated1 = storage.setHighScore(15);
    assert.equal(updated1, true);
    assert.equal(storage.getHighScore(), 15);

    const updated2 = storage.setHighScore(10);
    assert.equal(updated2, false);
    assert.equal(storage.getHighScore(), 15);

    const updated3 = storage.setHighScore(20);
    assert.equal(updated3, true);
    assert.equal(storage.getHighScore(), 20);
  });

  test('Lifetime stats accumulate correctly across updateStats calls', () => {
    const storage = new StorageEngine('test_stats_key');
    storage.updateStats({ totalGames: 1, totalFlaps: 25, totalPipes: 8, totalTime: 45 });
    assert.deepEqual(storage.getStats(), { totalGames: 1, totalFlaps: 25, totalPipes: 8, totalTime: 45 });

    storage.updateStats({ totalGames: 1, totalFlaps: 30, totalPipes: 10, totalTime: 50 });
    assert.deepEqual(storage.getStats(), { totalGames: 2, totalFlaps: 55, totalPipes: 18, totalTime: 95 });
  });

  test('StorageEngine load() sanitizes negative high scores from storage', () => {
    const mockStorage = createMockLocalStorage();
    mockStorage.setItem('test_negative_hs_unit', '{"highScore": -50}');
    globalThis.localStorage = mockStorage;

    const storage = new StorageEngine('test_negative_hs_unit');
    assert.equal(storage.getHighScore(), 0);

    delete globalThis.localStorage;
  });

  test('StorageEngine setHighScore() rejects Infinity, -Infinity, NaN, and negative numbers', () => {
    const storage = new StorageEngine('test_hs_invalid');
    storage.setHighScore(10);

    assert.equal(storage.setHighScore(Infinity), false);
    assert.equal(storage.setHighScore(-Infinity), false);
    assert.equal(storage.setHighScore(NaN), false);
    assert.equal(storage.setHighScore(-10), false);
    assert.equal(storage.setHighScore("100"), false);
    assert.equal(storage.getHighScore(), 10);
  });

  test('StorageEngine updateStats() rejects NaN, Infinity, non-numeric, and negative deltas', () => {
    const storage = new StorageEngine('test_stats_invalid');
    storage.updateStats({ totalGames: 1, totalFlaps: 10, totalPipes: 2, totalTime: 30 });

    storage.updateStats({
      totalGames: NaN,
      totalFlaps: Infinity,
      totalPipes: -5,
      totalTime: '100'
    });

    assert.deepEqual(storage.getStats(), { totalGames: 1, totalFlaps: 10, totalPipes: 2, totalTime: 30 });
  });
});

// ==========================================
// Suite 3: SkinManager & Unlock Conditions
// ==========================================
describe('3) SkinManager Unlock Conditions & Selection Logic', () => {
  test('SkinManager contains 5 procedural skin definitions with expected IDs', () => {
    assert.equal(SKIN_DEFINITIONS.length, 5);
    const skinIds = SKIN_DEFINITIONS.map(s => s.id);
    assert.deepEqual(skinIds, ['classic_yellow', 'crimson_phoenix', 'neon_cyber', 'golden_eagle', 'midnight_raven']);
  });

  test('SkinManager defaults to classic_yellow unlocked and selected', () => {
    const skinMgr = new SkinManager();
    assert.equal(skinMgr.getSelectedSkin(), 'classic_yellow');
    assert.equal(skinMgr.isUnlocked('classic_yellow'), true);
    assert.equal(skinMgr.isUnlocked('crimson_phoenix'), false);

    // Selecting locked skin must fail
    const selected = skinMgr.selectSkin('crimson_phoenix');
    assert.equal(selected, false);
    assert.equal(skinMgr.getSelectedSkin(), 'classic_yellow');
  });

  test('SkinManager checkUnlocks triggers for all 5 skin conditions', () => {
    const skinMgr = new SkinManager();

    // 1. Crimson Phoenix: highScore >= 20
    let newlyUnlocked = skinMgr.checkUnlocks(20, { totalGames: 5 });
    assert.deepEqual(newlyUnlocked, ['crimson_phoenix']);
    assert.equal(skinMgr.isUnlocked('crimson_phoenix'), true);
    assert.equal(skinMgr.selectSkin('crimson_phoenix'), true);
    assert.equal(skinMgr.getSelectedSkin(), 'crimson_phoenix');

    // 2. Neon Cyber: highScore >= 50
    newlyUnlocked = skinMgr.checkUnlocks(50, { totalGames: 10 });
    assert.deepEqual(newlyUnlocked, ['neon_cyber']);
    assert.equal(skinMgr.isUnlocked('neon_cyber'), true);

    // 3. Golden Eagle: highScore >= 100
    newlyUnlocked = skinMgr.checkUnlocks(100, { totalGames: 15 });
    assert.deepEqual(newlyUnlocked, ['golden_eagle']);
    assert.equal(skinMgr.isUnlocked('golden_eagle'), true);

    // 4. Midnight Raven: stats.totalGames >= 50
    newlyUnlocked = skinMgr.checkUnlocks(5, { totalGames: 50 });
    assert.deepEqual(newlyUnlocked, ['midnight_raven']);
    assert.equal(skinMgr.isUnlocked('midnight_raven'), true);
  });

  test('SkinManager integrates with StorageEngine for state persistence', () => {
    const storage = new StorageEngine('test_skin_pers');
    const skinMgr1 = new SkinManager(storage);

    skinMgr1.checkUnlocks(25, { totalGames: 2 });
    skinMgr1.selectSkin('crimson_phoenix');

    // Re-instantiate SkinManager with same storage engine
    const skinMgr2 = new SkinManager(storage);
    assert.equal(skinMgr2.getSelectedSkin(), 'crimson_phoenix');
    assert.equal(skinMgr2.isUnlocked('crimson_phoenix'), true);
  });
});

// ==========================================
// Suite 4: AudioSynthesizer & AudioManager Fallbacks
// ==========================================
describe('4) AudioSynthesizer & AudioManager Graceful Fallbacks', () => {
  test('AudioSynthesizer methods exit cleanly without throwing when AudioContext is unavailable', () => {
    const synth = new AudioSynthesizer();
    assert.equal(synth.isReady(), false);

    assert.doesNotThrow(() => synth.playFlap());
    assert.doesNotThrow(() => synth.playScore());
    assert.doesNotThrow(() => synth.playHit());
    assert.doesNotThrow(() => synth.playClick());
  });

  test('AudioSynthesizer respects setMuted(true)', () => {
    const mockCtx = createMockAudioContext();
    const synth = new AudioSynthesizer(mockCtx, mockCtx.createGain());
    assert.equal(synth.isReady(), true);

    synth.setMuted(true);
    assert.equal(synth.isReady(), false);
    assert.doesNotThrow(() => synth.playFlap());
  });

  test('AudioSynthesizer plays sounds when AudioContext mock is available', () => {
    const mockCtx = createMockAudioContext();
    const synth = new AudioSynthesizer(mockCtx, mockCtx.createGain());
    assert.equal(synth.isReady(), true);

    assert.doesNotThrow(() => synth.playFlap());
    assert.doesNotThrow(() => synth.playScore());
    assert.doesNotThrow(() => synth.playHit());
    assert.doesNotThrow(() => synth.playClick());
  });

  test('AudioManager manages volume, mute state, and storage persistence', () => {
    const storage = new StorageEngine('test_audio_pers');
    const audioMgr = new AudioManager({ storageEngine: storage });

    assert.equal(audioMgr.isMuted(), false);
    assert.equal(audioMgr.getVolume(), 0.8);

    const mutedState = audioMgr.toggleMute();
    assert.equal(mutedState, true);
    assert.equal(audioMgr.isMuted(), true);
    assert.equal(storage.getAudioPrefs().muted, true);

    audioMgr.setVolume(0.4);
    assert.equal(audioMgr.getVolume(), 0.4);
    assert.equal(storage.getAudioPrefs().volume, 0.4);
  });

  test('AudioManager subscribes to EventBus and triggers sound calls safely', () => {
    const bus = new EventBus();
    const audioMgr = new AudioManager({ eventBus: bus });

    assert.doesNotThrow(() => {
      bus.emit('BIRD_FLAP', { x: 100, y: 200 });
      bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
      bus.emit('BIRD_HIT', { x: 100, y: 200 });
    });
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
  console.log('\x1b[32m✔ ALL AUDIO & STORAGE UNIT TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
