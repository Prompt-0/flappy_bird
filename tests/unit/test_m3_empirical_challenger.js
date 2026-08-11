/**
 * test_m3_empirical_challenger.js
 * Empirical challenge test suite for Milestone 3 (Audio, Persistence & Customization).
 * Verified by Challenger M3-2.
 */

import { StorageEngine } from '../../public/js/storage/StorageEngine.js';
import { SkinManager } from '../../public/js/storage/SkinManager.js';
import { AudioManager } from '../../public/js/audio/AudioManager.js';
import { EventBus } from '../../public/js/engine/EventBus.js';

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
console.log(' EMPIRICAL CHALLENGE SUITE — MILESTONE 3');
console.log('===================================================\n');

// ----------------------------------------------------
// Test Group 1: Volume Bounds Clamping
// ----------------------------------------------------
console.log('▶ Challenge 1: Volume Bounds Clamping (-0.5 -> 0, 1.5 -> 1, invalid inputs)');
{
  const storage = new StorageEngine('test_vol_clamp_storage');
  storage.reset();
  const audioManager = new AudioManager({ storageEngine: storage });

  // Lower bound clamping
  const lowerVol = audioManager.setVolume(-0.5);
  assert(lowerVol === 0, `setVolume(-0.5) returns 0 (actual: ${lowerVol})`);
  assert(audioManager.getVolume() === 0, `getVolume() is 0 after setVolume(-0.5)`);
  assert(storage.getAudioPrefs().volume === 0, `storage volume persisted as 0 for setVolume(-0.5)`);

  // Upper bound clamping
  const upperVol = audioManager.setVolume(1.5);
  assert(upperVol === 1, `setVolume(1.5) returns 1 (actual: ${upperVol})`);
  assert(audioManager.getVolume() === 1, `getVolume() is 1 after setVolume(1.5)`);
  assert(storage.getAudioPrefs().volume === 1, `storage volume persisted as 1 for setVolume(1.5)`);

  // Valid middle value
  const midVol = audioManager.setVolume(0.42);
  assert(midVol === 0.42, `setVolume(0.42) returns 0.42 (actual: ${midVol})`);
  assert(storage.getAudioPrefs().volume === 0.42, `storage volume persisted as 0.42`);

  // Invalid non-number inputs should preserve existing volume
  const curVol = audioManager.getVolume();
  const stringResult = audioManager.setVolume('invalid');
  assert(stringResult === curVol, `setVolume('invalid') returns current volume unchanged (${curVol})`);
  assert(audioManager.getVolume() === curVol, `getVolume() remains ${curVol} after invalid string input`);

  const nanResult = audioManager.setVolume(NaN);
  assert(nanResult === curVol, `setVolume(NaN) returns current volume unchanged (${curVol})`);

  const nullResult = audioManager.setVolume(null);
  assert(nullResult === curVol, `setVolume(null) returns current volume unchanged (${curVol})`);
}

// ----------------------------------------------------
// Test Group 2: Mute State Persistence & Idempotency
// ----------------------------------------------------
console.log('\n▶ Challenge 2: Mute State Persistence & Toggle Idempotency');
{
  const storageKey = 'test_mute_persistence_key';
  const storage1 = new StorageEngine(storageKey);
  storage1.reset();

  const audioManager1 = new AudioManager({ storageEngine: storage1 });
  assert(audioManager1.isMuted() === false, `Initial mute state is false`);

  // Toggle mute ON
  const mutedState1 = audioManager1.toggleMute();
  assert(mutedState1 === true, `toggleMute() toggles from false to true`);
  assert(audioManager1.isMuted() === true, `audioManager1.isMuted() is true`);
  assert(storage1.getAudioPrefs().muted === true, `storage1 persisted muted state as true`);

  // Reload new AudioManager instance from same StorageEngine
  const audioManager2 = new AudioManager({ storageEngine: storage1 });
  assert(audioManager2.isMuted() === true, `audioManager2 reloaded from storage inherits muted === true`);

  // Toggle back OFF
  const mutedState2 = audioManager2.toggleMute();
  assert(mutedState2 === false, `audioManager2.toggleMute() toggles back to false`);
  assert(storage1.getAudioPrefs().muted === false, `storage1 updated muted state to false`);

  // Reload third AudioManager instance
  const audioManager3 = new AudioManager({ storageEngine: storage1 });
  assert(audioManager3.isMuted() === false, `audioManager3 reloaded from storage inherits muted === false`);
}

