import { PipeManager } from '../../public/js/engine/PipeManager.js';

const pm = new PipeManager(null, { spawnInterval: 200, scrollSpeed: 160 });

// Initial state
console.log('Initial pipes:', pm.pipes.length);

// Step 1: scroll 200px to spawn first pipe
// 200px at 160px/s = 1.25s = 75 steps of 1/60s
for (let i = 0; i < 75; i++) {
  pm.update(1/60);
}
console.log('Pipes after 200px scroll:', pm.pipes.length);
if (pm.pipes.length > 0) {
  console.log('Pipe 1 x:', pm.pipes[0].x, 'Distance scrolled:', pm.distanceScrolled);
}

// Now continue stepping and see when Pipe 2 spawns!
let pipe2SpawnDist = null;
for (let i = 0; i < 100; i++) {
  const distBefore = pm.distanceScrolled;
  pm.update(1/60);
  if (pm.pipes.length === 2 && pipe2SpawnDist === null) {
    pipe2SpawnDist = pm.distanceScrolled;
    console.log('Pipe 2 spawned at distanceScrolled =', pm.distanceScrolled, 'Diff from Pipe 1 =', pm.distanceScrolled - 200);
    console.log('Pipe 1 position when Pipe 2 spawned:', pm.pipes[0].x);
    console.log('Pipe 2 position:', pm.pipes[1].x);
  }
}
