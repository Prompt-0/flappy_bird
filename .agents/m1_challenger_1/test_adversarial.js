import assert from 'node:assert/strict';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { Bird } from '../../public/js/engine/Bird.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';
import { CollisionSystem } from '../../public/js/engine/CollisionSystem.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';

console.log('=== STARTING ADVANCED ADVERSARIAL STRESS SUITE ===\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    console.log(`  ✖ FAIL: ${name}`);
    failures.push({ name, error: err.message, stack: err.stack });
  }
}

// --------------------------------------------------------------------
// 1. ADVERSARIAL TEST: Pipe Spawning Interval Specification Compliance
// --------------------------------------------------------------------
test('PipeManager distance between consecutive pipe spawns must equal spawnInterval (200px)', () => {
  const pm = new PipeManager(null, { spawnInterval: 200, scrollSpeed: 160 });
  const dt = 1 / 60;
  
  // Step until first pipe spawns
  while (pm.pipes.length === 0) {
    pm.update(dt);
  }
  const spawn1Dist = pm.distanceScrolled;
  const pipe1X = pm.pipes[0].x;

  // Step until second pipe spawns
  while (pm.pipes.length === 1) {
    pm.update(dt);
  }
  const spawn2Dist = pm.distanceScrolled;
  const pipe2X = pm.pipes[1].x;
  const pipe1XWhen2Spawned = pm.pipes[0].x;

  const scrollDiff = spawn2Dist - spawn1Dist;
  const leadingEdgeGap = pipe2X - pipe1XWhen2Spawned;

  console.log(`    [Trace] Pipe 1 at spawn: x=${pipe1X}. Pipe 2 spawned at distanceScrolled diff=${scrollDiff.toFixed(2)}px.`);
  console.log(`    [Trace] Inter-pipe leading edge gap when Pipe 2 spawned: ${leadingEdgeGap.toFixed(2)}px.`);

  // Pipe spawn displacement must be approx 200px (within one dt step tolerance, ~2.67px)
  assert.ok(
    Math.abs(scrollDiff - 200) < 5,
    `Pipe spawn displacement was ${scrollDiff.toFixed(2)}px, expected ~200px! (Bug: spawned 136px instead)`
  );
  assert.ok(
    Math.abs(leadingEdgeGap - 200) < 5,
    `Inter-pipe gap was ${leadingEdgeGap.toFixed(2)}px, expected ~200px!`
  );
});

// --------------------------------------------------------------------
// 2. ADVERSARIAL TEST: Fixed Timestep Determinism under Variable FPS & Jitter
// --------------------------------------------------------------------
test('Fixed Timestep Determinism: 60Hz vs 120Hz vs 144Hz vs Jittery frame steps', () => {
  const runSimulation = (frameDts) => {
    const engine = new GameEngine();
    engine.triggerFlap(); // START -> PLAYING
    
    // Simulate flap pattern
    let totalTime = 0;
    let dtIdx = 0;
    
    while (totalTime < 5.0) { // 5 seconds of simulation
      const dt = frameDts[dtIdx % frameDts.length];
      engine.step(dt);
      totalTime += dt;
      dtIdx++;
      
      // Periodic flaps every 0.8 seconds
      if (Math.floor(totalTime / 0.8) > Math.floor((totalTime - dt) / 0.8)) {
        if (engine.state === EngineState.PLAYING) {
          engine.triggerFlap();
        }
      }
    }
    return {
      birdY: engine.bird.y,
      birdVy: engine.bird.vy,
      score: engine.score,
      state: engine.state,
      pipesCount: engine.pipeManager.pipes.length
    };
  };

  // 60Hz fixed steps
  const res60 = runSimulation(Array(300).fill(1 / 60));
  // 120Hz fixed steps
  const res120 = runSimulation(Array(600).fill(1 / 120));
  // 144Hz fixed steps
  const res144 = runSimulation(Array(720).fill(1 / 144));
  // Jittery delta steps (lag spikes, frame drops: 0.005s, 0.033s, 0.016s, 0.050s, 0.002s)
  const jitterDts = [0.005, 0.033, 0.016, 0.050, 0.002, 0.016, 0.020, 0.012];
  const resJitter = runSimulation(jitterDts);

  console.log(`    [60Hz]   Bird Y: ${res60.birdY.toFixed(4)}, Vy: ${res60.birdVy.toFixed(4)}, State: ${res60.state}`);
  console.log(`    [120Hz]  Bird Y: ${res120.birdY.toFixed(4)}, Vy: ${res120.birdVy.toFixed(4)}, State: ${res120.state}`);
  console.log(`    [Jitter] Bird Y: ${resJitter.birdY.toFixed(4)}, Vy: ${resJitter.birdVy.toFixed(4)}, State: ${resJitter.state}`);

  assert.equal(res60.birdY.toFixed(4), res120.birdY.toFixed(4), '60Hz vs 120Hz bird Y mismatch!');
  assert.equal(res60.birdVy.toFixed(4), res120.birdVy.toFixed(4), '60Hz vs 120Hz bird Vy mismatch!');
  assert.equal(res60.birdY.toFixed(4), resJitter.birdY.toFixed(4), '60Hz vs Jitter bird Y mismatch!');
});

