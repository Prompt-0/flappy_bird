/**
 * Stress & Edge Case Verification Suite for Milestone 2 Visual Effects & Polish
 * Runner: Node.js native assert/strict module
 * Execution Command: node tests/unit/test_challenger_2_visuals.js
 */

import assert from 'node:assert/strict';
import { Parallax, WeatherPhase } from '../../public/js/visuals/Parallax.js';
import { ParticleEngine } from '../../public/js/visuals/ParticleEngine.js';
import { SpriteCache } from '../../public/js/visuals/SpriteCache.js';

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

// Mock Canvas Context creator supporting standard and minimal context setups
function createMockContext(options = {}) {
  const minimal = options.minimal || false;

  const baseCtx = {
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    closePath: () => {},
    save: () => {},
    restore: () => {},
    strokeRect: () => {},
    globalAlpha: 1.0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1
  };

  if (!minimal) {
    baseCtx.createLinearGradient = () => ({
      addColorStop: () => {}
    });
  }

  return baseCtx;
}

// ==========================================
// Suite 1: Zero and Boundary dt Updates
// ==========================================
describe('1) Zero and Boundary dt Updates', () => {
  test('Zero dt (dt = 0) returns early and does not mutate offsets, timers, or particle state', () => {
    const parallax = new Parallax(360, 640, { autoCycle: true });
    const initialOffsets = parallax.getLayerOffsets();
    const initialTimer = parallax.phaseTimer;

    parallax.update(0, 160);

    const postOffsets = parallax.getLayerOffsets();
    assert.equal(postOffsets[0], initialOffsets[0]);
    assert.equal(postOffsets[1], initialOffsets[1]);
    assert.equal(postOffsets[2], initialOffsets[2]);
    assert.equal(postOffsets[3], initialOffsets[3]);
    assert.equal(postOffsets[4], initialOffsets[4]);
    assert.equal(parallax.phaseTimer, initialTimer);

    // ParticleEngine check
    const particles = new ParticleEngine(200);
    particles.emitFlapTrail(100, 100);
    const activeCount = particles.getActiveCount();
    const firstParticleX = particles.pool[0].x;

    particles.update(0);
    assert.equal(particles.getActiveCount(), activeCount);
    assert.equal(particles.pool[0].x, firstParticleX);
  });

  test('Negative dt (dt < 0) returns early and does not corrupt engine state', () => {
    const parallax = new Parallax(360, 640);
    const initialOffsets = parallax.getLayerOffsets();

    parallax.update(-0.016, 160);
    const postOffsets = parallax.getLayerOffsets();

    assert.equal(postOffsets[1], initialOffsets[1]);
    assert.equal(postOffsets[4], initialOffsets[4]);

    const particles = new ParticleEngine(200);
    particles.emitCollisionBurst(100, 100);
    const initialActive = particles.getActiveCount();

    particles.update(-1.0);
    assert.equal(particles.getActiveCount(), initialActive);
  });

  test('Extreme step sizes (dt = 0.000001 micro-step vs dt = 100.0 macro step)', () => {
    const parallax = new Parallax(360, 640);

    // Micro step
    assert.doesNotThrow(() => parallax.update(0.000001, 160));
    const microOffsets = parallax.getLayerOffsets();
    for (let i = 0; i < 5; i++) {
      assert.ok(!Number.isNaN(microOffsets[i]));
    }

    // Macro step
    assert.doesNotThrow(() => parallax.update(100.0, 160));
    const macroOffsets = parallax.getLayerOffsets();
    for (let i = 0; i < 5; i++) {
      assert.ok(!Number.isNaN(macroOffsets[i]));
      assert.ok(macroOffsets[i] >= 0 && macroOffsets[i] < 360, `Offset layer ${i} out of bounds: ${macroOffsets[i]}`);
    }
  });
});

