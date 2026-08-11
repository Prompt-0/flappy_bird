import { EventBus } from '../../public/js/engine/EventBus.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';

const bus = new EventBus();
const pm = new PipeManager(bus, { spawnInterval: 200, scrollSpeed: 160 });
const dt = 1 / 60;

for (let step = 0; step < 6135; step++) {
  pm.update(dt);
  if (step >= 6120 && step <= 6130) {
    console.log(`Step ${step}: dist=${pm.distanceScrolled.toFixed(6)}, lastSpawn=${pm.lastSpawnDistance.toFixed(6)}, diff=${(pm.distanceScrolled - pm.lastSpawnDistance).toFixed(6)}, pipesCount=${pm.pipes.length}`);
  }
}
