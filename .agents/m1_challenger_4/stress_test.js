/**
 * Empirical Stress Test Harness for Flappy Bird M1 Iteration 2
 * Agent: Challenger 2 (m1_challenger_4)
 * Runner: Node.js native assert module
 */

import assert from 'node:assert/strict';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';

let total = 0;
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`    ${err.stack || err.message}`);
  }
}

console.log('\n==================================================');
console.log('EMPIRICAL STRESS TEST HARNESS — CHALLENGER 2');
console.log('==================================================\n');

// ----------------------------------------------------
// SECTION 1: Pipe Spawn Displacement Spacing (200px)
// ----------------------------------------------------
console.log('▶ SECTION 1: Pipe Spawn Displacement Spacing (200px)');

runTest('Single pipe pair spawn displacement spacing is strictly 200px', () => {
  const bus = new EventBus();
  const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });

  // Update until 1st spawn (200px scroll = 1.25s)
  pm.update(1.25);
  assert.equal(pm.pipes.length, 1);
  assert.equal(pm.pipes[0].x, 360);

  // Update until 2nd spawn (another 200px scroll = 1.25s)
  pm.update(1.25);
  assert.equal(pm.pipes.length, 2);
  assert.equal(pm.pipes[0].x, 160);
  assert.equal(pm.pipes[1].x, 360);

  const dx = pm.pipes[1].x - pm.pipes[0].x;
  assert.equal(dx, 200, `Horizontal spacing between consecutive pipes should be 200px, got ${dx}`);
});

runTest('Multi-pipe long run (100 pipe spawns over 7,500 frames at 60Hz)', () => {
  const bus = new EventBus();
  const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
  const dt = 1 / 60; // fixed step

  let spawnCount = 0;
  let prevSpawnDist = null;

  bus.on('PIPE_SPAWN', () => {
    spawnCount++;
    if (prevSpawnDist !== null) {
      const delta = pm.distanceScrolled - prevSpawnDist;
      assert.ok(Math.abs(delta - 200) < 1e-5, `Spawn scroll delta ${delta} deviates from 200px`);
    }
    prevSpawnDist = pm.distanceScrolled;
  });

  // Run 100 pipe cycles: 100 * 75 frames = 7500 frames
  for (let step = 0; step < 7500; step++) {
    pm.update(dt);
    // At any moment when 2 adjacent pipes exist, verify their x difference is 200px
    const pipes = pm.getPipes();
    for (let i = 0; i < pipes.length - 1; i++) {
      const spacing = pipes[i + 1].x - pipes[i].x;
      assert.ok(Math.abs(spacing - 200) < 1e-5, `Onscreen pipe spacing ${spacing} != 200px`);
    }
  }

  assert.equal(spawnCount, 100, `Expected 100 pipe spawns, got ${spawnCount}`);
});

runTest('Variable timestep scrolling maintains >= 200px distance threshold', () => {
  const bus = new EventBus();
  const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
  
  const spawnDeltas = [];
  let prevDistance = null;

  bus.on('PIPE_SPAWN', () => {
    if (prevDistance !== null) {
      spawnDeltas.push(pm.distanceScrolled - prevDistance);
    }
    prevDistance = pm.distanceScrolled;
  });

  // Simulate irregular frame times (16ms, 33ms, 10ms, 8ms)
  const dts = [0.016, 0.033, 0.010, 0.008, 0.025, 0.016, 0.016];
  for (let i = 0; i < 500; i++) {
    const dt = dts[i % dts.length];
    pm.update(dt);
  }

  assert.ok(spawnDeltas.length >= 5, 'Should have spawned at least 5 pipes');
  for (const delta of spawnDeltas) {
    assert.ok(delta >= 200, `Spawn delta ${delta} was less than 200px`);
    assert.ok(delta <= 206, `Spawn delta ${delta} exceeded 206px under variable dt`);
  }
});


// ----------------------------------------------------
// SECTION 2: PIPE_PASS Event Payload Format { score, pipeId }
// ----------------------------------------------------
console.log('\n▶ SECTION 2: PIPE_PASS Event Payload Format');