// ==========================================
// Suite 2: High Velocity Scroll & Multi-Layer Parallax Wrapping
// ==========================================
describe('2) High Velocity Scroll & Multi-Layer Parallax Wrapping', () => {
  test('High velocity scroll (scrollSpeed = 10,000 px/s) wraps all 5 layers modulo layer width', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    const highSpeed = 10000;
    const dt = 0.16;

    parallax.update(dt, highSpeed);
    const offsets = parallax.getLayerOffsets();

    // Expected ratios: 0.0, 0.15, 0.40, 0.75, 1.0
    // Ground displacement: 10000 * 1.0 * 0.16 = 1600px -> 1600 % 360 = 160px
    assert.equal(offsets[0], 0, 'Sky ratio 0.0 offset must be 0');
    assert.equal(offsets[1], (10000 * 0.15 * 0.16) % 360, 'Mountains layer wrapping check');
    assert.equal(offsets[2], (10000 * 0.40 * 0.16) % 360, 'Hills layer wrapping check');
    assert.equal(offsets[3], (10000 * 0.75 * 0.16) % 360, 'Bushes layer wrapping check');
    assert.equal(offsets[4], 160, 'Ground layer wrapping check (1600 % 360)');

    for (let i = 0; i < 5; i++) {
      assert.ok(offsets[i] >= 0 && offsets[i] < 360, `Layer ${i} offset ${offsets[i]} out of [0, 360) bounds`);
    }
  });

  test('Extreme velocity scroll (scrollSpeed = 1,000,000 px/s) does not cause overflow or NaN', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    const extremeSpeed = 1000000;

    for (let frame = 0; frame < 100; frame++) {
      parallax.update(0.016, extremeSpeed);
      const offsets = parallax.getLayerOffsets();
      for (let i = 0; i < 5; i++) {
        assert.ok(!Number.isNaN(offsets[i]), `Layer ${i} offset is NaN`);
        assert.ok(offsets[i] >= 0 && offsets[i] < 360, `Layer ${i} offset out of bounds: ${offsets[i]}`);
      }
    }
  });

  test('Parallax wrapping behavior with custom canvas width (width = 800)', () => {
    const parallax = new Parallax(800, 600, { autoCycle: false });
    const scrollSpeed = 200;

    // Update for 5 seconds -> Ground displacement = 200 * 1.0 * 5 = 1000px -> 1000 % 800 = 200px
    parallax.update(5.0, scrollSpeed);
    const offsets = parallax.getLayerOffsets();

    assert.equal(offsets[4], 200, 'Ground offset on 800px wide canvas must wrap to 200');
    for (let i = 0; i < 5; i++) {
      assert.ok(offsets[i] >= 0 && offsets[i] < 800, `Layer ${i} offset ${offsets[i]} must be in [0, 800)`);
    }
  });
});

// ==========================================
// Suite 3: Rapid Weather Phase Switching & State Consistency
// ==========================================
describe('3) Rapid Weather Phase Switching & State Consistency', () => {
  test('Rapidly switching setPhase 1,000 times preserves weather state consistency', () => {
    const parallax = new Parallax(360, 640);
    const phases = [WeatherPhase.DAY, WeatherPhase.SUNSET, WeatherPhase.NIGHT, WeatherPhase.DAWN];

    for (let i = 0; i < 1000; i++) {
      const targetPhase = phases[i % phases.length];
      parallax.setPhase(targetPhase);
      assert.equal(parallax.getPhase(), targetPhase);

      const skyColors = parallax.getSkyColors();
      assert.ok(skyColors.top.startsWith('rgb('), `Top sky color must be valid RGB string: ${skyColors.top}`);
      assert.ok(skyColors.bottom.startsWith('rgb('), `Bottom sky color must be valid RGB string: ${skyColors.bottom}`);

      const celestial = parallax.getCelestialPosition();
      assert.ok(!Number.isNaN(celestial.x));
      assert.ok(!Number.isNaN(celestial.y));
      assert.ok(celestial.type === 'sun' || celestial.type === 'moon');
    }
  });

  test('Invalid phase string passed to setPhase is safely ignored', () => {
    const parallax = new Parallax(360, 640);
    parallax.setPhase('DAY');

    parallax.setPhase('SUPER_SAIYAN'); // Invalid
    assert.equal(parallax.getPhase(), WeatherPhase.DAY, 'Phase must remain unchanged when invalid phase string is provided');
    assert.doesNotThrow(() => parallax.getSkyColors());
  });

  test('Auto-cycle weather transition window lerping and state progression', () => {
    const parallax = new Parallax(360, 640, { phaseDuration: 10, autoCycle: true });

    // Advance to 8.5 seconds (in the last 20% transition window of 10s phase duration: 8.0s to 10.0s)
    parallax.update(8.5, 160);

    assert.equal(parallax.currentPhase, WeatherPhase.DAY);
    assert.equal(parallax.targetPhase, WeatherPhase.SUNSET);
    assert.ok(parallax.phaseTransitionProgress > 0 && parallax.phaseTransitionProgress < 1.0,
      `Transition progress should be between 0 and 1 during lerp window, got ${parallax.phaseTransitionProgress}`);

    const lerpedColors = parallax.getSkyColors();
    assert.ok(lerpedColors.top.startsWith('rgb('));
    assert.ok(lerpedColors.bottom.startsWith('rgb('));

    // Advance past phase boundary (to 10.5 seconds)
    parallax.update(2.0, 160);
    assert.equal(parallax.getPhase(), WeatherPhase.SUNSET);
  });
});

