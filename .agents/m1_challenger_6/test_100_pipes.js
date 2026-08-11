import assert from 'node:assert';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';

console.log('=== EMPIRICAL CHALLENGER 6 LONG-RUN TEST (100 PIPES @ 60HZ) ===');

const bus = new EventBus();
const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
const dt = 1 / 60; // 60Hz fixed step

const spawns = [];
let prevDistance = 0;

bus.on('PIPE_SPAWN', (data) => {
  const currentDist = pm.distanceScrolled;
  const delta = currentDist - prevDistance;
  spawns.push({
    id: data.pipeId,
    distanceScrolled: currentDist,
    deltaFromPrev: delta,
    pipesOnScreen: pm.getPipes().length
  });
  prevDistance = currentDist;
});

// Run 100 pipe cycles: 100 * 75 frames = 7,500 frames at 60Hz
const frameSpacings = [];
for (let step = 1; step <= 7500; step++) {
  pm.update(dt);
  const pipes = pm.getPipes();
  for (let i = 0; i < pipes.length - 1; i++) {
    const spacing = pipes[i + 1].x - pipes[i].x;
    frameSpacings.push(spacing);
  }
}

console.log(`Total Pipe Spawns: ${spawns.length}`);
assert.strictEqual(spawns.length, 100, `Expected 100 pipe pair spawns, got ${spawns.length}`);

let maxDeltaErr = 0;
let maxSpacingErr = 0;

for (let i = 0; i < spawns.length; i++) {
  const delta = spawns[i].deltaFromPrev;
  const err = Math.abs(delta - 200);
  if (err > maxDeltaErr) maxDeltaErr = err;

  if (err > 0.01) {
    console.error(`FAIL: Pipe spawn #${spawns[i].id} delta = ${delta} (err: ${err})`);
  }
}

for (const spacing of frameSpacings) {
  const err = Math.abs(spacing - 200);
  if (err > maxSpacingErr) maxSpacingErr = err;
}

console.log(`Max Spawn Delta Error from 200px: ${maxDeltaErr.toExponential(6)} px`);
console.log(`Max Onscreen Pipe Spacing Error from 200px: ${maxSpacingErr.toExponential(6)} px`);

if (maxDeltaErr <= 0.01 && maxSpacingErr <= 0.01) {
  console.log('✔ VERIFICATION PASSED: Every consecutive pipe pair spawn displacement is strictly 200px (±0.01px tolerance).');
} else {
  console.error('✖ VERIFICATION FAILED!');
  process.exit(1);
}
