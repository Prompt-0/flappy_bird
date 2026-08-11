import assert from 'node:assert';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';

const bus = new EventBus();
const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
const dt = 1 / 60; // 60Hz fixed step

bus.on('PIPE_SPAWN', (data) => {
  if (data.pipeId >= 80 && data.pipeId <= 83) {
    console.log(`Pipe #${data.pipeId} spawned at frame step, distanceScrolled = ${pm.distanceScrolled.toFixed(12)}`);
  }
});

for (let step = 1; step <= 7500; step++) {
  pm.update(dt);
  if (step >= 6120 && step <= 6130) {
    const pipes = pm.getPipes();
    if (pipes.length >= 2) {
      const spacing = pipes[pipes.length - 1].x - pipes[pipes.length - 2].x;
      // Also log distance scrolled
      if (step === 6127) {
        console.log(`Frame 6127: distanceScrolled = ${pm.distanceScrolled.toFixed(12)}, pipe spacing = ${spacing.toFixed(12)}`);
      }
    }
  }
}
