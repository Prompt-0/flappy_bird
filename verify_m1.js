import { EventBus } from './public/js/engine/EventBus.js';
import { Bird } from './public/js/engine/Bird.js';
import { PipeManager } from './public/js/engine/PipeManager.js';
import { CollisionSystem } from './public/js/engine/CollisionSystem.js';
import { GameEngine } from './public/js/engine/GameEngine.js';

console.log('=== EMPIRICAL CHALLENGER VERIFICATION HARNESS ===\n');

let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`✓ PASS: ${message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Pipe Spawning Distance & Determinism
// -------------------------------------------------------------
console.log('--- Test 1: Pipe Spawning Interval & Determinism ---');
const pm = new PipeManager(null);
pm.reset();
const dt = 1 / 60;
let spawnDistances = [];
let prevScrolled = 0;

// Simulate 10 seconds of updates (600 frames)
for (let frame = 0; frame < 600; frame++) {
  const countBefore = pm.getPipes().length;
  pm.update(dt, 100);
  const countAfter = pm.getPipes().length;
  // If a new pipe was added (or spawned)
  if (countAfter > countBefore) {
    const deltaDist = pm.distanceScrolled - prevScrolled;
    spawnDistances.push({
      frame,
      distanceScrolled: pm.distanceScrolled,
      deltaDist,
      lastPipeX: pm.getPipes()[pm.getPipes().length - 1].x,
      prevPipeX: pm.getPipes().length > 1 ? pm.getPipes()[pm.getPipes().length - 2].x : null
    });
    prevScrolled = pm.distanceScrolled;
  }
}

console.log('Spawn events observed:', JSON.stringify(spawnDistances, null, 2));

if (spawnDistances.length >= 2) {
  const firstSpawnScroll = spawnDistances[0].distanceScrolled;
  const secondSpawnDelta = spawnDistances[1].deltaDist;
  console.log(`First pipe spawned at distanceScrolled = ${firstSpawnScroll}px`);
  console.log(`Second pipe spawned after additional scroll of = ${secondSpawnDelta}px`);
  
  assert(Math.abs(firstSpawnScroll - 200) < 1e-4, `First pipe should spawn after 200px scroll (actual: ${firstSpawnScroll}px)`);
  assert(Math.abs(secondSpawnDelta - 200) < 1e-4, `Subsequent pipes should spawn every 200px scroll displacement (actual: ${secondSpawnDelta}px)`);
} else {
  assert(false, `Expected at least 2 spawns during simulation, got ${spawnDistances.length}`);
}


// -------------------------------------------------------------
// Test 2: Random Gap Safety Ranges [45, 348]
// -------------------------------------------------------------
console.log('\n--- Test 2: Random Gap Safety Ranges ---');
const pm2 = new PipeManager(null);
let minObserved = Infinity;
let maxObserved = Infinity * -1;
let outOfBoundsCount = 0;

for (let i = 0; i < 100000; i++) {
  const gapTop = pm2.generateGapPosition();
  if (gapTop < minObserved) minObserved = gapTop;
  if (gapTop > maxObserved) maxObserved = gapTop;
  if (gapTop < 45 || gapTop > 348) {
    outOfBoundsCount++;
  }
}

console.log(`Generated 100,000 gaps. Min observed: ${minObserved}, Max observed: ${maxObserved}`);
assert(minObserved === 45, `Min gap top must be exactly 45 (actual: ${minObserved})`);
assert(maxObserved === 348, `Max gap top must be exactly 348 (actual: ${maxObserved})`);
assert(outOfBoundsCount === 0, `Zero gaps outside range [45, 348] (actual out of bounds: ${outOfBoundsCount})`);


// -------------------------------------------------------------
// Test 3: Bird Flap Impulse (-400px/s)
// -------------------------------------------------------------
console.log('\n--- Test 3: Bird Flap Impulse ---');
const bird = new Bird(null);
bird.reset(100, 250);
bird.vy = 200; // falling fast
bird.flap();

assert(bird.vy === -400, `Flap impulse must set vy to exactly -400 px/s (actual: ${bird.vy})`);
const expectedTiltRad = -20 * (Math.PI / 180);
assert(Math.abs(bird.rotation - expectedTiltRad) < 1e-6, `Flap impulse must set rotation to -20 deg (-0.349066 rad) (actual: ${bird.rotation})`);


// -------------------------------------------------------------
// Test 4: Rotational Tilt Interpolation Limits (-20° to +90°)
// -------------------------------------------------------------
console.log('\n--- Test 4: Rotational Tilt Interpolation Limits ---');
const bird2 = new Bird(null);
bird2.reset(100, 250);

const minRad = -20 * (Math.PI / 180);
const maxRad = 90 * (Math.PI / 180);

let minObservedRot = Infinity;
let maxObservedRot = -Infinity;

// Simulate falling for 3 seconds (180 frames) without flapping
for (let f = 0; f < 180; f++) {
  bird2.update(dt);
  if (bird2.rotation < minObservedRot) minObservedRot = bird2.rotation;
  if (bird2.rotation > maxObservedRot) maxObservedRot = bird2.rotation;
}

console.log(`Min observed rotation: ${minObservedRot} rad (${minObservedRot * 180 / Math.PI} deg)`);
console.log(`Max observed rotation: ${maxObservedRot} rad (${maxObservedRot * 180 / Math.PI} deg)`);

assert(minObservedRot >= minRad - 1e-6, `Rotation must not go below -20° (actual min: ${minObservedRot * 180 / Math.PI}°)`);
assert(maxObservedRot <= maxRad + 1e-6, `Rotation must not exceed +90° (actual max: ${maxObservedRot * 180 / Math.PI}°)`);

// Check interpolation when vy is between 150 and 650
bird2.reset(100, 250);
bird2.vy = 150;
bird2.rotation = minRad;
bird2.update(dt);
console.log(`Rotation after 1 step from vy=150: ${bird2.rotation * 180 / Math.PI} deg`);

bird2.vy = 650; // terminal velocity
for (let i = 0; i < 60; i++) {
  bird2.vy = 650;
  bird2.update(dt);
}
console.log(`Rotation after 60 steps at terminal velocity (650 px/s): ${bird2.rotation * 180 / Math.PI} deg`);
assert(Math.abs(bird2.rotation - maxRad) < 0.05, `Rotation at terminal velocity should converge close to +90° (actual: ${bird2.rotation * 180 / Math.PI}°)`);


// -------------------------------------------------------------
// Test 5: EventBus Memory/Listener Leak Protection
// -------------------------------------------------------------
console.log('\n--- Test 5: EventBus Memory Leak Protection ---');
const eb = new EventBus();

// 5a: Subscribe and unsubscribe
const cb1 = () => {};
const cb2 = () => {};
const unbind1 = eb.on('TEST_EVENT', cb1);
eb.on('TEST_EVENT', cb2);

assert(eb.listeners.get('TEST_EVENT').size === 2, 'Should have 2 listeners');

unbind1();
assert(eb.listeners.get('TEST_EVENT').size === 1, 'Should have 1 listener after unbind');

eb.off('TEST_EVENT', cb2);
assert(!eb.listeners.has('TEST_EVENT'), 'Map key should be deleted when set is empty (prevents key leaks)');

// 5b: Rapid subscribe/unsubscribe leak check
for (let i = 0; i < 1000; i++) {
  const unbind = eb.on('LEAK_CHECK', () => {});
  unbind();
}
assert(!eb.listeners.has('LEAK_CHECK'), 'Rapid sub/unsub should leave zero lingering entries in Map');

// 5c: clear() check
eb.on('EV1', () => {});
eb.on('EV2', () => {});
eb.clear();
assert(eb.listeners.size === 0, 'clear() must remove all entries from Map');


console.log(`\n==================================================`);
console.log(`Total Failures: ${failedTests}`);
console.log(`==================================================`);
