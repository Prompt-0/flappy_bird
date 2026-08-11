import assert from 'node:assert/strict';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';

console.log('=== TESTING FIXED TIMESTEP DETERMINISM ===');

function runEngine(stepDts) {
  const engine = new GameEngine();
  engine.setState(EngineState.PLAYING);
  engine.bird.flap(); // Flap at start

  // Schedule flaps at fixed physics step counts
  let physicsStepCount = 0;
  
  for (const dt of stepDts) {
    // Before step, inspect physics step count inside engine?
    // We can simulate step(dt)
    const clampedDt = Math.min(dt, engine.MAX_DELTA);
    engine.accumulator += clampedDt;

    while (engine.accumulator >= engine.FIXED_DT - 1e-7) {
      physicsStepCount++;
      // Flap on physics steps 30, 90, 150
      if (physicsStepCount === 30 || physicsStepCount === 90 || physicsStepCount === 150) {
        engine.bird.flap();
      }
      engine.updatePhysics(engine.FIXED_DT);
      engine.accumulator -= engine.FIXED_DT;
    }
  }

  return {
    physicsSteps: physicsStepCount,
    birdX: engine.bird.x,
    birdY: engine.bird.y,
    birdVy: engine.bird.vy,
    birdRot: engine.bird.rotation,
    pipesCount: engine.pipeManager.pipes.length,
    pipe0X: engine.pipeManager.pipes[0]?.x,
    score: engine.score
  };
}

// 60Hz: 300 steps of 1/60
const dts60 = Array(300).fill(1 / 60);
const res60 = runEngine(dts60);

// 120Hz: 600 steps of 1/120
const dts120 = Array(600).fill(1 / 120);
const res120 = runEngine(dts120);

// 144Hz: 720 steps of 1/144
const dts144 = Array(720).fill(1 / 144);
const res144 = runEngine(dts144);

// Jittery FPS: random dt values adding up to 5.0 seconds
const dtsJitter = [];
let total = 0;
while (total < 5.0) {
  const dt = Math.random() * 0.03 + 0.005; // 5ms to 35ms
  dtsJitter.push(dt);
  total += dt;
}
const resJitter = runEngine(dtsJitter);

console.log('60Hz Result:  ', res60);
console.log('120Hz Result: ', res120);
console.log('144Hz Result: ', res144);

console.log('\n--- Precision Comparison ---');
console.log('60 vs 120 Y diff:', Math.abs(res60.birdY - res120.birdY));
console.log('60 vs 120 Vy diff:', Math.abs(res60.birdVy - res120.birdVy));
console.log('60 vs 120 Rot diff:', Math.abs(res60.birdRot - res120.birdRot));

assert.equal(res60.physicsSteps, res120.physicsSteps, 'Physics steps count mismatch!');
assert.equal(res60.birdY, res120.birdY, 'Bird Y mismatch between 60Hz and 120Hz!');
assert.equal(res60.birdVy, res120.birdVy, 'Bird Vy mismatch between 60Hz and 120Hz!');
assert.equal(res60.birdRot, res120.birdRot, 'Bird rotation mismatch between 60Hz and 120Hz!');
