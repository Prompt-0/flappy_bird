import assert from 'assert';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { PowerUpManager, PowerUpType } from '../../public/js/engine/PowerUpManager.js';

console.log('=== Running test_powerups.js ===\n');

const eventBus = new EventBus();
const powerUpManager = new PowerUpManager(eventBus);

let collectedEvents = [];
eventBus.on('POWERUP_COLLECTED', (data) => collectedEvents.push(data));

// Test 1: PIPE_SPAWN event handling
for (let i = 0; i < 20; i++) {
  eventBus.emit('PIPE_SPAWN', {
    pipeId: i,
    x: 360,
    topHeight: 100,
    bottomY: 235,
    gapHeight: 135
  });
}

assert(powerUpManager.activeItems.length > 0, 'PowerUpManager should spawn items on PIPE_SPAWN events');

const firstItem = powerUpManager.activeItems[0];
assert.strictEqual(firstItem.y, 100 + 135 / 2, 'PowerUp item y coordinate should be centered in the gap');

// Test 2: Item collection collision logic
const bird = { x: firstItem.x, y: firstItem.y, radius: 13, isDead: false };
powerUpManager.update(0.016, 160, bird);

assert(collectedEvents.length >= 1, 'Collecting powerup should emit POWERUP_COLLECTED event');

// Test 3: Shield absorption
powerUpManager.activeEffects.hasShield = true;
assert.strictEqual(powerUpManager.consumeShield(), true, 'consumeShield() should return true when shield active');
assert.strictEqual(powerUpManager.activeEffects.hasShield, false, 'Shield should be consumed after hit');
assert.strictEqual(powerUpManager.consumeShield(), false, 'Second consumeShield() should return false');

console.log('✔ ALL POWER-UP UNIT TESTS PASSED SUCCESSFULLY!\n');
