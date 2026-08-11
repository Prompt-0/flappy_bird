/**
 * Adversarial Stress Test Suite for Flappy Bird Milestone 2 Visual Effects & Polish
 * Challenger: Challenger 1
 * Script: tests/unit/test_challenger_1_visuals.js
 * Execution Command: node tests/unit/test_challenger_1_visuals.js
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

// Mock Canvas Context helper for rendering tests
function createMockContext() {
  return {
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
    lineWidth: 1,
    createLinearGradient: () => ({
      addColorStop: () => {}
    })
  };
}

// ============================================================================
// Suite 1: Particle Pool Saturation, Object Reference Identity & Recycling
// ============================================================================
describe('Suite 1: Particle Pool Saturation, Object Reference Identity & Recycling', () => {
  test('Particle pool pre-allocates exactly 200 particle references and preserves object identity over 1,500 emissions', () => {
    const engine = new ParticleEngine(200);
    assert.equal(engine.getPoolCapacity(), 200, 'Capacity must be 200');
    assert.equal(engine.pool.length, 200, 'Pool array length must be 200');

    // Capture initial object references for all 200 pool slots
    const initialRefs = engine.pool.slice();

    // Emit 1,500 particles (well over 200 capacity) using all 3 emission presets
    for (let i = 0; i < 50; i++) {
      engine.emitFlapTrail(100, 200);       // 4 particles x 50 = 200
      engine.emitCollisionBurst(150, 250); // 25 particles x 50 = 1250
      engine.emitScoreSparkles(200, 300);  // 15 particles x 50 = 750
    }

    // Verify zero allocations: object references in pool must remain 100% identical
    assert.equal(engine.pool.length, 200, 'Pool length must stay capped at 200');
    for (let i = 0; i < 200; i++) {
      assert.equal(
        engine.pool[i],
        initialRefs[i],
        `Particle object reference at index ${i} changed! Memory leak/re-allocation detected.`
      );
    }
  });

  test('Particle pool capacity capping: active count never exceeds 200 even under heavy emission overload', () => {
    const engine = new ParticleEngine(200);

    // Overload with 100 collision bursts (25 * 100 = 2,500 emissions)
    for (let i = 0; i < 100; i++) {
      engine.emitCollisionBurst(100, 100);
      assert.ok(
        engine.getActiveCount() <= 200,
        `Active count exceeded 200 capacity! Current active: ${engine.getActiveCount()}`
      );
      assert.equal(engine.pool.length, 200, 'Pool array length must remain exactly 200');
    }

    assert.equal(engine.getActiveCount(), 200, 'Pool should be fully saturated at 200 active particles');
  });

  test('Particle recycling algorithm: recycles the particle with lowest remaining life when saturated', () => {
    const engine = new ParticleEngine(5); // Small pool of capacity 5 for explicit recycling verification

    // Manually configure pool particles with known life values
    for (let i = 0; i < 5; i++) {
      engine.pool[i].active = true;
      engine.pool[i].life = (i + 1) * 0.2; // [0.2, 0.4, 0.6, 0.8, 1.0]
    }

    // Lowest life is at index 0 (life = 0.2)
    const acquired = engine._acquireParticle();
    assert.equal(acquired, engine.pool[0], 'Must acquire particle with lowest remaining life (index 0)');

    // Modify life of index 2 to be lowest (0.05)
    engine.pool[2].life = 0.05;
    const acquired2 = engine._acquireParticle();
    assert.equal(acquired2, engine.pool[2], 'Must acquire particle with lowest remaining life (index 2)');
  });

  test('ParticleEngine update and continuous simulation loop across 1,000 frames without memory leaks or NaNs', () => {
    const engine = new ParticleEngine(200);
    const initialRefs = engine.pool.slice();
    const dt = 0.016; // 60 FPS frame delta

    for (let frame = 0; frame < 1000; frame++) {
      // Emit flap trail every 5 frames
      if (frame % 5 === 0) {
        engine.emitFlapTrail(120, 200);
      }
      // Emit sparkles every 20 frames
      if (frame % 20 === 0) {
        engine.emitScoreSparkles(180, 150);
      }
      // Emit burst every 100 frames
      if (frame % 100 === 0) {
        engine.emitCollisionBurst(180, 400);
      }

      engine.update(dt);

      // Verify state integrity after update
      const activeCount = engine.getActiveCount();
      assert.ok(activeCount >= 0 && activeCount <= 200, `Active count out of range: ${activeCount}`);

      for (let i = 0; i < 200; i++) {
        const p = engine.pool[i];
        assert.equal(engine.pool[i], initialRefs[i], 'Particle reference changed during simulation loop');
        assert.ok(!Number.isNaN(p.x), `Particle ${i} x is NaN at frame ${frame}`);
        assert.ok(!Number.isNaN(p.y), `Particle ${i} y is NaN at frame ${frame}`);
        assert.ok(!Number.isNaN(p.vx), `Particle ${i} vx is NaN at frame ${frame}`);
        assert.ok(!Number.isNaN(p.vy), `Particle ${i} vy is NaN at frame ${frame}`);
        assert.ok(!Number.isNaN(p.life), `Particle ${i} life is NaN at frame ${frame}`);
        assert.ok(!Number.isNaN(p.alpha), `Particle ${i} alpha is NaN at frame ${frame}`);
      }
    }
  });

  test('ParticleEngine reset() deactivates all 200 particles immediately', () => {
    const engine = new ParticleEngine(200);
    engine.emitCollisionBurst(100, 100);
    engine.emitScoreSparkles(100, 100);
    assert.ok(engine.getActiveCount() > 0, 'Active count should be non-zero after emissions');

    engine.reset();
    assert.equal(engine.getActiveCount(), 0, 'Active count must be 0 after reset()');
    for (let i = 0; i < 200; i++) {
      assert.equal(engine.pool[i].active, false, `Particle ${i} active state must be false after reset()`);
    }
  });
});

// ============================================================================
// Suite 2: Parallax Extreme dt, Negative Deltas, Modulo Wrapping & 100k-Step Stress
// ============================================================================
describe('Suite 2: Parallax Extreme dt, Negative Deltas, Modulo Wrapping & 100k-Step Stress', () => {
  test('Parallax layer speed ratios conform strictly to spec (0.0x, 0.15x, 0.40x, 0.75x, 1.0x)', () => {
    const parallax = new Parallax(360, 640);
    assert.equal(parallax.layers[0].ratio, 0.0, 'Sky ratio must be 0.0');
    assert.equal(parallax.layers[1].ratio, 0.15, 'Mountains ratio must be 0.15');
    assert.equal(parallax.layers[2].ratio, 0.40, 'Hills ratio must be 0.40');
    assert.equal(parallax.layers[3].ratio, 0.75, 'Bushes ratio must be 0.75');
    assert.equal(parallax.layers[4].ratio, 1.0, 'Ground ratio must be 1.0');
  });

  test('Parallax extreme dt values: dt = 0, dt = 0.000001 (sub-ms), dt = 100s, dt = 10000s', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });

    // 1. dt = 0
    parallax.update(0, 160);
    let offsets = parallax.getLayerOffsets();
    for (let i = 0; i < 5; i++) {
      assert.equal(offsets[i], 0, `dt = 0 should result in 0 displacement for layer ${i}`);
    }

    // 2. dt = 0.000001 (sub-millisecond)
    parallax.update(0.000001, 160);
    offsets = parallax.getLayerOffsets();
    for (let i = 0; i < 5; i++) {
      assert.ok(!Number.isNaN(offsets[i]), `Layer ${i} offset is NaN for sub-ms dt`);
      assert.ok(Number.isFinite(offsets[i]), `Layer ${i} offset is not finite for sub-ms dt`);
    }

    // 3. dt = 100 (lag spike / tab blur backgrounding)
    parallax.update(100.0, 160);
    offsets = parallax.getLayerOffsets();
    for (let i = 0; i < 5; i++) {
      assert.ok(!Number.isNaN(offsets[i]), `Layer ${i} offset is NaN for dt=100s`);
      assert.ok(Number.isFinite(offsets[i]), `Layer ${i} offset is not finite for dt=100s`);
    }

    // 4. dt = 10000 (huge jump)
    parallax.update(10000.0, 160);
    offsets = parallax.getLayerOffsets();
    for (let i = 0; i < 5; i++) {
      assert.ok(!Number.isNaN(offsets[i]), `Layer ${i} offset is NaN for dt=10000s`);
      assert.ok(Number.isFinite(offsets[i]), `Layer ${i} offset is not finite for dt=10000s`);
    }
  });

  test('Parallax negative dt values: update(-0.1) and update(-10) safely guard without corruption', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    parallax.update(1.0, 160);
    const offsetsBefore = parallax.getLayerOffsets();

    // Call update with negative dt values
    parallax.update(-0.1, 160);
    parallax.update(-10.0, 160);

    const offsetsAfter = parallax.getLayerOffsets();
    for (let i = 0; i < 5; i++) {
      assert.equal(
        offsetsAfter[i],
        offsetsBefore[i],
        `Negative dt altered offset for layer ${i}! Expected early return.`
      );
      assert.ok(!Number.isNaN(offsetsAfter[i]), `Layer ${i} offset became NaN on negative dt`);
    }
  });

  test('Parallax multi-thousand step scroll stress test: 100,000 updates without drift, NaNs or breaks', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    const scrollSpeed = 160;
    const dt = 1 / 60; // 60 FPS

    for (let step = 1; step <= 100000; step++) {
      parallax.update(dt, scrollSpeed);

      if (step % 25000 === 0) {
        const offsets = parallax.getLayerOffsets();
        for (let i = 0; i < 5; i++) {
          assert.ok(!Number.isNaN(offsets[i]), `Layer ${i} offset is NaN at step ${step}`);
          assert.ok(Number.isFinite(offsets[i]), `Layer ${i} offset is non-finite at step ${step}`);
        }
      }
    }

    const finalOffsets = parallax.getLayerOffsets();
    assert.equal(finalOffsets[0], 0, 'Sky layer (0.0x ratio) must remain 0 after 100k steps');
  });

  test('Parallax getLayerOffsets provides dual access mode (indexed array and named properties)', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    parallax.update(1.0, 100);
    const offsets = parallax.getLayerOffsets();

    assert.equal(offsets[0], offsets.sky);
    assert.equal(offsets[1], offsets.mountains);
    assert.equal(offsets[2], offsets.hills);
    assert.equal(offsets[3], offsets.bushes);
    assert.equal(offsets[4], offsets.ground);
  });
});

// ============================================================================
// Suite 3: Day/Night Weather Cycle Boundaries, Phase Transitions & Celestial Arc
// ============================================================================
describe('Suite 3: Day/Night Weather Cycle Boundaries, Phase Transitions & Celestial Arc', () => {
  test('Parallax weather cycle phase transitions: DAY -> SUNSET -> NIGHT -> DAWN -> DAY', () => {
    const parallax = new Parallax(360, 640);

    const phases = [WeatherPhase.DAY, WeatherPhase.SUNSET, WeatherPhase.NIGHT, WeatherPhase.DAWN];
    for (const phase of phases) {
      parallax.setPhase(phase);
      assert.equal(parallax.getPhase(), phase, `Failed to transition to phase ${phase}`);
    }

    // Wrap around to DAY
    parallax.setPhase('DAY');
    assert.equal(parallax.getPhase(), WeatherPhase.DAY);
  });

  test('Sky gradient lerp returns valid RGB formatted string across phase transition progress (0.0 to 1.0)', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    const rgbRegex = /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/;

    parallax.currentPhase = WeatherPhase.DAY;
    parallax.targetPhase = WeatherPhase.SUNSET;

    const testProgresses = [0.0, 0.25, 0.5, 0.75, 1.0];
    for (const t of testProgresses) {
      parallax.phaseTransitionProgress = t;
      const colors = parallax.getSkyColors();

      assert.ok(
        rgbRegex.test(colors.top),
        `Top sky color at t=${t} invalid format: ${colors.top}`
      );
      assert.ok(
        rgbRegex.test(colors.bottom),
        `Bottom sky color at t=${t} invalid format: ${colors.bottom}`
      );
    }
  });

  test('Celestial orbital arc math across phase progress boundaries (0.0 horizon left -> 0.5 zenith -> 1.0 horizon right)', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });

    // 1. Horizon Left (phaseProgress = 0.0)
    parallax.setPhase('DAY');
    parallax.phaseProgress = 0.0;
    let pos = parallax.getCelestialPosition();
    assert.equal(pos.type, 'sun');
    assert.ok(Math.abs(pos.x - 30) < 1e-4, `Expected X ~ 30 at horizon left, got ${pos.x}`);
    assert.ok(Math.abs(pos.y - 396) < 1e-4, `Expected Y ~ 396 at horizon left, got ${pos.y}`);

    // 2. Apex / Zenith (phaseProgress = 0.5)
    parallax.setPhase('DAY');
    parallax.phaseProgress = 0.5;
    pos = parallax.getCelestialPosition();
    assert.ok(Math.abs(pos.x - 180) < 1e-4, `Expected X ~ 180 at zenith, got ${pos.x}`);
    assert.ok(Math.abs(pos.y - 176) < 1e-4, `Expected Y ~ 176 at zenith, got ${pos.y}`);

    // 3. Horizon Right (phaseProgress = 1.0)
    parallax.setPhase('DAY');
    parallax.phaseProgress = 1.0;
    pos = parallax.getCelestialPosition();
    assert.ok(Math.abs(pos.x - 330) < 1e-4, `Expected X ~ 330 at horizon right, got ${pos.x}`);
    assert.ok(Math.abs(pos.y - 396) < 1e-4, `Expected Y ~ 396 at horizon right, got ${pos.y}`);

    // 4. Night celestial body type (Moon)
    parallax.setPhase('NIGHT');
    pos = parallax.getCelestialPosition();
    assert.equal(pos.type, 'moon', 'Celestial type during NIGHT phase must be moon');
  });

  test('Parallax auto-cycle continuous simulation across 500 seconds without state corruption or NaNs', () => {
    const parallax = new Parallax(360, 640, { autoCycle: true, phaseDuration: 10 });
    const dt = 0.1;

    for (let time = 0; time < 500; time += dt) {
      parallax.update(dt, 160);

      const colors = parallax.getSkyColors();
      assert.ok(!colors.top.includes('NaN'), `Sky top color contains NaN at time ${time}`);
      assert.ok(!colors.bottom.includes('NaN'), `Sky bottom color contains NaN at time ${time}`);

      const pos = parallax.getCelestialPosition();
      assert.ok(!Number.isNaN(pos.x), `Celestial x is NaN at time ${time}`);
      assert.ok(!Number.isNaN(pos.y), `Celestial y is NaN at time ${time}`);
    }
  });

  test('Parallax setPhase invalid input resilience', () => {
    const parallax = new Parallax(360, 640);
    parallax.setPhase('DAY');

    // Pass invalid phase strings
    parallax.setPhase('INVALID_PHASE');
    parallax.setPhase(null);
    parallax.setPhase(undefined);

    // State should remain unchanged at DAY
    assert.equal(parallax.getPhase(), WeatherPhase.DAY, 'Invalid setPhase input should preserve current phase');
  });
});

// ============================================================================
// Suite 4: SpriteCache Miss Churn & Reset Lifecycle
// ============================================================================
describe('Suite 4: SpriteCache Miss Churn & Reset Lifecycle', () => {
  test('SpriteCache handles 1,000 repeated cache misses (key churn) cleanly', () => {
    const spriteCache = new SpriteCache();

    // Generate 1,000 distinct pipe sprites
    for (let i = 0; i < 1000; i++) {
      const sprite = spriteCache.getPipeSprite(60 + (i % 20), 300 + (i % 100), `#color_${i}`);
      assert.ok(sprite, `Sprite ${i} creation failed`);
    }

    assert.equal(spriteCache.cache.size, 1000, 'Cache map size must equal 1000 after 1000 unique requests');
  });

  test('SpriteCache cache hits return exact cached object reference without allocation', () => {
    const spriteCache = new SpriteCache();

    const sprite1 = spriteCache.getPipeSprite(64, 400, '#73bf2e');
    assert.equal(spriteCache.cache.size, 1);

    // Perform 500 repeat requests for the exact same parameters
    for (let i = 0; i < 500; i++) {
      const spriteHit = spriteCache.getPipeSprite(64, 400, '#73bf2e');
      assert.equal(spriteHit, sprite1, 'Cache hit must return exact canvas instance reference');
    }

    assert.equal(spriteCache.cache.size, 1, 'Cache map size must remain 1 on cache hits');
  });

  test('SpriteCache clearCache resets Map and forces new instance creation on next request', () => {
    const spriteCache = new SpriteCache();

    const pipeA = spriteCache.getPipeSprite(64, 400, '#73bf2e');
    const groundA = spriteCache.getGroundSprite(360, 112);
    assert.equal(spriteCache.cache.size, 2);

    spriteCache.clearCache();
    assert.equal(spriteCache.cache.size, 0, 'Cache map size must be 0 after clearCache()');

    const pipeB = spriteCache.getPipeSprite(64, 400, '#73bf2e');
    const groundB = spriteCache.getGroundSprite(360, 112);
    assert.equal(spriteCache.cache.size, 2);

    assert.notEqual(pipeA, pipeB, 'Post-reset request must return a newly created sprite canvas');
    assert.notEqual(groundA, groundB, 'Post-reset request must return a newly created ground sprite canvas');
  });

  test('SpriteCache fallback canvas creation in Node.js test environment', () => {
    const spriteCache = new SpriteCache();
    const canvas = spriteCache.createCanvas(100, 200);

    assert.ok(canvas, 'Mock canvas must be created');
    assert.equal(canvas.width, 100);
    assert.equal(canvas.height, 200);
    assert.equal(canvas.isMock, true, 'Canvas in Node environment should have isMock property set');
    assert.ok(typeof canvas.getContext('2d') === 'object', 'Mock canvas getContext must return mock context');
  });
});

// ============================================================================
// Final Results Reporting & Exit Code
// ============================================================================
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Total Stress Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (failedTests > 0) {
  console.error('\x1b[31mFailures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.stack || error.message);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL CHALLENGER 1 STRESS TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