runTest('PIPE_PASS payload keys match exactly { score, pipeId }', () => {
  const bus = new EventBus();
  let receivedPayload = null;
  bus.on('PIPE_PASS', (data) => {
    receivedPayload = data;
  });

  const pm = new PipeManager(bus, { pipeWidth: 64 });
  const pipe = pm.spawnPipePair(100, 150);

  // Move pipe past bird (bird.x = 100, pipe right edge = 30 + 64 = 94 < 100)
  pipe.x = 30;
  pm.checkScoring(100);

  assert.notEqual(receivedPayload, null, 'PIPE_PASS should be emitted');
  assert.equal(typeof receivedPayload, 'object');
  const keys = Object.keys(receivedPayload).sort();
  assert.deepEqual(keys, ['pipeId', 'score'], `Payload keys must be ['pipeId', 'score'], got ${JSON.stringify(keys)}`);
  assert.equal(typeof receivedPayload.score, 'number', 'score must be a number');
  assert.equal(typeof receivedPayload.pipeId, 'number', 'pipeId must be a number');
  assert.equal(receivedPayload.score, 1);
  assert.equal(receivedPayload.pipeId, pipe.id);
});

runTest('PIPE_PASS fires exactly once per pipe pair and payload score increments sequentially', () => {
  const bus = new EventBus();
  const emittedEvents = [];
  bus.on('PIPE_PASS', (data) => {
    emittedEvents.push({ ...data });
  });

  const pm = new PipeManager(bus, { pipeWidth: 64, spawnInterval: 200, scrollSpeed: 160 });
  
  // Spawn 3 pipes
  const p1 = pm.spawnPipePair(100, 150);
  const p2 = pm.spawnPipePair(300, 150);
  const p3 = pm.spawnPipePair(500, 150);

  // Step 1: Bird passes pipe 1
  p1.x = 30; // right edge = 94 < 100
  pm.checkScoring(100);
  assert.equal(emittedEvents.length, 1);
  assert.deepEqual(emittedEvents[0], { score: 1, pipeId: p1.id });

  // Repeat checkScoring for pipe 1 -> must NOT re-emit
  pm.checkScoring(100);
  assert.equal(emittedEvents.length, 1, 'Pipe 1 should not emit duplicate PIPE_PASS');

  // Step 2: Bird passes pipe 2
  p2.x = 30;
  pm.checkScoring(100);
  assert.equal(emittedEvents.length, 2);
  assert.deepEqual(emittedEvents[1], { score: 2, pipeId: p2.id });

  // Step 3: Bird passes pipe 3
  p3.x = 30;
  pm.checkScoring(100);
  assert.equal(emittedEvents.length, 3);
  assert.deepEqual(emittedEvents[2], { score: 3, pipeId: p3.id });
});


// ----------------------------------------------------
// SECTION 3: GAME_OVER Payload isHighScore Contract
// ----------------------------------------------------
console.log('\n▶ SECTION 3: GAME_OVER Payload isHighScore Contract');

function forceCrash(engine) {
  engine.bird.y = 520;
  engine.bird.vy = 0;
  engine.step(1 / 60);
}

runTest('GAME_OVER isHighScore is false when score is 0 on first round', () => {
  const bus = new EventBus();
  let gameOverPayload = null;
  bus.on('GAME_OVER', (data) => { gameOverPayload = data; });

  const engine = new GameEngine({ eventBus: bus });
  engine.triggerFlap(); // Start playing (initialHighScore = 0)

  // Crash immediately without scoring
  forceCrash(engine);

  assert.equal(engine.state, EngineState.GAME_OVER);
  assert.notEqual(gameOverPayload, null);
  assert.equal(gameOverPayload.isHighScore, false, 'Score 0 vs initial 0 should be isHighScore: false');
  assert.equal(gameOverPayload.score, 0);
  assert.equal(gameOverPayload.finalScore, 0);
});

runTest('GAME_OVER isHighScore is true when score > initialHighScore (Round 1: score 1 vs 0)', () => {
  const bus = new EventBus();
  let gameOverPayload = null;
  bus.on('GAME_OVER', (data) => { gameOverPayload = data; });

  const engine = new GameEngine({ eventBus: bus });
  engine.triggerFlap(); // PLAYING (initialHighScore = 0)

  bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
  assert.equal(engine.score, 1);
  assert.equal(engine.highScore, 1);

  forceCrash(engine);

  assert.equal(gameOverPayload.isHighScore, true, 'Score 1 > initialHighScore 0 -> isHighScore: true');
});