// --------------------------------------------------------------------
// 3. ADVERSARIAL TEST: Large Delta Time Spike (Tab backgrounding / GC freeze)
// --------------------------------------------------------------------
test('Tab backgrounding / Delta spike handling (dt = 5.0 seconds)', () => {
  const engine = new GameEngine();
  engine.triggerFlap();
  
  const yBefore = engine.bird.y;
  // Large delta spike (e.g. 5 seconds tab switch)
  engine.step(5.0);
  
  // Max delta is 0.1s. Accumulated delta 0.1s -> 6 steps of 1/60s (0.1s).
  // Check that engine did not hang in infinite loop and accumulator is bounded.
  assert.ok(engine.accumulator < 1 / 60, `Accumulator should be < 1/60 after step, got ${engine.accumulator}`);
});

// --------------------------------------------------------------------
// 4. ADVERSARIAL TEST: Collision System Circle vs AABB Corner Geometry
// --------------------------------------------------------------------
test('Circle vs AABB Corner Vertices Precision Test', () => {
  const box = { rx: 100, ry: 100, rw: 50, rh: 50 };
  const r = 13;
  const r2 = r * r; // 169

  // Top-Left corner vertex (100, 100)
  // Bird center at (100 - dx, 100 - dy)
  // Case A: dx=9, dy=9 -> d² = 81 + 81 = 162 < 169 => Collision!
  assert.equal(CollisionSystem.checkCircleAABB({ x: 91, y: 91, radius: 13 }, box), true);
  
  // Case B: dx=10, dy=10 -> d² = 100 + 100 = 200 > 169 => No Collision!
  assert.equal(CollisionSystem.checkCircleAABB({ x: 90, y: 90, radius: 13 }, box), false);

  // Top-Right corner vertex (150, 100)
  assert.equal(CollisionSystem.checkCircleAABB({ x: 159, y: 91, radius: 13 }, box), true);
  assert.equal(CollisionSystem.checkCircleAABB({ x: 160, y: 90, radius: 13 }, box), false);

  // Bottom-Right corner vertex (150, 150)
  assert.equal(CollisionSystem.checkCircleAABB({ x: 159, y: 159, radius: 13 }, box), true);
  assert.equal(CollisionSystem.checkCircleAABB({ x: 160, y: 160, radius: 13 }, box), false);

  // Bottom-Left corner vertex (100, 150)
  assert.equal(CollisionSystem.checkCircleAABB({ x: 91, y: 159, radius: 13 }, box), true);
  assert.equal(CollisionSystem.checkCircleAABB({ x: 90, y: 160, radius: 13 }, box), false);
});

// --------------------------------------------------------------------
// 5. ADVERSARIAL TEST: Pipe Gap Clearance & Precision Collision
// --------------------------------------------------------------------
test('Bird passing safely through 135px gap without collision', () => {
  const bird = new Bird(null, { x: 100, y: 200 }); // y=200, radius=13 -> bounds [187, 213]
  const pipePair = {
    x: 80,
    width: 64,
    topHeight: 150,   // Top pipe ry=[0..150]
    bottomY: 285,     // Bottom pipe ry=[285..528], gap = 135px [150..285]
    bottomHeight: 243,
    topPipe: { rx: 80, ry: 0, rw: 64, rh: 150 },
    bottomPipe: { rx: 80, ry: 285, rw: 64, rh: 243 }
  };

  // Bird top edge y=187 > top pipe ry=150. Bird bottom edge y=213 < bottom pipe ry=285.
  assert.equal(CollisionSystem.checkPipeCollision(bird, pipePair), false);

  // Move bird up so top edge touches top pipe rim (y=162 -> top edge 162-13=149 < 150)
  bird.y = 162;
  assert.equal(CollisionSystem.checkPipeCollision(bird, pipePair), true);

  // Move bird down so bottom edge touches bottom pipe rim (y=273 -> bottom edge 273+13=286 > 285)
  bird.y = 273;
  assert.equal(CollisionSystem.checkPipeCollision(bird, pipePair), true);
});

