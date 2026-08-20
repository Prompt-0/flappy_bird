/**
 * Standalone Unit Verification Test Suite for Flappy Bird Milestone 2 Visual Effects & Polish
 * Runner: Node.js native assert/strict module
 * Execution Command: node tests/unit/test_visuals.js
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

// Mock Canvas Context helper for Node test execution
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

// ==========================================
// Suite A: Parallax Scroll Math & Speed Ratios
// ==========================================
describe('A) Parallax Scroll Math & Speed Ratios', () => {
  test('Parallax initial layer speed ratios (0.0x, 0.15x, 0.40x, 0.75x, 1.0x)', () => {
    const parallax = new Parallax(360, 640);
    const layers = parallax.layers;

    assert.equal(layers.length, 5, 'Must have exactly 5 parallax layers');
    assert.equal(layers[0].ratio, 0.0, 'Layer 0 Sky speed ratio must be 0.0');
    assert.equal(layers[1].ratio, 0.15, 'Layer 1 Mountains speed ratio must be 0.15');
    assert.equal(layers[2].ratio, 0.40, 'Layer 2 Hills speed ratio must be 0.40');
    assert.equal(layers[3].ratio, 0.75, 'Layer 3 Bushes speed ratio must be 0.75');
    assert.equal(layers[4].ratio, 1.0, 'Layer 4 Ground speed ratio must be 1.0');
  });

  test('Parallax scroll displacement update math: layerOffset = (speed * ratio * dt)', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    const scrollSpeed = 160;
    const dt = 0.5; // 0.5s update -> displacement factor = 80px

    parallax.update(dt, scrollSpeed);
    const offsets = parallax.getLayerOffsets();

    // Expected offsets:
    // Sky: 0 * 0.5 = 0
    // Mountains: 160 * 0.15 * 0.5 = 12
    // Hills: 160 * 0.40 * 0.5 = 32
    // Bushes: 160 * 0.75 * 0.5 = 60
    // Ground: 160 * 1.0 * 0.5 = 80
    assert.equal(offsets[0], 0, 'Sky offset must be 0');
    assert.equal(offsets[1], 12, 'Mountains offset must be 12');
    assert.equal(offsets[2], 32, 'Hills offset must be 32');
    assert.equal(offsets[3], 60, 'Bushes offset must be 60');
    assert.equal(offsets[4], 80, 'Ground offset must be 80');

    // Key named property access check
    assert.equal(offsets.sky, 0);
    assert.equal(offsets.mountains, 12);
    assert.equal(offsets.hills, 32);
    assert.equal(offsets.bushes, 60);
    assert.equal(offsets.ground, 80);
  });

  test('Parallax modulo wrapping calculation: wraps seamlessly at layer width boundary (360px)', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    const scrollSpeed = 160;

    // Update for 2.5 seconds: Ground displacement = 160 * 1.0 * 2.5 = 400px.
    // 400 % 360 = 40px
    parallax.update(2.5, scrollSpeed);
    const offsets = parallax.getLayerOffsets();

    assert.equal(offsets[4], 40, 'Ground offset 400px must wrap to 40px modulo 360');
    assert.ok(offsets[4] >= 0 && offsets[4] < 360, 'Offset must stay strictly within [0, 360)');

    // Mountains: 160 * 0.15 * 2.5 = 60px % 360 = 60px
    assert.equal(offsets[1], 60);
  });

  test('Parallax long-distance multi-frame scroll determinism (1,000 steps without NaN or gaps)', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });
    const scrollSpeed = 200;
    const dt = 1 / 60;

    for (let step = 0; step < 1000; step++) {
      parallax.update(dt, scrollSpeed);
      const offsets = parallax.getLayerOffsets();
      for (let i = 0; i < 5; i++) {
        assert.ok(!Number.isNaN(offsets[i]), `Offset layer ${i} should not be NaN`);
        assert.ok(offsets[i] >= 0 && offsets[i] < 360, `Offset layer ${i} (${offsets[i]}) out of bounds [0, 360)`);
      }
    }
  });
});

// ==========================================
// Suite B: ParticleEngine Object Pool Recycling & Zero-Allocations
// ==========================================
describe('B) ParticleEngine Object Pool Recycling & Zero-Allocations', () => {
  test('ParticleEngine capacity is exactly 200 pre-allocated objects in constructor', () => {
    const engine = new ParticleEngine(200);
    assert.equal(engine.getPoolCapacity(), 200, 'Pool capacity must be 200');
    assert.equal(engine.pool.length, 200, 'Pool array length must be exactly 200');
    assert.equal(engine.getActiveCount(), 0, 'Initial active count must be 0');
  });

  test('ParticleEngine emitFlapTrail increases active count without creating new pool objects', () => {
    const engine = new ParticleEngine(200);
    const initialPoolRef = engine.pool;
    const initialParticle0Ref = engine.pool[0];

    engine.emitFlapTrail(100, 250);

    assert.equal(engine.pool, initialPoolRef, 'Pool array reference must remain identical');
    assert.equal(engine.pool.length, 200, 'Pool array length must remain exactly 200');
    assert.equal(engine.pool[0], initialParticle0Ref, 'Particle instances in pool must remain identical');
    assert.ok(engine.getActiveCount() > 0, 'Active count must increase after emission');
  });

  test('ParticleEngine particle lifecycle: active count decrements when particle life <= 0', () => {
    const engine = new ParticleEngine(200);
    engine.emitFlapTrail(100, 250);
    const countAfterEmit = engine.getActiveCount();
    assert.ok(countAfterEmit > 0);

    // Update with large dt (1.0s) so all particles exceed maxLife and deactivate
    engine.update(1.0);
    assert.equal(engine.getActiveCount(), 0, 'Active count must return to 0 when life <= 0');
  });

  test('ParticleEngine pool saturation & recycling when capacity (200 active) is reached', () => {
    const engine = new ParticleEngine(200);

    // Emit 10 bursts of collision particles (25 particles each -> total 250 emissions)
    for (let i = 0; i < 10; i++) {
      engine.emitCollisionBurst(100, 250);
    }

    assert.equal(engine.pool.length, 200, 'Pool array length must NOT exceed 200');
    assert.equal(engine.getActiveCount(), 200, 'Active count must be capped at capacity 200');

    // Emit another preset while fully saturated
    engine.emitScoreSparkles(100, 250);

    assert.equal(engine.pool.length, 200, 'Pool array length must strictly remain 200 after recycling');
    assert.equal(engine.getActiveCount(), 200, 'Active count must remain 200');
  });

  test('ParticleEngine reset() sets active = false for all 200 particles', () => {
    const engine = new ParticleEngine(200);
    engine.emitCollisionBurst(100, 250);
    assert.ok(engine.getActiveCount() > 0);

    engine.reset();
    assert.equal(engine.getActiveCount(), 0, 'Active count must be 0 after reset()');

    for (let i = 0; i < 200; i++) {
      assert.equal(engine.pool[i].active, false);
    }
  });

  test('ParticleEngine render executes without errors on active particles', () => {
    const engine = new ParticleEngine(200);
    engine.emitCollisionBurst(100, 250);
    engine.emitFlapTrail(100, 250);
    engine.emitScoreSparkles(100, 250);

    const mockCtx = createMockContext();
    assert.doesNotThrow(() => {
      engine.render(mockCtx);
    });
  });
});

// ==========================================
// Suite C: Day/Night Weather Cycle & Celestial Arc
// ==========================================
describe('C) Day/Night Weather Cycle & Celestial Arc', () => {
  test('Parallax initial weather phase is DAY and getPhase() returns DAY', () => {
    const parallax = new Parallax(360, 640);
    assert.equal(parallax.getPhase(), WeatherPhase.DAY);
  });

  test('Parallax setPhase transitions cleanly between DAY, SUNSET, NIGHT, DAWN', () => {
    const parallax = new Parallax(360, 640);

    parallax.setPhase('SUNSET');
    assert.equal(parallax.getPhase(), WeatherPhase.SUNSET);

    parallax.setPhase('NIGHT');
    assert.equal(parallax.getPhase(), WeatherPhase.NIGHT);

    parallax.setPhase('DAWN');
    assert.equal(parallax.getPhase(), WeatherPhase.DAWN);

    parallax.setPhase('DAY');
    assert.equal(parallax.getPhase(), WeatherPhase.DAY);
  });

  test('Sky gradient lerp colors return valid RGB strings for each phase', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });

    parallax.setPhase('DAY');
    const dayColors = parallax.getSkyColors();
    const dayTop = dayColors.top;
    const dayBottom = dayColors.bottom;
    assert.ok(dayTop.startsWith('rgb('), `Top sky color must be rgb string, got ${dayTop}`);
    assert.ok(dayBottom.startsWith('rgb('), `Bottom sky color must be rgb string, got ${dayBottom}`);

    parallax.setPhase('NIGHT');
    const nightColors = parallax.getSkyColors();
    const nightTop = nightColors.top;
    assert.notEqual(dayTop, nightTop, 'Night sky colors must differ from Day sky colors');
  });

  test('Celestial orbital arc math: computes smooth arc positions for Sun and Moon', () => {
    const parallax = new Parallax(360, 640, { autoCycle: false });

    // Midday (p = 0.5 -> angle = PI/2)
    parallax.phaseProgress = 0.5;
    parallax.setPhase('DAY');

    const sunPos = parallax.getCelestialPosition();
    assert.equal(sunPos.type, 'sun');
    assert.ok(Math.abs(sunPos.x - 180) < 1e-4, `Sun X at midday should be at center 180, got ${sunPos.x}`);
    assert.ok(sunPos.y < 300, `Sun Y at apex should be high in sky, got ${sunPos.y}`);

    // Midnight
    parallax.setPhase('NIGHT');
    const moonPos = parallax.getCelestialPosition();
    assert.equal(moonPos.type, 'moon');
  });

  test('Parallax render method executes cleanly with mock context across all weather phases', () => {
    const parallax = new Parallax(360, 640);
    const mockCtx = createMockContext();

    const phases = [WeatherPhase.DAY, WeatherPhase.SUNSET, WeatherPhase.NIGHT, WeatherPhase.DAWN];
    for (const phase of phases) {
      parallax.setPhase(phase);
      assert.doesNotThrow(() => {
        parallax.render(mockCtx);
      });
    }
  });
});

// ==========================================
// Suite D: SpriteCache Offscreen Canvas Pre-Rendering
// ==========================================
describe('D) SpriteCache Offscreen Canvas Pre-Rendering', () => {
  test('SpriteCache getPipeSprite pre-renders canvas and returns cached instance on repeat calls', () => {
    const cache = new SpriteCache();

    const pipe1 = cache.getPipeSprite(64, 400, '#73bf2e');
    assert.ok(pipe1, 'Pipe sprite canvas must be returned');

    const pipe2 = cache.getPipeSprite(64, 400, '#73bf2e');
    assert.equal(pipe1, pipe2, 'Subsequent call with identical parameters must return cached instance');
  });

  test('SpriteCache getGroundSprite pre-renders and caches ground sprite', () => {
    const cache = new SpriteCache();

    const ground1 = cache.getGroundSprite(360, 112);
    const ground2 = cache.getGroundSprite(360, 112);

    assert.ok(ground1, 'Ground sprite canvas must be returned');
    assert.equal(ground1, ground2, 'Ground sprite must be cached');
  });

  test('SpriteCache clearCache empties cache map and creates new instances on demand', () => {
    const cache = new SpriteCache();

    const pipe1 = cache.getPipeSprite(64, 400, '#73bf2e');
    cache.clearCache();

    const pipe2 = cache.getPipeSprite(64, 400, '#73bf2e');
    assert.notEqual(pipe1, pipe2, 'After clearCache(), a new canvas instance must be created');
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
  console.log('\x1b[32m✔ ALL VISUALS UNIT TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
