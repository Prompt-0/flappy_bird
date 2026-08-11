import assert from 'node:assert/strict';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { Bird } from '../../public/js/engine/Bird.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';
import { CollisionSystem } from '../../public/js/engine/CollisionSystem.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';

console.log('=====================================================');
console.log('   M1 EMPIRICAL CHALLENGER ADVERSARIAL TEST RUNNER   ');
console.log('=====================================================\n');

let total = 0;
let passed = 0;
let failed = 0;
const report = [];

function runTest(id, name, testFn) {
  total++;
  try {
    testFn();
    passed++;
    console.log(`[PASS] ${id}: ${name}`);
    report.push({ id, name, status: 'PASS' });
  } catch (err) {
    failed++;
    console.log(`[FAIL] ${id}: ${name}`);
    console.log(`       Reason: ${err.message}`);
    report.push({ id, name, status: 'FAIL', error: err.message });
  }
}

// --------------------------------------------------
// Test 1: Existing Unit Test Suite Execution
// --------------------------------------------------
runTest('T1', 'Standard Unit Test Execution Verification', () => {
  const bus = new EventBus();
  assert.ok(bus);
  const bird = new Bird(bus);
  assert.equal(bird.x, 100);
  assert.equal(bird.y, 250);
});

// --------------------------------------------------
// Test 2: Fixed Timestep Determinism (60Hz vs 120Hz vs 144Hz)
// --------------------------------------------------
runTest('T2', 'Fixed Timestep Physics Integration Determinism', () => {
  const runSim = (dts) => {
    const engine = new GameEngine();
    engine.setState(EngineState.PLAYING);
    let stepCount = 0;
    for (const dt of dts) {
      const clampedDt = Math.min(dt, engine.MAX_DELTA);
      engine.accumulator += clampedDt;
      while (engine.accumulator >= engine.FIXED_DT - 1e-7) {
        stepCount++;
        if (stepCount === 20 || stepCount === 80) engine.bird.flap();
        engine.updatePhysics(engine.FIXED_DT);
        engine.accumulator -= engine.FIXED_DT;
      }
    }
    return { y: engine.bird.y.toFixed(6), vy: engine.bird.vy.toFixed(6) };
  };

  const res60 = runSim(Array(180).fill(1/60));
  const res120 = runSim(Array(360).fill(1/120));
  const res144 = runSim(Array(432).fill(1/144));

  assert.equal(res60.y, res120.y, `Y mismatch between 60Hz and 120Hz: ${res60.y} vs ${res120.y}`);
  assert.equal(res60.vy, res120.vy, `Vy mismatch between 60Hz and 120Hz: ${res60.vy} vs ${res120.vy}`);
  assert.equal(res60.y, res144.y, `Y mismatch between 60Hz and 144Hz: ${res60.y} vs ${res144.y}`);
});

// --------------------------------------------------
// Test 3: Pipe Spawning Interval Specification Compliance (200px)
// --------------------------------------------------
runTest('T3', 'Pipe Spawning Interval (200px scroll displacement between spawns)', () => {
  const pm = new PipeManager(null, { spawnInterval: 200, scrollSpeed: 160 });
  const dt = 1/60;

  // Step until first pipe spawns
  while (pm.pipes.length === 0) pm.update(dt);
  const spawn1Dist = pm.distanceScrolled;

  // Step until second pipe spawns
  while (pm.pipes.length === 1) pm.update(dt);
  const spawn2Dist = pm.distanceScrolled;
  const interSpawnDist = spawn2Dist - spawn1Dist;

  const leadingEdgeGap = pm.pipes[1].x - pm.pipes[0].x;

  assert.ok(
    Math.abs(interSpawnDist - 200) < 5,
    `Pipe spawning interval defect: Pipes spawned after ${interSpawnDist.toFixed(2)}px instead of 200px! (Inter-pipe leading edge gap: ${leadingEdgeGap.toFixed(2)}px)`
  );
});

// --------------------------------------------------
// Test 4: Corner Collision Geometry & Distance Math
// --------------------------------------------------
runTest('T4', 'Circle vs AABB Corner Collision Precision Math', () => {
  const box = { rx: 100, ry: 100, rw: 50, rh: 50 };
  
  // d² = (100-91)² + (100-91)² = 81 + 81 = 162 < 169 (r=13) -> Collision
  assert.equal(CollisionSystem.checkCircleAABB({ x: 91, y: 91, radius: 13 }, box), true);

  // d² = (100-90)² + (100-90)² = 100 + 100 = 200 > 169 -> Clear
  assert.equal(CollisionSystem.checkCircleAABB({ x: 90, y: 90, radius: 13 }, box), false);
});

// --------------------------------------------------
// Test 5: Terminal Velocity Clamping
// --------------------------------------------------
runTest('T5', 'Terminal Velocity Upper Bound Clamping (+650 px/s)', () => {
  const bird = new Bird();
  bird.vy = 800;
  bird.update(1/60);
  assert.equal(bird.vy, 650);
});

// --------------------------------------------------
// Test 6: Ceiling Clamping Behavior
// --------------------------------------------------
runTest('T6', 'Ceiling Boundary Clamping (y=13, upward vy=0)', () => {
  const bird = new Bird(null, { x: 100, y: 5 });
  bird.vy = -350;
  const clamped = CollisionSystem.applyCeilingBoundary(bird);
  assert.equal(clamped, true);
  assert.equal(bird.y, 13);
  assert.equal(bird.vy, 0);
});

// --------------------------------------------------
// Test 7: Pipe Clearance & Single Event Emission
// --------------------------------------------------
runTest('T7', 'Pipe Passage Scoring Bounds & Single Emission Guarantee', () => {
  const bus = new EventBus();
  let scoreEmissions = 0;
  bus.on('PIPE_PASS', () => scoreEmissions++);

  const pm = new PipeManager(bus, { pipeWidth: 64 });
  const pipe = pm.spawnPipePair(100, 150); // pipe right edge = 164

  pm.checkScoring({ x: 164 });
  assert.equal(scoreEmissions, 0);

  pm.checkScoring({ x: 164.1 });
  assert.equal(scoreEmissions, 1);

  pm.checkScoring({ x: 180 });
  assert.equal(scoreEmissions, 1); // No duplicate emission
});

// --------------------------------------------------
// Test 8: GameEngine State Transitions Lifecycle
// --------------------------------------------------
runTest('T8', 'GameEngine Full Lifecycle State Machine Transitions', () => {
  const engine = new GameEngine();
  assert.equal(engine.state, EngineState.START);

  engine.triggerFlap();
  assert.equal(engine.state, EngineState.PLAYING);

  engine.triggerPause();
  assert.equal(engine.state, EngineState.PAUSED);

  engine.triggerPause();
  assert.equal(engine.state, EngineState.PLAYING);

  // Set bird to fall onto ground
  engine.bird.y = 515;
  engine.bird.vy = 200;
  engine.step(1/60);
  assert.equal(engine.state, EngineState.GAME_OVER);

  engine.triggerFlap();
  assert.equal(engine.state, EngineState.START);
});

console.log('\n=====================================================');
console.log(` SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
console.log('=====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