// --------------------------------------------------------------------
// 6. ADVERSARIAL TEST: Terminal Velocity Clamping
// --------------------------------------------------------------------
test('Terminal velocity strict upper bound clamping (+650 px/s)', () => {
  const bird = new Bird();
  bird.vy = 1000; // Artificially high initial velocity
  bird.update(1 / 60);
  assert.equal(bird.vy, 650, 'vy should be clamped to 650 px/s!');
});

// --------------------------------------------------------------------
// 7. ADVERSARIAL TEST: Ceiling Boundary Clamping & Bounce Behavior
// --------------------------------------------------------------------
test('Ceiling boundary clamping clamps y = 13 and zeroes upward velocity', () => {
  const bird = new Bird(null, { x: 100, y: 10 });
  bird.vy = -500; // Flying upward fast
  
  CollisionSystem.applyCeilingBoundary(bird);
  assert.equal(bird.y, 13);
  assert.equal(bird.vy, 0);

  // Verify that falling velocity at ceiling is preserved
  bird.y = 10;
  bird.vy = 200; // Falling down
  CollisionSystem.applyCeilingBoundary(bird);
  assert.equal(bird.y, 13);
  assert.equal(bird.vy, 200, 'Downward velocity should not be zeroed at ceiling!');
});

// --------------------------------------------------------------------
// 8. ADVERSARIAL TEST: Pipe Scoring Clearance Exact Edge Behavior
// --------------------------------------------------------------------
test('Pipe clearance scoring triggers EXACTLY when bird.x > pipe.x + pipeWidth', () => {
  const bus = new EventBus();
  let scoreEvents = 0;
  bus.on('PIPE_PASS', () => scoreEvents++);

  const pm = new PipeManager(bus, { pipeWidth: 64 });
  const pipe = pm.spawnPipePair(100, 150); // pipe right edge = 164

  // Bird x = 164 -> birdX > 164 is false!
  pm.checkScoring({ x: 164 });
  assert.equal(scoreEvents, 0, 'Should not score when birdX == pipe.x + width');

  // Bird x = 164.00001 -> birdX > 164 is true!
  pm.checkScoring({ x: 164.00001 });
  assert.equal(scoreEvents, 1, 'Should score when birdX > pipe.x + width');

  // Second check should not re-fire
  pm.checkScoring({ x: 170 });
  assert.equal(scoreEvents, 1, 'Should not score duplicate');
});

// --------------------------------------------------------------------
// 9. ADVERSARIAL TEST: Game Over State & Reset Consistency
// --------------------------------------------------------------------
test('State machine reset cleans up bird state, pipes, and score correctly', () => {
  const engine = new GameEngine();
  engine.triggerFlap(); // START -> PLAYING
  engine.score = 15;
  engine.bird.y = 520; // Trigger collision
  engine.step(1 / 60);

  assert.equal(engine.state, EngineState.GAME_OVER);
  assert.equal(engine.highScore, 15);

  // Trigger flap to restart -> START
  engine.triggerFlap();
  assert.equal(engine.state, EngineState.START);
  assert.equal(engine.score, 0);
  assert.equal(engine.bird.x, 100);
  assert.equal(engine.bird.y, 250);
  assert.equal(engine.bird.vy, 0);
  assert.equal(engine.bird.isDead, false);
  assert.equal(engine.pipeManager.pipes.length, 0);
});

// ====================================================================
// SUMMARY
// ====================================================================
console.log('\n====================================================');
console.log(`Adversarial Suite Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('====================================================\n');

if (failedTests > 0) {
  console.log('Failures Summary:');
  failures.forEach(f => {
    console.log(`- [${f.name}]: ${f.error}`);
  });
}
