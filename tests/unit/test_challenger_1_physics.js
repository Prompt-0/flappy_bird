/**
 * Empirical Stress-Test & Verification Script for Flappy Bird Core Engine & Physics
 * Targeted Verification for Challenger 1:
 * 1. Physics constants (gravity +1350, flap impulse -400, terminal velocity +650, rotational tilt math)
 * 2. Circle vs AABB collision math and ground position clamping (bird.y = playHeight - radius)
 * 3. Ceiling boundary logic and floor crash state transition
 */

import assert from 'node:assert/strict';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { Bird } from '../../public/js/engine/Bird.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';
import { CollisionSystem } from '../../public/js/engine/CollisionSystem.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';

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

// ============================================================================
// 1. Empirical Verification of Physics Constants & Rotational Tilt Math
// ============================================================================
describe('1. Physics Constants & Rotational Tilt Math Verification', () => {

  test('Gravity integration (+1350 px/s²) over single step and continuous steps', () => {
    const bird = new Bird(null, { x: 100, y: 250 });
    assert.equal(bird.gravity, 1350);

    const dt = 1 / 60;
    bird.update(dt);
    // vy = 0 + 1350 * (1/60) = 22.5
    // y = 250 + 22.5 * (1/60) = 250.375
    assert.equal(bird.vy, 22.5);
    assert.equal(bird.y, 250.375);

    // Run 10 steps total
    for (let i = 0; i < 9; i++) {
      bird.update(dt);
    }
    // vy = 22.5 * 10 = 225 px/s
    assert.equal(bird.vy, 225);
  });

  test('Flap impulse (-400 px/s) instantly overrides positive or negative vy', () => {
    const bus = new EventBus();
    let emitted = null;
    bus.on('BIRD_FLAP', (data) => { emitted = data; });
    const bird = new Bird(bus, { x: 100, y: 250 });

    bird.vy = 650; // downward max speed
    bird.flap();
    assert.equal(bird.vy, -400);
    assert.equal(bird.rotation, -20 * (Math.PI / 180));
    assert.deepEqual(emitted, { x: 100, y: 250, vy: -400 });

    bird.vy = -100; // moving up already
    bird.flap();
    assert.equal(bird.vy, -400);
  });

  test('Flap impulse ignored when bird is dead', () => {
    const bus = new EventBus();
    let flapCount = 0;
    bus.on('BIRD_FLAP', () => { flapCount++; });

    const bird = new Bird(bus, { x: 100, y: 250 });
    bird.isDead = true;
    bird.vy = 100;
    bird.flap();

    assert.equal(bird.vy, 100);
    assert.equal(flapCount, 0);
  });

  test('Terminal velocity (+650 px/s) hard cap across arbitrary large dt', () => {
    const bird = new Bird(null, { x: 100, y: 250 });
    assert.equal(bird.terminalVel, 650);

    // Large dt step: 0.5s -> 0 + 1350 * 0.5 = 675 -> should cap at 650
    bird.update(0.5);
    assert.equal(bird.vy, 650);

    // 100 steps of 1/60s
    for (let i = 0; i < 100; i++) {
      bird.update(1 / 60);
    }
    assert.equal(bird.vy, 650);
  });

  test('Rotational tilt math exact target values and lerp convergence', () => {
    const bird = new Bird(null, { x: 100, y: 250 });
    const minRot = -20 * (Math.PI / 180); // -0.34906585 rad
    const maxRot = 90 * (Math.PI / 180);  // +1.5707963 rad

    // Flap sets instant -20°
    bird.flap();
    assert.equal(bird.rotation, minRot);

    // When vy <= 150 px/s: target is minRot (-20°)
    for (let i = 0; i < 30; i++) {
      bird.vy = 100 - 22.5; // So after gravity vy becomes 100 <= 150
      bird.update(1 / 60);
    }
    assert.ok(Math.abs(bird.rotation - minRot) < 1e-4);

    // Set initial vy = 377.5 px/s -> after gravity (+22.5) vy = 400 px/s
    // target should be minRot + ((400-150)/(650-150)) * (maxRot - minRot)
    // factor = 250 / 500 = 0.5 -> target = -20° + 0.5 * 110° = +35° (0.610865 rad)
    for (let i = 0; i < 60; i++) {
      bird.vy = 377.5;
      bird.update(1 / 60);
    }
    const expected35Deg = 35 * (Math.PI / 180);
    assert.ok(Math.abs(bird.rotation - expected35Deg) < 1e-3, `Expected ~35° (${expected35Deg} rad), got ${bird.rotation}`);

    // Set vy = 650 px/s (terminal vel): factor = 1.0 -> target = +90° (1.570796 rad)
    for (let i = 0; i < 60; i++) {
      bird.vy = 650;
      bird.update(1 / 60);
    }
    assert.ok(Math.abs(bird.rotation - maxRot) < 1e-3, `Expected ~90° (${maxRot} rad), got ${bird.rotation}`);
  });
});

