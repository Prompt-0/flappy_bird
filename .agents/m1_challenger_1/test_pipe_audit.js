import { PipeManager } from '../../public/js/engine/PipeManager.js';

const pm = new PipeManager(null, { spawnInterval: 200, scrollSpeed: 160 });

let step = 0;
const dt = 1 / 60;

console.log('Step-by-step Pipe Spawning Audit:');
let prevPipesCount = 0;

for (let i = 0; i < 600; i++) {
  pm.update(dt);
  step++;
  if (pm.pipes.length > prevPipesCount) {
    const newest = pm.pipes[pm.pipes.length - 1];
    const prev = pm.pipes.length > 1 ? pm.pipes[pm.pipes.length - 2] : null;
    console.log(`[Spawn #${newest.id}] Step ${step}, distanceScrolled: ${pm.distanceScrolled.toFixed(2)}px`);
    if (prev) {
      console.log(`  -> Prev pipe ID #${prev.id} x-position: ${prev.x.toFixed(2)}px`);
      console.log(`  -> New pipe ID #${newest.id} x-position: ${newest.x.toFixed(2)}px`);
      console.log(`  -> Inter-pipe leading edge distance: ${(newest.x - prev.x).toFixed(2)}px`);
      console.log(`  -> Scroll displacement since last spawn: ${(pm.distanceScrolled - pm.lastSpawnDistance).toFixed(2)}px`);
    }
  }
  prevPipesCount = pm.pipes.length;
}
