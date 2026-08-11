/**
 * Standalone Unit Verification Test Suite for Flappy Bird Core Engine & Physics
 * Runner: Node.js native assert/strict module
 * Execution Command: node tests/unit/test_engine.js
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

// ==========================================
// Suite A: EventBus Pub/Sub & Error Isolation
// ==========================================
describe('A) EventBus Pub/Sub & Error Isolation', () => {
  test('EventBus should subscribe and receive emitted payload', () => {
    const bus = new EventBus();
    let received = null;
    bus.on('BIRD_FLAP', (data) => { received = data; });
    bus.emit('BIRD_FLAP', { x: 100, y: 250, vy: -400 });
    assert.deepEqual(received, { x: 100, y: 250, vy: -400 });
  });

  test('EventBus should unsubscribe listener via off() and return unbind function', () => {
    const bus = new EventBus();
    let count = 0;
    const handler = () => { count++; };
    
    const unbind = bus.on('TEST_EVENT', handler);
    bus.emit('TEST_EVENT');
    assert.equal(count, 1);

    unbind();
    bus.emit('TEST_EVENT');
    assert.equal(count, 1);

    bus.on('TEST_EVENT', handler);
    bus.off('TEST_EVENT', handler);
    bus.emit('TEST_EVENT');
    assert.equal(count, 1);
  });

  test('EventBus clear() should remove all registered listeners', () => {
    const bus = new EventBus();
    let count = 0;
    bus.on('EVT1', () => count++);
    bus.on('EVT2', () => count++);
    bus.clear();
    bus.emit('EVT1');
    bus.emit('EVT2');
    assert.equal(count, 0);
  });

  test('EventBus should protect subscriber iterations against exceptions during emit', () => {
    const bus = new EventBus();
    let secondCalled = false;

    bus.on('FAIL_EVENT', () => {
      throw new Error('Simulated subscriber crash');
    });

    bus.on('FAIL_EVENT', () => {
      secondCalled = true;
    });

    // Emitting should catch subscriber exception and execute remaining subscribers
    assert.doesNotThrow(() => {
      bus.emit('FAIL_EVENT', { test: true });
    });
    assert.equal(secondCalled, true);
  });
});

// ==========================================
// Suite B: Bird Physics Engine
// ==========================================
describe('B) Bird Physics Engine', () => {
  test('Bird initial position (100, 250) and bounding radius 13', () => {
    const bird = new Bird();
    assert.equal(bird.x, 100);
    assert.equal(bird.y, 250);
    assert.equal(bird.radius, 13);
    assert.deepEqual(bird.getBoundingCircle(), { x: 100, y: 250, radius: 13 });
  });

  test('Bird gravity integration (+1350 px/s²)', () => {
    const bird = new Bird(null, { x: 100, y: 250 });
    const dt = 1 / 60; // 0.01666667s
    bird.update(dt);
    // vy = 0 + 1350 * (1/60) = 22.5 px/s
    // y = 250 + 22.5 * (1/60) = 250.375 px
    assert.equal(bird.vy, 22.5);
    assert.equal(bird.y, 250.375);
  });

  test('Bird flap impulse replaces vy instantly with -400 px/s and sets instant -20° tilt', () => {
    const bus = new EventBus();
    let flapEventPayload = null;
    bus.on('BIRD_FLAP', (data) => { flapEventPayload = data; });

    const bird = new Bird(bus, { x: 100, y: 250 });
    bird.vy = 300;
    bird.flap();

    assert.equal(bird.vy, -400);
    const expectedRot = -20 * (Math.PI / 180); // -0.34906585 rad
    assert.ok(Math.abs(bird.rotation - expectedRot) < 1e-5);
    assert.deepEqual(flapEventPayload, { x: 100, y: 250, vy: -400 });
  });

  test('Bird terminal velocity clamping at +650 px/s', () => {
    const bird = new Bird(null, { x: 100, y: 250 });
    bird.vy = 640;
    bird.update(0.1); // vy would be 640 + 135 = 775 without clamping
    assert.equal(bird.vy, 650);
  });

  test('Bird rotational tilt interpolation toward +90° as falling speed increases past 150 px/s', () => {
    const bird = new Bird(null, { x: 100, y: 250 });
    bird.flap(); // rotation set to -20° (-0.349 rad)
    assert.ok(bird.rotation < 0);

    // Set falling speed to 650 px/s (terminal velocity)
    bird.vy = 650;
    // Perform multiple physics updates to allow lerp to smooth toward +90° (+1.571 rad)
    for (let i = 0; i < 30; i++) {
      bird.update(1 / 60);
    }
    const maxRot = 90 * (Math.PI / 180); // ~ 1.570796 rad
    assert.ok(bird.rotation > 1.0, `Rotation should tilt down, got ${bird.rotation}`);
    assert.ok(bird.rotation <= maxRot + 1e-5, `Rotation should not exceed +90°, got ${bird.rotation}`);
  });
});

// ==========================================
// Suite C: PipeManager Spawning & Motion
// ==========================================
describe('C) PipeManager Spawning & Motion', () => {
  test('PipeManager scroll speed 160 px/s leftward movement', () => {
    const bus = new EventBus();
    const pm = new PipeManager(bus, { scrollSpeed: 160 });
    const pipe = pm.spawnPipePair(360, 150);
    assert.equal(pipe.x, 360);

    pm.update(0.5); // 0.5s * 160 px/s = 80 px scroll
    assert.equal(pipe.x, 280);
  });

  test('PipeManager spawning interval every 200px scroll displacement', () => {
    const bus = new EventBus();
    let spawnCount = 0;
    bus.on('PIPE_SPAWN', () => spawnCount++);

    const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
    assert.equal(pm.pipes.length, 0);

    // Scroll 1.25s -> 1.25 * 160 = 200 px displacement
    pm.update(1.25);
    assert.equal(pm.pipes.length, 1);
    assert.equal(spawnCount, 1);
  });

  test('Pipe gap height 135px and random gap top range [45, 348]', () => {
    const pm = new PipeManager(null, { gapHeight: 135, margin: 45, playHeight: 528 });
    for (let i = 0; i < 50; i++) {
      const gapTop = pm.generateGapPosition();
      assert.ok(gapTop >= 45 && gapTop <= 348, `Gap top ${gapTop} outside bounds [45, 348]`);
      const pipe = pm.spawnPipePair(360, gapTop);
      assert.equal(pipe.bottomY - pipe.topHeight, 135);
      assert.equal(pipe.bottomY, gapTop + 135);
      assert.equal(pipe.bottomHeight, 528 - (gapTop + 135));
    }
  });

  test('Score clearance tracking emits PIPE_PASS once when bird passes right edge of pipe', () => {
    const bus = new EventBus();
    let passCount = 0;
    bus.on('PIPE_PASS', () => passCount++);

    const pm = new PipeManager(bus, { pipeWidth: 64 });
    const pipe = pm.spawnPipePair(100, 150); // right edge = 100 + 64 = 164

    const bird = { x: 100, radius: 13 };
    pm.checkScoring(bird);
    assert.equal(passCount, 0); // 100 <= 164

    // Move pipe left so right edge < bird.x (x = 30 -> right edge = 94 < 100)
    pipe.x = 30;
    pm.checkScoring(bird);
    assert.equal(passCount, 1);
    assert.equal(pipe.scored, true);

    // Subsequent updates should not re-trigger scoring
    pm.checkScoring(bird);
    assert.equal(passCount, 1);
  });

  test('PipeManager consecutive pipe pair spawn spacing is strictly 200px', () => {
    const bus = new EventBus();
    const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
    // Update for 1.25s -> 200px scroll -> 1st pipe spawns at x = 360
    pm.update(1.25);
    assert.equal(pm.pipes.length, 1);
    assert.equal(pm.pipes[0].x, 360);

    // Update for another 1.25s -> total 400px scroll -> 2nd pipe spawns at x = 360, 1st pipe at x = 160
    pm.update(1.25);
    assert.equal(pm.pipes.length, 2);
    assert.equal(pm.pipes[0].x, 160);
    assert.equal(pm.pipes[1].x, 360);

    const horizontalSpacing = pm.pipes[1].x - pm.pipes[0].x;
    assert.equal(horizontalSpacing, 200);
  });

  test('PIPE_PASS event payload contains both score and pipeId', () => {
    const bus = new EventBus();
    let lastPayload = null;
    bus.on('PIPE_PASS', (payload) => {
      lastPayload = payload;
    });

    const pm = new PipeManager(bus, { pipeWidth: 64 });
    const pipe = pm.spawnPipePair(100, 150);

    // Bird passes pipe
    pipe.x = 30; // 30 + 64 = 94 < 100
    pm.checkScoring({ x: 100 });

    assert.ok(lastPayload !== null, 'PIPE_PASS should have been emitted');
    assert.equal(typeof lastPayload.score, 'number', 'Payload score must be a number');
    assert.equal(typeof lastPayload.pipeId, 'number', 'Payload pipeId must be a number');
    assert.equal(lastPayload.score, 1);
    assert.equal(lastPayload.pipeId, pipe.id);
  });

  test('PipeManager multi-pipe long-run stress test (100 pipe pair spawns over 7,500 frames at 60Hz)', () => {
    const bus = new EventBus();
    const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
    const dt = 1 / 60; // 60Hz fixed step

    let spawnCount = 0;
    let prevSpawnDist = null;

    bus.on('PIPE_SPAWN', () => {
      spawnCount++;
      if (prevSpawnDist !== null) {
        const delta = pm.distanceScrolled - prevSpawnDist;
        assert.ok(
          Math.abs(delta - 200) <= 0.01,
          `Spawn displacement delta ${delta} deviates from 200px (tolerance ±0.01px)`
        );
      }
      prevSpawnDist = pm.distanceScrolled;
    });

    // Run 100 pipe cycles: 100 * 75 frames = 7,500 frames at 60Hz
    for (let step = 0; step < 7500; step++) {
      pm.update(dt);
      const pipes = pm.getPipes();
      for (let i = 0; i < pipes.length - 1; i++) {
        const spacing = pipes[i + 1].x - pipes[i].x;
        assert.ok(
          Math.abs(spacing - 200) <= 0.01,
          `Onscreen pipe spacing ${spacing} != 200px (tolerance ±0.01px)`
        );
      }
    }

    assert.equal(spawnCount, 100, `Expected 100 pipe pair spawns, got ${spawnCount}`);
  });
});

// ==========================================
// Suite D: CollisionSystem Circle vs AABB & Bounds
// ==========================================
describe('D) CollisionSystem Circle vs AABB & Bounds', () => {
  test('Circle vs AABB: direct hit, near miss, and clear passage', () => {
    const circle = { x: 100, y: 200, radius: 13 };

    // Box right in front of circle -> Hit
    const hitBox = { x: 90, y: 190, width: 64, height: 100 };
    assert.equal(CollisionSystem.checkCircleAABB(circle, hitBox), true);

    // Box far away -> Clear
    const farBox = { x: 300, y: 190, width: 64, height: 100 };
    assert.equal(CollisionSystem.checkCircleAABB(circle, farBox), false);
  });

  test('Circle vs AABB: corner vertex distance threshold (avoids false AABB corner hits)', () => {
    // Pipe top corner at (80, 150). Bird center at (70, 160), radius = 13.
    // Distance from center (70, 160) to corner (80, 150): dx = -10, dy = 10 -> d² = 100 + 100 = 200.
    // Radius² = 13² = 169. Since 200 > 169, circle math is NO collision!
    const circle = { x: 70, y: 160, radius: 13 };
    const pipeBox = { rx: 80, ry: 0, rw: 64, rh: 150 };
    assert.equal(CollisionSystem.checkCircleAABB(circle, pipeBox), false);

    // Move bird closer: center at (72, 158) -> dx = -8, dy = 8 -> d² = 64 + 64 = 128 < 169 -> Collision!
    const closeCircle = { x: 72, y: 158, radius: 13 };
    assert.equal(CollisionSystem.checkCircleAABB(closeCircle, pipeBox), true);
  });

  test('Ceiling boundary clamping: clamps y = 13 and zeroes upward velocity', () => {
    const bird = { y: 5, vy: -300, radius: 13 };
    const clamped = CollisionSystem.applyCeilingBoundary(bird);
    assert.equal(clamped, true);
    assert.equal(bird.y, 13);
    assert.equal(bird.vy, 0);
  });

  test('Ground collision detection at y + radius >= 528 and clamps position', () => {
    const birdSafe = { y: 514, radius: 13 }; // 514 + 13 = 527 < 528
    assert.equal(CollisionSystem.checkGroundCollision(birdSafe, 528), false);
    assert.equal(birdSafe.y, 514);

    const birdHit = { y: 525, radius: 13, vy: 200 }; // 525 + 13 = 538 >= 528
    assert.equal(CollisionSystem.checkGroundCollision(birdHit, 528), true);
    assert.equal(birdHit.y, 515); // Clamped to 528 - 13 = 515
    assert.equal(birdHit.vy, 0);
  });
});

// ==========================================
// Suite E: Fixed Timestep Determinism & Integrated Loop
// ==========================================
describe('E) Fixed Timestep Determinism & Integrated Loop', () => {
  test('Identical trajectory across 60Hz and 120Hz frame step updates', () => {
    const engine60 = new GameEngine();
    const engine120 = new GameEngine();

    engine60.triggerFlap();  // Start playing & flap
    engine120.triggerFlap();

    // Engine 60Hz: simulate 1.0s using 60 frames of 1/60s
    for (let i = 0; i < 60; i++) {
      engine60.step(1 / 60);
    }

    // Engine 120Hz: simulate 1.0s using 120 frames of 1/120s
    for (let i = 0; i < 120; i++) {
      engine120.step(1 / 120);
    }

    assert.equal(engine60.bird.y.toFixed(5), engine120.bird.y.toFixed(5));
    assert.equal(engine60.bird.vy.toFixed(5), engine120.bird.vy.toFixed(5));
    assert.equal(engine60.bird.rotation.toFixed(5), engine120.bird.rotation.toFixed(5));
  });

  test('GameEngine state machine lifecycle (START -> PLAYING -> PAUSED -> GAME_OVER -> START)', () => {
    const bus = new EventBus();
    const stateHistory = [];
    bus.on('ENGINE_STATE_CHANGE', (e) => stateHistory.push(e.newState));

    const engine = new GameEngine({ eventBus: bus });
    assert.equal(engine.state, EngineState.START);

    // Flap transitions START -> PLAYING
    engine.triggerFlap();
    assert.equal(engine.state, EngineState.PLAYING);

    // Pause transitions PLAYING -> PAUSED
    engine.triggerPause();
    assert.equal(engine.state, EngineState.PAUSED);

    // Pause toggle transitions PAUSED -> PLAYING
    engine.triggerPause();
    assert.equal(engine.state, EngineState.PLAYING);

    // Force ground collision to trigger GAME_OVER
    engine.bird.y = 520;
    engine.bird.vy = 0;
    engine.step(1 / 60);
    assert.equal(engine.state, EngineState.GAME_OVER);

    // Flap in GAME_OVER resets to START
    engine.triggerFlap();
    assert.equal(engine.state, EngineState.START);
    assert.equal(engine.score, 0);

    assert.deepEqual(stateHistory, [EngineState.PLAYING, EngineState.PAUSED, EngineState.PLAYING, EngineState.GAME_OVER, EngineState.START]);
  });

  test('GAME_OVER event isHighScore boolean contract and initialHighScore tracking', () => {
    const bus = new EventBus();
    let gameOverPayload = null;
    bus.on('GAME_OVER', (payload) => {
      gameOverPayload = payload;
    });

    const engine = new GameEngine({ eventBus: bus });

    // Round 1: High score is 0. Player scores 1 point and dies -> isHighScore = true
    engine.triggerFlap(); // Start playing
    assert.equal(engine.initialHighScore, 0);

    bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
    assert.equal(engine.score, 1);
    assert.equal(engine.highScore, 1);

    // Trigger game over
    engine.bird.y = 520;
    engine.bird.vy = 0;
    engine.step(1 / 60);

    assert.equal(engine.state, EngineState.GAME_OVER);
    assert.equal(gameOverPayload.isHighScore, true);
    assert.equal(gameOverPayload.score, 1);

    // Round 2: Pre-game high score is 1. Player scores 1 point (equal) and dies -> isHighScore = false
    engine.triggerFlap(); // Reset to START
    assert.equal(engine.highScore, 1);
    engine.triggerFlap(); // Start PLAYING
    assert.equal(engine.initialHighScore, 1);

    bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
    engine.bird.y = 520;
    engine.bird.vy = 0;
    engine.step(1 / 60);

    assert.equal(engine.state, EngineState.GAME_OVER);
    assert.equal(gameOverPayload.isHighScore, false);

    // Round 3: Pre-game high score is 1. Player scores 2 points (beaten) and dies -> isHighScore = true
    engine.triggerFlap(); // START
    engine.triggerFlap(); // PLAYING
    assert.equal(engine.initialHighScore, 1);

    bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
    bus.emit('PIPE_PASS', { score: 2, pipeId: 2 });
    engine.bird.y = 520;
    engine.bird.vy = 0;
    engine.step(1 / 60);

    assert.equal(engine.state, EngineState.GAME_OVER);
    assert.equal(gameOverPayload.isHighScore, true);
    assert.equal(engine.highScore, 2);
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
  console.log('\x1b[32m✔ ALL ENGINE UNIT TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
