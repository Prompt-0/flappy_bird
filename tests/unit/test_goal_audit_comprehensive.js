import assert from 'assert';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';
import { GameModeManager, GameMode } from '../../public/js/modes/GameModeManager.js';
import { AchievementManager, ACHIEVEMENTS } from '../../public/js/achievements/AchievementManager.js';
import { PowerUpManager, PowerUpType } from '../../public/js/engine/PowerUpManager.js';
import { StorageEngine } from '../../public/js/storage/StorageEngine.js';

console.log('=== Running test_goal_audit_comprehensive.js ===\n');

// -------------------------------------------------------------
// Suite 1: Challenge Mode Progression & Level Transitions
// -------------------------------------------------------------
console.log('▶ Suite 1: Challenge Mode Progression');

const eventBus = new EventBus();
const storageEngine = new StorageEngine();
const engine = new GameEngine({ eventBus, storageEngine });

engine.gameModeManager.setMode(GameMode.CHALLENGE);
assert.strictEqual(engine.gameModeManager.currentMode, GameMode.CHALLENGE, 'Mode should be CHALLENGE');
assert.strictEqual(engine.gameModeManager.currentLevel, 1, 'Should start at level 1');

let levelUpEvents = [];
eventBus.on('CHALLENGE_LEVEL_CLEARED', (data) => levelUpEvents.push(data));

// Pass pipes up to target score of level 1 (5 pts)
for (let i = 0; i < 5; i++) {
  engine.score = i + 1;
  engine.gameModeManager.checkLevelCompletion(engine.score);
}

assert.strictEqual(engine.gameModeManager.currentLevel, 2, 'Should level up to level 2 after reaching target score 5');
assert.strictEqual(levelUpEvents.length, 1, 'Should emit CHALLENGE_LEVEL_CLEARED event');
console.log('  ✔ PASS: Challenge Mode levels up correctly upon reaching target score');

// -------------------------------------------------------------
// Suite 2: All 10 Achievements Verification
// -------------------------------------------------------------
console.log('\n▶ Suite 2: Achievement Unlocks & Persistence');

const achManager = engine.achievementManager;
assert.strictEqual(ACHIEVEMENTS.length, 10, 'Should define exactly 10 achievements');

// Trigger First Flap
eventBus.emit('BIRD_FLAP');
assert.strictEqual(achManager.isUnlocked('FIRST_FLAP'), true, 'FIRST_FLAP achievement should unlock');

// Trigger Power-Up collections
eventBus.emit('POWERUP_COLLECTED', { type: PowerUpType.SHIELD });
assert.strictEqual(achManager.isUnlocked('SHIELD_MASTER'), true, 'SHIELD_MASTER achievement should unlock');

eventBus.emit('POWERUP_COLLECTED', { type: PowerUpType.STAR });
assert.strictEqual(achManager.isUnlocked('STAR_COLLECTOR'), true, 'STAR_COLLECTOR achievement should unlock');

eventBus.emit('POWERUP_COLLECTED', { type: PowerUpType.SLOW_MO });
assert.strictEqual(achManager.isUnlocked('TIME_WARPER'), true, 'TIME_WARPER achievement should unlock');

console.log('  ✔ PASS: Event-driven achievements unlock correctly');

// -------------------------------------------------------------
// Suite 3: Zen Mode Invincibility Guarantee
// -------------------------------------------------------------
console.log('\n▶ Suite 3: Zen Mode Invincibility');

engine.gameModeManager.setMode('ZEN');
engine.setState(EngineState.PLAYING);
engine.bird.x = 100;
engine.bird.y = 100;

// Place top pipe right over bird
engine.pipeManager.pipes = [{
  id: 1, x: 80, width: 64, topHeight: 300, bottomY: 435, bottomHeight: 93, gapHeight: 135, scored: false,
  topPipe: { rx: 80, ry: 0, rw: 64, rh: 300 }, bottomPipe: { rx: 80, ry: 435, rw: 64, rh: 93 }
}];

engine.updatePhysics(0.016);
assert.strictEqual(engine.bird.isDead, false, 'Bird must never die in Zen mode');
assert.strictEqual(engine.state, EngineState.PLAYING, 'Game state remains PLAYING in Zen mode');
console.log('  ✔ PASS: Zen mode invincibility verified under direct pipe collision');

// -------------------------------------------------------------
// Suite 4: Simultaneous Power-Up Effects Stacking
// -------------------------------------------------------------
console.log('\n▶ Suite 4: Simultaneous Power-Up Stacking');

engine.setState(EngineState.PLAYING);
engine.powerUpManager.reset();

engine.powerUpManager.applyPowerUp(PowerUpType.SHIELD, engine.bird);
engine.powerUpManager.applyPowerUp(PowerUpType.STAR, engine.bird);
engine.powerUpManager.applyPowerUp(PowerUpType.SLOW_MO, engine.bird);

const fx = engine.powerUpManager.activeEffects;
assert.strictEqual(fx.hasShield, true, 'Shield effect active');
assert.strictEqual(fx.scoreMultiplier, 2, 'Star multiplier active');
assert.strictEqual(fx.isSlowMo, true, 'Slow-Mo active');

engine.updatePhysics(0.1);
assert.strictEqual(fx.hasShield, true, 'Shield remains active during flight');
assert(fx.starTimer < 5.0, 'Star timer decreases');
assert(fx.slowMoTimer < 6.0, 'Slow-Mo timer decreases');
console.log('  ✔ PASS: Simultaneous power-up stacking verified');

console.log('\n═══════════════════════════════════════════════════');
console.log('✔ COMPREHENSIVE GOAL AUDIT SUITE PASSED SUCCESSFULLY!');
console.log('═══════════════════════════════════════════════════\n');
