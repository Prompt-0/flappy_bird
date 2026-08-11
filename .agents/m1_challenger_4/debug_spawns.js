import { EventBus } from '../../public/js/engine/EventBus.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';

const bus = new EventBus();
const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
const dt = 1 / 60;

let prevDist = null;

bus.on('PIPE_SPAWN', (data) => {
  if (prevDist !== null) {
    const delta = pm.distanceScrolled - prevDist;
    console.log(`Spawn ${data.pipeId}: dist=${pm.distanceScrolled.toFixed(6)}, delta=${delta.toFixed(6)}`);
  } else {
    console.log(`Spawn ${data.pipeId}: dist=${pm.distanceScrolled.toFixed(6)} (1st spawn)`);
  }
  prevDist = pm.distanceScrolled;
});

for (let step = 0; step < 7500; step++) {
  pm.update(dt);
  const pipes = pm.getPipes();
  for (let i = 0; i < pipes.length - 1; i++) {
    const spacing = pipes[i + 1].x - pipes[i].x;
    if (Math.abs(spacing - 200) > 1e-5) {
      console.log(`Step ${step}: Pipe ${pipes[i].id} x=${pipes[i].x.toFixed(6)}, Pipe ${pipes[i+1].id} x=${pipes[i+1].x.toFixed(6)}, spacing=${spacing.toFixed(6)}`);
    }
  }
}