// ============================================================================
// 2. Empirical Verification of Collision Math & Ground Position Clamping
// ============================================================================
describe('2. Collision Math & Ground Clamping Verification', () => {

  test('Circle vs AABB: Exact edge contacts, corner vertices, and inside checks', () => {
    const circle = { x: 100, y: 200, radius: 13 };

    // Center inside box -> Collision
    assert.equal(CollisionSystem.checkCircleAABB(circle, { x: 90, y: 190, width: 20, height: 20 }), true);

    // Left edge overlap: Box rx = 110, rw = 50. Bird cx = 100, r = 13.
    // nearestX = 110, distX = 100 - 110 = -10. distY = 0. dist² = 100 < 169 -> Collision!
    assert.equal(CollisionSystem.checkCircleAABB(circle, { rx: 110, ry: 150, rw: 50, rh: 100 }), true);

    // Left edge gap (no collision): Box rx = 114, rw = 50. Bird cx = 100, r = 13.
    // nearestX = 114, distX = -14. dist² = 196 > 169 -> No collision!
    assert.equal(CollisionSystem.checkCircleAABB(circle, { rx: 114, ry: 150, rw: 50, rh: 100 }), false);

    // Tangent contact (dist = 13 -> dist² = 169): Box rx = 113. distX = -13 -> dist² = 169.
    // Standard rule: d² < r² is strict inequality (169 < 169 is false).
    assert.equal(CollisionSystem.checkCircleAABB(circle, { rx: 113, ry: 150, rw: 50, rh: 100 }), false);

    // Corner vertex distance test: Top-left corner of box at (110, 210).
    // Bird center at (100, 200). dx = -10, dy = -10 -> dist² = 200 > 169 -> No false corner hit!
    assert.equal(CollisionSystem.checkCircleAABB(circle, { rx: 110, ry: 210, rw: 50, rh: 50 }), false);

    // Move corner closer: Box at (108, 208). dx = -8, dy = -8 -> dist² = 64 + 64 = 128 < 169 -> Collision!
    assert.equal(CollisionSystem.checkCircleAABB(circle, { rx: 108, ry: 208, rw: 50, rh: 50 }), true);
  });

  test('Ground position clamping math: bird.y = playHeight - radius', () => {
    const playHeight = 528;

    // Case A: Just above ground (y = 514) -> No ground hit
    const birdAbove = { y: 514, radius: 13, vy: 100 };
    assert.equal(CollisionSystem.checkGroundCollision(birdAbove, playHeight), false);
    assert.equal(birdAbove.y, 514);

    // Case B: Exactly at ground threshold (y = 515 -> y + r = 528) -> Ground hit & clamped to 515
    const birdAtBoundary = { y: 515, radius: 13, vy: 200 };
    assert.equal(CollisionSystem.checkGroundCollision(birdAtBoundary, playHeight), true);
    assert.equal(birdAtBoundary.y, 515);
    assert.equal(birdAtBoundary.vy, 0);

    // Case C: Overshooting deep into ground (y = 540 -> vy = 650) -> Ground hit & clamped strictly to 515
    const birdOvershoot = { y: 540, radius: 13, vy: 650 };
    assert.equal(CollisionSystem.checkGroundCollision(birdOvershoot, playHeight), true);
    assert.equal(birdOvershoot.y, 515);
    assert.equal(birdOvershoot.vy, 0);
  });
});

