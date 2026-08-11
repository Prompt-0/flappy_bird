import assert from 'node:assert/strict';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';

const engine = new GameEngine();
console.log('1. Initial state:', engine.state);

engine.triggerFlap(); // START -> PLAYING
console.log('2. After triggerFlap:', engine.state);

engine.score = 15;
engine.bird.y = 520; // Trigger collision
console.log('3. Set bird y=520, bird.vy=', engine.bird.vy);

engine.step(1 / 60);
console.log('4. After step(1/60), state:', engine.state);

assert.equal(engine.state, EngineState.GAME_OVER);
assert.equal(engine.highScore, 15);

// Trigger flap to restart -> START
engine.triggerFlap();
console.log('5. After triggerFlap in GAME_OVER, state:', engine.state);
assert.equal(engine.state, EngineState.START);