runTest('GAME_OVER isHighScore is false when score equals initialHighScore (Round 2: score 1 vs 1)', () => {
  const bus = new EventBus();
  let gameOverPayload = null;
  bus.on('GAME_OVER', (data) => { gameOverPayload = data; });

  const engine = new GameEngine({ eventBus: bus });

  // Round 1: set high score to 1
  engine.triggerFlap();
  bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
  forceCrash(engine);
  assert.equal(engine.highScore, 1);

  // Round 2: START -> PLAYING
  engine.triggerFlap(); // START
  assert.equal(engine.initialHighScore, 1);
  engine.triggerFlap(); // PLAYING
  assert.equal(engine.initialHighScore, 1);

  bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
  forceCrash(engine);

  assert.equal(gameOverPayload.isHighScore, false, 'Score 1 equals initialHighScore 1 -> isHighScore: false');
});

runTest('GAME_OVER isHighScore is false when score is lower than initialHighScore (Round 3: score 0 vs 1)', () => {
  const bus = new EventBus();
  let gameOverPayload = null;
  bus.on('GAME_OVER', (data) => { gameOverPayload = data; });

  const engine = new GameEngine({ eventBus: bus });

  // Setup high score = 1
  engine.highScore = 1;

  // Round start
  engine.triggerFlap(); // START
  engine.triggerFlap(); // PLAYING
  assert.equal(engine.initialHighScore, 1);

  // Score 0 and die
  forceCrash(engine);

  assert.equal(gameOverPayload.isHighScore, false, 'Score 0 < initialHighScore 1 -> isHighScore: false');
});

runTest('GAME_OVER isHighScore is true when new record broken in multi-round sequence', () => {
  const bus = new EventBus();
  const gameOverLogs = [];
  bus.on('GAME_OVER', (data) => { gameOverLogs.push({ ...data }); });

  const engine = new GameEngine({ eventBus: bus });

  // Round 1: Score 3 (High score becomes 3)
  engine.triggerFlap(); // PLAYING
  bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
  bus.emit('PIPE_PASS', { score: 2, pipeId: 2 });
  bus.emit('PIPE_PASS', { score: 3, pipeId: 3 });
  forceCrash(engine);

  // Round 2: Score 2 (High score remains 3)
  engine.triggerFlap(); // START
  engine.triggerFlap(); // PLAYING
  bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
  bus.emit('PIPE_PASS', { score: 2, pipeId: 2 });
  forceCrash(engine);

  // Round 3: Score 3 (High score remains 3)
  engine.triggerFlap(); // START
  engine.triggerFlap(); // PLAYING
  bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
  bus.emit('PIPE_PASS', { score: 2, pipeId: 2 });
  bus.emit('PIPE_PASS', { score: 3, pipeId: 3 });
  forceCrash(engine);

  // Round 4: Score 5 (High score becomes 5)
  engine.triggerFlap(); // START
  engine.triggerFlap(); // PLAYING
  bus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
  bus.emit('PIPE_PASS', { score: 2, pipeId: 2 });
  bus.emit('PIPE_PASS', { score: 3, pipeId: 3 });
  bus.emit('PIPE_PASS', { score: 4, pipeId: 4 });
  bus.emit('PIPE_PASS', { score: 5, pipeId: 5 });
  forceCrash(engine);

  assert.equal(gameOverLogs.length, 4);
  assert.equal(gameOverLogs[0].isHighScore, true, 'R1: score 3 vs initial 0 -> true');
  assert.equal(gameOverLogs[1].isHighScore, false, 'R2: score 2 vs initial 3 -> false');
  assert.equal(gameOverLogs[2].isHighScore, false, 'R3: score 3 vs initial 3 -> false');
  assert.equal(gameOverLogs[3].isHighScore, true, 'R4: score 5 vs initial 3 -> true');
});

runTest('Pre-loaded localStorage high score contract', () => {
  const bus = new EventBus();
  let gameOverPayload = null;
  bus.on('GAME_OVER', (data) => { gameOverPayload = data; });

  const engine = new GameEngine({ eventBus: bus });
  engine.highScore = 50; // Simulated pre-loaded high score from localStorage

  engine.triggerFlap(); // START -> PLAYING
  assert.equal(engine.initialHighScore, 50);

  // Score 10 points
  for (let i = 1; i <= 10; i++) {
    bus.emit('PIPE_PASS', { score: i, pipeId: i });
  }

  forceCrash(engine);

  assert.equal(gameOverPayload.isHighScore, false, '10 <= 50 -> isHighScore: false');
});

console.log('\n==================================================');
console.log(`TOTAL HARNESS TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