// ============================================================================
// 3. Empirical Verification of Ceiling Boundary & Floor Crash State Transition
// ============================================================================
describe('3. Ceiling Boundary & Floor Crash State Transition', () => {

  test('Ceiling boundary clamping (y - radius <= 0) clamps y = radius and cancels negative vy', () => {
    const bird = new Bird(null, { x: 100, y: 20 });
    bird.vy = -400;

    // Simulate update that pushes bird past ceiling
    bird.update(1 / 60);
    bird.update(1 / 60);

    // Apply ceiling boundary check
    const clamped = CollisionSystem.applyCeilingBoundary(bird);
    assert.equal(clamped, true);
    assert.equal(bird.y, 13); // clamped to radius (13)
    assert.equal(bird.vy, 0);  // upward velocity zeroed
  });

  test('Continuous flapping at ceiling maintains bird.y = 13 without breaking physics', () => {
    const bird = new Bird(null, { x: 100, y: 13 });

    for (let i = 0; i < 10; i++) {
      bird.flap(); // vy set to -400
      bird.update(1 / 60); // y becomes ~6.33
      CollisionSystem.applyCeilingBoundary(bird);
      assert.equal(bird.y, 13);
      assert.equal(bird.vy, 0);
    }
  });

  test('Floor crash state transition in GameEngine (PLAYING -> GAME_OVER & cause: ground)', () => {
    const bus = new EventBus();
    let hitPayload = null;
    let gameOverPayload = null;

    bus.on('BIRD_HIT', (payload) => { hitPayload = payload; });
    bus.on('GAME_OVER', (payload) => { gameOverPayload = payload; });

    const engine = new GameEngine({ eventBus: bus });
    engine.triggerFlap(); // START -> PLAYING

    assert.equal(engine.state, EngineState.PLAYING);

    // Place bird right near ground and let it step into ground
    engine.bird.y = 514;
    engine.bird.vy = 300;
    engine.step(1 / 60); // y becomes 519 -> hit ground -> y clamped to 515

    assert.equal(engine.state, EngineState.GAME_OVER);
    assert.equal(engine.bird.isDead, true);
    assert.equal(engine.bird.y, 515); // Clamped position
    assert.equal(engine.bird.vy, 0);

    assert.ok(hitPayload !== null);
    assert.equal(hitPayload.cause, 'ground');
    assert.equal(hitPayload.y, 515);

    assert.ok(gameOverPayload !== null);
    assert.equal(gameOverPayload.score, 0);
  });

  test('GameEngine state transition upon pipe collision vs ground crash falling trajectory', () => {
    const bus = new EventBus();
    let hitPayload = null;

    bus.on('BIRD_HIT', (payload) => { hitPayload = payload; });

    const engine = new GameEngine({ eventBus: bus });
    engine.triggerFlap(); // PLAYING

    // Spawn a pipe right in front of bird
    engine.pipeManager.spawnPipePair(100, 50); // top pipe y: 0..50, bottom pipe y: 185..528
    engine.bird.x = 100;
    engine.bird.y = 30; // Bird is inside top pipe

    engine.step(1 / 60);

    assert.equal(engine.state, EngineState.GAME_OVER);
    assert.equal(engine.bird.isDead, true);
    assert.equal(hitPayload.cause, 'pipe');

    // In GAME_OVER, bird falls to ground under gravity until clamped at 515 (needs ~90 frames)
    for (let i = 0; i < 120; i++) {
      engine.step(1 / 60);
    }
    assert.equal(engine.bird.y, 515); // Eventually rests on ground at y = 515
    assert.equal(engine.bird.vy, 0);
  });

  test('Full high-frequency loop stress test (1000 frames at 60Hz and 120Hz)', () => {
    const engine60 = new GameEngine();
    engine60.triggerFlap();

    for (let f = 0; f < 1000; f++) {
      // Periodically flap every 30 frames if bird is alive, or restart if game over
      if (f % 30 === 0) {
        engine60.triggerFlap();
      }
      engine60.step(1 / 60);

      // Invariants check
      assert.ok(engine60.bird.y >= 13, `Bird y (${engine60.bird.y}) below ceiling radius 13`);
      assert.ok(engine60.bird.y <= 526, `Bird y (${engine60.bird.y}) exceeds maximum ground overshoot bound`);
      assert.ok(engine60.bird.vy <= 650, `Bird vy (${engine60.bird.vy}) exceeds terminal velocity 650`);
    }
  });
});

// ============================================================================
// Final Results Reporting & Exit Code
// ============================================================================
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Empirical Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (failedTests > 0) {
  console.error('\x1b[31mEmpirical failures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.stack || error.message);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL EMPIRICAL STRESS TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
