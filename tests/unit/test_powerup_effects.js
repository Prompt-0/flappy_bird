import assert from 'assert';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';

console.log('=== Running test_powerup_effects.js ===\n');

const eventBus = new EventBus();
const engine = new GameEngine({ eventBus });

engine.setState(EngineState.PLAYING);

// Test 1: Star 2x Score Multiplier
engine.powerUpManager.activeEffects.scoreMultiplier = 2;
eventBus.emit('PIPE_PASS', { score: 1, pipeId: 1 });
assert.strictEqual(engine.score, 2, 'Passing pipe with 2x multiplier should increase score by 2');

eventBus.emit('PIPE_PASS', { score: 2, pipeId: 2 });
assert.strictEqual(engine.score, 4, 'Passing second pipe with 2x multiplier should increase score by 2 (total 4)');

// Test 2: Slow-Mo scaling
engine.powerUpManager.activeEffects.isSlowMo = true;
const initialPipeX = engine.pipeManager.spawnPipePair(360).x;
engine.updatePhysics(0.1);
const scrolledDistance = 360 - engine.pipeManager.getPipes()[0].x;
// Standard 160px/s * 0.1s = 16px. Slow-Mo 60% = 9.6px.
assert(scrolledDistance < 12, `Slow-mo should reduce scroll distance (actual: ${scrolledDistance.toFixed(2)}px)`);

// Test 3: Shield absorption and Invulnerability window
engine.powerUpManager.reset();
engine.powerUpManager.activeEffects.hasShield = true;
engine.bird.x = 100;
engine.bird.y = 100;

// Place pipe right on top of bird
engine.pipeManager.pipes = [{
  id: 99,
  x: 80,
  width: 64,
  topHeight: 300,
  bottomY: 435,
  bottomHeight: 93,
  gapHeight: 135,
  scored: false,
  topPipe: { rx: 80, ry: 0, rw: 64, rh: 300 },
  bottomPipe: { rx: 80, ry: 435, rw: 64, rh: 93 }
}];

// Frame 0: Collision occurs, shield should absorb
engine.updatePhysics(0.016);
assert.strictEqual(engine.bird.isDead, false, 'Bird should survive hit when shield is active');
assert.strictEqual(engine.powerUpManager.activeEffects.hasShield, false, 'Shield should be consumed');
assert(engine.invulnerableTimer > 0, 'Invulnerability timer should be set');

// Frame 1: Bird still near pipe, but invulnerable timer protects it
engine.updatePhysics(0.016);
assert.strictEqual(engine.bird.isDead, false, 'Bird should survive subsequent frame during invulnerability window');

console.log('✔ ALL POWER-UP EFFECT FIXES PASSED SUCCESSFULLY!\n');