// ----------------------------------------------------
// Test Group 3: Multi-Threshold Skin Unlock Skipping
// ----------------------------------------------------
console.log('\n▶ Challenge 3: Multi-Threshold Skin Unlock Skipping');
{
  const storage = new StorageEngine('test_skin_multi_unlock');
  storage.reset();

  const skinManager = new SkinManager(storage);
  assert(skinManager.getSelectedSkin() === 'classic_yellow', `Default selected skin is classic_yellow`);

  const initialSkins = skinManager.getSkins();
  const unlockedInitial = initialSkins.filter(s => s.unlocked).map(s => s.id);
  assert(unlockedInitial.length === 1 && unlockedInitial[0] === 'classic_yellow', `Only classic_yellow unlocked initially`);

  // Jump score directly from 0 to 120 in a single step (skipping thresholds 20, 50, 100)
  const newlyUnlocked = skinManager.checkUnlocks(120, { totalGames: 5 });
  assert(newlyUnlocked.includes('crimson_phoenix'), `checkUnlocks(120) unlocks crimson_phoenix (threshold 20)`);
  assert(newlyUnlocked.includes('neon_cyber'), `checkUnlocks(120) unlocks neon_cyber (threshold 50)`);
  assert(newlyUnlocked.includes('golden_eagle'), `checkUnlocks(120) unlocks golden_eagle (threshold 100)`);
  assert(newlyUnlocked.length === 3, `checkUnlocks(120) returned exactly 3 newly unlocked skins simultaneously`);

  // Check persisted skins in StorageEngine
  const storedSkins = storage.getSkins();
  assert(storedSkins.unlockedSkins.length === 4, `StorageEngine holds 4 unlocked skins after jump`);
  assert(storedSkins.unlockedSkins.includes('classic_yellow'), `StorageEngine includes classic_yellow`);
  assert(storedSkins.unlockedSkins.includes('crimson_phoenix'), `StorageEngine includes crimson_phoenix`);
  assert(storedSkins.unlockedSkins.includes('neon_cyber'), `StorageEngine includes neon_cyber`);
  assert(storedSkins.unlockedSkins.includes('golden_eagle'), `StorageEngine includes golden_eagle`);

  // Verify selecting newly multi-unlocked skin
  const selectSuccess = skinManager.selectSkin('golden_eagle');
  assert(selectSuccess === true, `Successfully selected golden_eagle skin after multi-unlock`);
  assert(skinManager.getSelectedSkin() === 'golden_eagle', `SkinManager selectedSkin is golden_eagle`);

  // Unlock final game-count skin
  const finalUnlocked = skinManager.checkUnlocks(120, { totalGames: 50 });
  assert(finalUnlocked.length === 1 && finalUnlocked[0] === 'midnight_raven', `checkUnlocks with totalGames=50 unlocks midnight_raven`);
  assert(skinManager.getSkins().filter(s => s.unlocked).length === 5, `All 5 skins are now unlocked`);
}

// ----------------------------------------------------
// Test Group 4: EventBus Listener Payload Resiliency
// ----------------------------------------------------
console.log('\n▶ Challenge 4: EventBus Payload Resiliency');
{
  const eventBus = new EventBus();
  const storage = new StorageEngine('test_eventbus_resiliency');
  storage.reset();
  const audioManager = new AudioManager({ eventBus, storageEngine: storage });

  let errorCount = 0;
  const badPayloads = [
    undefined,
    null,
    {},
    42,
    "unexpected string",
    { x: NaN, y: Infinity },
    [1, 2, 3],
    new Error("unexpected payload error")
  ];

  // Circular reference payload
  const circularObj = {};
  circularObj.self = circularObj;
  badPayloads.push(circularObj);

  badPayloads.forEach((payload, idx) => {
    try {
      eventBus.emit('BIRD_FLAP', payload);
      eventBus.emit('PIPE_PASS', payload);
      eventBus.emit('BIRD_HIT', payload);
    } catch (err) {
      errorCount++;
      console.error(`  Exception on payload index ${idx}:`, err);
    }
  });

  assert(errorCount === 0, `Emitted ${badPayloads.length * 3} events with malformed payloads without throwing any exceptions`);
}

// ----------------------------------------------------
// Test Group 5: High-Frequency Performance & Stress Test
// ----------------------------------------------------
console.log('\n▶ Challenge 5: High-Frequency Performance & Stress Test');
{
  const storage = new StorageEngine('test_stress_perf');
  storage.reset();
  const eventBus = new EventBus();
  const audioManager = new AudioManager({ eventBus, storageEngine: storage });
  const skinManager = new SkinManager(storage);

  const iterations = 5000;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    audioManager.setVolume(i / iterations);
    audioManager.toggleMute();
    skinManager.checkUnlocks(i % 150, { totalGames: i % 60 });
    eventBus.emit('BIRD_FLAP', { index: i });
  }

  const durationMs = Date.now() - startTime;
  console.log(`  ⏱ Executed ${iterations} stress iterations in ${durationMs}ms`);
  assert(durationMs < 1000, `Stress loop completed in under 1000ms (actual: ${durationMs}ms)`);
}

console.log('\n===================================================');
console.log(` Total Assertions: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
console.log('===================================================');

if (totalTests === passedTests) {
  console.log('\n✔ ALL EMPIRICAL CHALLENGES PASSED!');
  process.exit(0);
} else {
  console.error('\n✖ EMPIRICAL CHALLENGES FAILED!');
  process.exit(1);
}