// ==========================================
// Suite 4: Particle Engine Reset while Active Particles Exist
// ==========================================
describe('4) Particle Engine Reset while Active Particles Exist', () => {
  test('Calling reset() when particle pool is fully saturated (200 active) deactivates all particles cleanly', () => {
    const engine = new ParticleEngine(200);

    // Emit enough particles to saturate the pool
    for (let i = 0; i < 10; i++) {
      engine.emitCollisionBurst(100, 100);
    }
    assert.equal(engine.getActiveCount(), 200, 'Pool must be fully saturated at 200 active');

    // Reset while active
    engine.reset();

    assert.equal(engine.getActiveCount(), 0, 'Active count must be 0 after reset()');
    for (let i = 0; i < 200; i++) {
      assert.equal(engine.pool[i].active, false, `Particle ${i} active property must be false`);
    }

    // Verify updating engine after reset does not throw or reactivate dead particles
    assert.doesNotThrow(() => engine.update(0.016));
    assert.equal(engine.getActiveCount(), 0);

    // Verify rendering after reset renders 0 particles safely
    const mockCtx = createMockContext();
    assert.doesNotThrow(() => engine.render(mockCtx));
  });

  test('Emitting new particles immediately after reset() works correctly starting at index 0', () => {
    const engine = new ParticleEngine(200);
    engine.emitCollisionBurst(100, 100);
    assert.ok(engine.getActiveCount() > 0);

    engine.reset();

    // Emit 4 flap trail particles
    engine.emitFlapTrail(50, 50);
    assert.equal(engine.getActiveCount(), 4, 'Active count must equal 4 after post-reset flap trail emission');
    assert.equal(engine.pool[0].active, true, 'Particle at index 0 must be active');
    assert.equal(engine.pool[0].x, 50, 'Particle at index 0 position must match emission input');
    assert.equal(engine.pool[4].active, false, 'Particle at index 4 must remain inactive');
  });
});

// ==========================================
// Suite 5: Particle Pool Object Identity Array & Zero-Allocation Verification
// ==========================================
describe('5) Particle Pool Object Identity Array & Zero-Allocation Verification', () => {
  test('Pre-allocated object identities in pool are strictly preserved without heap instantiation', () => {
    const capacity = 200;
    const engine = new ParticleEngine(capacity);

    // Capture initial pool array reference and individual particle object references
    const initialPoolArrayRef = engine.pool;
    const initialObjectRefs = engine.pool.map(particle => particle);

    // Assert initial setup
    assert.equal(initialObjectRefs.length, capacity);
    for (let i = 0; i < capacity; i++) {
      assert.ok(typeof initialObjectRefs[i] === 'object' && initialObjectRefs[i] !== null);
    }

    // Heavy emission workload: 50 emission operations across all presets
    for (let i = 0; i < 50; i++) {
      engine.emitFlapTrail(i * 10, i * 5);
      engine.emitCollisionBurst(i * 5, i * 10);
      engine.emitScoreSparkles(i * 2, i * 8);
      engine.update(0.05);
    }

    // Trigger pool saturation and recycling
    for (let i = 0; i < 20; i++) {
      engine.emitCollisionBurst(180, 200);
    }

    // Assert array reference has NOT mutated
    assert.equal(engine.pool, initialPoolArrayRef, 'engine.pool array reference MUST NOT be re-assigned');
    assert.equal(engine.pool.length, capacity, 'engine.pool length MUST strictly remain 200');

    // Assert EVERY particle object reference in pool is identical to pre-allocated instance
    for (let i = 0; i < capacity; i++) {
      assert.equal(engine.pool[i], initialObjectRefs[i],
        `Object identity at index ${i} changed! Pre-allocated pool object was overwritten or instantiated on heap.`);
    }
  });

  test('Recycling algorithm when pool saturated mutates pre-allocated object in-place', () => {
    const engine = new ParticleEngine(200);

    // Fill pool
    for (let i = 0; i < 10; i++) {
      engine.emitCollisionBurst(100, 100);
    }
    assert.equal(engine.getActiveCount(), 200);

    // Store reference to particle object with lowest life
    let minIndex = 0;
    let minLife = engine.pool[0].life;
    for (let i = 1; i < 200; i++) {
      if (engine.pool[i].life < minLife) {
        minLife = engine.pool[i].life;
        minIndex = i;
      }
    }
    const targetObjectRef = engine.pool[minIndex];

    // Emit 1 particle to trigger recycling
    engine.emitFlapTrail(999, 888);

    // Verify the object reference in pool at minIndex is identical, but its properties were mutated
    assert.equal(engine.pool[minIndex], targetObjectRef, 'Recycled object reference must remain identical in pool');
    assert.equal(engine.pool[minIndex].x, 999, 'Recycled object X property must be updated in-place');
    assert.equal(engine.pool[minIndex].y, 888, 'Recycled object Y property must be updated in-place');
  });
});

// ==========================================
// Suite 6: Rendering with Mock Canvas Contexts
// ==========================================
describe('6) Rendering with Mock Canvas Contexts', () => {
  test('Parallax rendering with full mock context', () => {
    const parallax = new Parallax(360, 640);
    const mockCtx = createMockContext({ minimal: false });

    assert.doesNotThrow(() => parallax.render(mockCtx));
  });

  test('Parallax rendering with minimal mock context (missing createLinearGradient)', () => {
    const parallax = new Parallax(360, 640);
    const mockCtx = createMockContext({ minimal: true });

    assert.doesNotThrow(() => parallax.render(mockCtx), 'Must degrade gracefully when createLinearGradient is unavailable');
  });

  test('Parallax rendering with null/undefined context', () => {
    const parallax = new Parallax(360, 640);

    assert.doesNotThrow(() => parallax.render(null));
    assert.doesNotThrow(() => parallax.render(undefined));
  });

  test('ParticleEngine rendering with minimal mock context and null context', () => {
    const engine = new ParticleEngine(200);
    engine.emitCollisionBurst(100, 100);

    const mockCtx = createMockContext({ minimal: true });
    assert.doesNotThrow(() => engine.render(mockCtx));
    assert.doesNotThrow(() => engine.render(null));
    assert.doesNotThrow(() => engine.render(undefined));
  });

  test('SpriteCache pipe and ground sprite generation with mock canvas', () => {
    const spriteCache = new SpriteCache();

    assert.doesNotThrow(() => {
      const pipeSprite = spriteCache.getPipeSprite(64, 400, '#73bf2e');
      assert.ok(pipeSprite);
      assert.ok(pipeSprite.getContext);
    });

    assert.doesNotThrow(() => {
      const groundSprite = spriteCache.getGroundSprite(360, 112);
      assert.ok(groundSprite);
      assert.ok(groundSprite.getContext);
    });
  });
});

// ==========================================
// Final Results Reporting & Exit Code
// ==========================================
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Challenger 2 Total Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (failedTests > 0) {
  console.error('\x1b[31mChallenger 2 Failures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.stack || error.message);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL CHALLENGER 2 STRESS & EDGE CASE TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
