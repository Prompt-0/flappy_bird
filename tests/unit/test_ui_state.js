/**
 * Unit Verification Test Suite for Milestone 4 (Responsive UI, Controls & State Machine)
 * Command: node tests/unit/test_ui_state.js
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

import { EventBus } from '../../public/js/engine/EventBus.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';
import { StateMachine, GameState } from '../../public/js/state/StateMachine.js';
import { ResponsiveScaler } from '../../public/js/ui/ResponsiveScaler.js';
import { InputManager, InputAction } from '../../public/js/input/InputManager.js';
import { UIManager } from '../../public/js/ui/UIManager.js';
import { initGame } from '../../public/js/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function describe(suiteName, fn) {
  console.log(`\n\x1b[36m▶ Suite: ${suiteName}\x1b[0m`);
  fn();
}

function test(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
  } catch (err) {
    failedTests++;
    console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${testName}`);
    errors.push({ testName, error: err });
  }
}

// Read index.html for JSDOM testing
const indexPath = path.resolve(__dirname, '../../public/index.html');
const indexHtmlContent = fs.readFileSync(indexPath, 'utf-8');

// ==========================================
// Suite 1: State Machine States & Lifecycle
// ==========================================
describe('1) StateMachine States, Transitions & Lifecycle Hooks', () => {
  test('StateMachine initial state is START and exposes all states', () => {
    const sm = new StateMachine();
    assert.equal(sm.getState(), GameState.START);
    assert.deepEqual(Object.keys(GameState), ['START', 'PLAYING', 'PAUSED', 'GAME_OVER', 'SKIN_SELECT', 'SETTINGS', 'MODE_SELECT', 'TROPHY_CABINET']);
  });

  test('StateMachine permits valid state transitions', () => {
    const bus = new EventBus();
    const sm = new StateMachine({ eventBus: bus });

    // START -> PLAYING
    assert.equal(sm.canTransition(GameState.PLAYING), true);
    assert.equal(sm.setState(GameState.PLAYING), true);
    assert.equal(sm.getState(), GameState.PLAYING);

    // PLAYING -> PAUSED
    assert.equal(sm.canTransition(GameState.PAUSED), true);
    assert.equal(sm.setState(GameState.PAUSED), true);
    assert.equal(sm.getState(), GameState.PAUSED);

    // PAUSED -> PLAYING
    assert.equal(sm.canTransition(GameState.PLAYING), true);
    assert.equal(sm.setState(GameState.PLAYING), true);
    assert.equal(sm.getState(), GameState.PLAYING);

    // PLAYING -> GAME_OVER
    assert.equal(sm.canTransition(GameState.GAME_OVER), true);
    assert.equal(sm.setState(GameState.GAME_OVER), true);
    assert.equal(sm.getState(), GameState.GAME_OVER);

    // GAME_OVER -> START
    assert.equal(sm.canTransition(GameState.START), true);
    assert.equal(sm.setState(GameState.START), true);
    assert.equal(sm.getState(), GameState.START);

    // START -> SKIN_SELECT
    assert.equal(sm.canTransition(GameState.SKIN_SELECT), true);
    assert.equal(sm.setState(GameState.SKIN_SELECT), true);

    // SKIN_SELECT -> START
    assert.equal(sm.setState(GameState.START), true);

    // START -> SETTINGS
    assert.equal(sm.canTransition(GameState.SETTINGS), true);
    assert.equal(sm.setState(GameState.SETTINGS), true);

    // SETTINGS -> START
    assert.equal(sm.setState(GameState.START), true);
  });

  test('StateMachine rejects invalid state transitions', () => {
    const sm = new StateMachine();

    // From START, cannot go to GAME_OVER or PAUSED directly
    assert.equal(sm.canTransition(GameState.GAME_OVER), false);
    assert.equal(sm.setState(GameState.GAME_OVER), false);
    assert.equal(sm.getState(), GameState.START);

    assert.equal(sm.canTransition(GameState.PAUSED), false);
    assert.equal(sm.setState(GameState.PAUSED), false);
    assert.equal(sm.getState(), GameState.START);

    // Transition to self is invalid
    assert.equal(sm.canTransition(GameState.START), false);
    assert.equal(sm.setState(GameState.START), false);
  });

  test('StateMachine executes onEnter and onExit lifecycle hooks', () => {
    const sm = new StateMachine();
    let exitedStart = false;
    let enteredPlaying = false;
    let hookOldState = null;
    let hookNewState = null;

    sm.onExit(GameState.START, (oldState, newState) => {
      exitedStart = true;
      hookOldState = oldState;
    });

    sm.onEnter(GameState.PLAYING, (newState, oldState) => {
      enteredPlaying = true;
      hookNewState = newState;
    });

    sm.setState(GameState.PLAYING);

    assert.equal(exitedStart, true);
    assert.equal(enteredPlaying, true);
    assert.equal(hookOldState, GameState.START);
    assert.equal(hookNewState, GameState.PLAYING);
  });

  test('StateMachine emits ENGINE_STATE_CHANGE event with oldState and newState', () => {
    const bus = new EventBus();
    const sm = new StateMachine({ eventBus: bus });
    let emittedEvent = null;

    bus.on('ENGINE_STATE_CHANGE', (payload) => {
      emittedEvent = payload;
    });

    sm.setState(GameState.PLAYING);

    assert.ok(emittedEvent !== null);
    assert.equal(emittedEvent.oldState, GameState.START);
    assert.equal(emittedEvent.newState, GameState.PLAYING);
  });
});

// ==========================================
// Suite 2: ResponsiveScaler Aspect Ratio Lock
// ==========================================
describe('2) ResponsiveScaler 9:16 Aspect Ratio Calculations', () => {
  test('ResponsiveScaler scale 1.0 on exact 360x640 viewport', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const metrics = scaler.calculateScale(360, 640);

    assert.equal(metrics.scale, 1.0);
    assert.equal(metrics.displayWidth, 360);
    assert.equal(metrics.displayHeight, 640);
    assert.equal(metrics.offsetX, 0);
    assert.equal(metrics.offsetY, 0);
    assert.equal(metrics.pillarbox, false);
    assert.equal(metrics.letterbox, false);
  });

  test('ResponsiveScaler scale 2.0 on 720x1280 (2x) viewport', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const metrics = scaler.calculateScale(720, 1280);

    assert.equal(metrics.scale, 2.0);
    assert.equal(metrics.displayWidth, 720);
    assert.equal(metrics.displayHeight, 1280);
    assert.equal(metrics.offsetX, 0);
    assert.equal(metrics.offsetY, 0);
  });

  test('ResponsiveScaler pillarboxing on wider 1000x640 viewport', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const metrics = scaler.calculateScale(1000, 640);

    assert.equal(metrics.scale, 1.0);
    assert.equal(metrics.displayWidth, 360);
    assert.equal(metrics.displayHeight, 640);
    assert.equal(metrics.offsetX, 320); // (1000 - 360)/2 = 320
    assert.equal(metrics.offsetY, 0);
    assert.equal(metrics.pillarbox, true);
    assert.equal(metrics.letterbox, false);
  });

  test('ResponsiveScaler letterboxing on taller 360x1000 viewport', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const metrics = scaler.calculateScale(360, 1000);

    assert.equal(metrics.scale, 1.0);
    assert.equal(metrics.displayWidth, 360);
    assert.equal(metrics.displayHeight, 640);
    assert.equal(metrics.offsetX, 0);
    assert.equal(metrics.offsetY, 180); // (1000 - 640)/2 = 180
    assert.equal(metrics.pillarbox, false);
    assert.equal(metrics.letterbox, true);
  });
});

// ==========================================
// Suite 3: Unified Input Manager
// ==========================================
describe('3) InputManager Debouncing & Action Mapping', () => {
  test('InputManager debounces mouse click following touch within 300ms', () => {
    const inputMgr = new InputManager({ debounceMs: 300 });

    inputMgr._onTouchStart({ preventDefault: () => {}, target: null });
    assert.equal(inputMgr.isTouchDebounced(), true);

    let actionFired = false;
    inputMgr.eventBus = { emit: () => { actionFired = true; } };

    // Mouse click immediately after touch -> suppressed
    inputMgr._onMouseDown({ target: null });
    assert.equal(actionFired, false);
  });

  test('InputManager keyboard mapping: Space & Enter flap, KeyP & Esc toggle pause/back', () => {
    const sm = new StateMachine();
    const ge = new GameEngine();
    const inputMgr = new InputManager({ stateMachine: sm, gameEngine: ge });

    // START state -> Space key starts playing
    inputMgr._onKeyDown({ code: 'Space', key: ' ', preventDefault: () => {} });
    assert.equal(sm.getState(), GameState.PLAYING);

    // PLAYING state -> KeyP toggles PAUSED
    inputMgr._onKeyDown({ code: 'KeyP', key: 'p', preventDefault: () => {} });
    assert.equal(sm.getState(), GameState.PAUSED);

    // PAUSED state -> Escape toggles back to PLAYING
    inputMgr._onKeyDown({ code: 'Escape', key: 'Escape', preventDefault: () => {} });
    assert.equal(sm.getState(), GameState.PLAYING);
  });
});

// ==========================================
// Suite 4: DOM Overlays & data-testid Hooks
// ==========================================
describe('4) DOM Overlays & 14 data-testid Attributes', () => {
  test('index.html contains all 14 data-testid elements', () => {
    const dom = new JSDOM(indexHtmlContent);
    const doc = dom.window.document;

    const requiredTestIds = [
      'start-screen',
      'start-button',
      'skin-select-button',
      'settings-button',
      'pause-screen',
      'resume-button',
      'restart-button',
      'game-over-screen',
      'retry-button',
      'skin-select-screen',
      'skin-option',
      'settings-screen',
      'sound-toggle',
      'close-settings-button'
    ];

    requiredTestIds.forEach(id => {
      const el = doc.querySelector(`[data-testid="${id}"]`);
      assert.ok(el !== null, `Missing required data-testid="${id}" element in index.html`);
    });
  });

  test('UIManager maps state transitions to overlay DOM visibilities', () => {
    const dom = new JSDOM(indexHtmlContent);
    const doc = dom.window.document;
    const bus = new EventBus();
    const sm = new StateMachine({ eventBus: bus });
    const ge = new GameEngine({ eventBus: bus });
    const ui = new UIManager({ document: doc, stateMachine: sm, gameEngine: ge, eventBus: bus });

    // Initial state (START): start-screen active, others hidden
    let vis = ui.getOverlayVisibility();
    assert.equal(vis['start-screen'], true);
    assert.equal(vis['start-button'], true);
    assert.equal(vis['pause-screen'], false);
    assert.equal(vis['game-over-screen'], false);
    assert.equal(vis['skin-select-screen'], false);
    assert.equal(vis['settings-screen'], false);

    // Transition to PLAYING -> All modal screens hidden
    sm.setState(GameState.PLAYING);
    vis = ui.getOverlayVisibility();
    assert.equal(vis['start-screen'], false);
    assert.equal(vis['pause-screen'], false);
    assert.equal(vis['game-over-screen'], false);
    assert.equal(vis['skin-select-screen'], false);
    assert.equal(vis['settings-screen'], false);

    // Transition to PAUSED -> pause-screen active
    sm.setState(GameState.PAUSED);
    vis = ui.getOverlayVisibility();
    assert.equal(vis['pause-screen'], true);
    assert.equal(vis['resume-button'], true);
    assert.equal(vis['restart-button'], true);
    assert.equal(vis['start-screen'], false);

    // Transition to PLAYING -> GAME_OVER
    sm.setState(GameState.PLAYING);
    sm.setState(GameState.GAME_OVER);
    vis = ui.getOverlayVisibility();
    assert.equal(vis['game-over-screen'], true);
    assert.equal(vis['retry-button'], true);
    assert.equal(vis['start-screen'], false);

    // Transition to START -> SKIN_SELECT
    sm.setState(GameState.START);
    sm.setState(GameState.SKIN_SELECT);
    vis = ui.getOverlayVisibility();
    assert.equal(vis['skin-select-screen'], true);
    assert.equal(vis['skin-option'], true);
    assert.equal(vis['start-screen'], false);

    // Transition to START -> SETTINGS
    sm.setState(GameState.START);
    sm.setState(GameState.SETTINGS);
    vis = ui.getOverlayVisibility();
    assert.equal(vis['settings-screen'], true);
    assert.equal(vis['sound-toggle'], true);
    assert.equal(vis['close-settings-button'], true);
    assert.equal(vis['start-screen'], false);
  });
});

// ==========================================
// Suite 5: Global window.__FLAPPY_GAME__ API
// ==========================================
describe('5) Global window.__FLAPPY_GAME__ API', () => {
  test('window.__FLAPPY_GAME__ exposes all required inspection & automation methods', () => {
    const dom = new JSDOM(indexHtmlContent, { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;

    const game = initGame();
    const api = dom.window.__FLAPPY_GAME__;

    assert.ok(api !== undefined, 'window.__FLAPPY_GAME__ should be defined');
    assert.equal(typeof api.getState, 'function');
    assert.equal(typeof api.getScore, 'function');
    assert.equal(typeof api.getHighScore, 'function');
    assert.equal(typeof api.getBird, 'function');
    assert.equal(typeof api.getPipes, 'function');
    assert.equal(typeof api.triggerFlap, 'function');
    assert.equal(typeof api.triggerPause, 'function');
    assert.equal(typeof api.restartGame, 'function');

    // Initial values
    assert.equal(api.getState(), 'START');
    assert.equal(api.getScore(), 0);
    assert.equal(api.getHighScore(), 0);

    const bird = api.getBird();
    assert.equal(typeof bird.x, 'number');
    assert.equal(typeof bird.y, 'number');
    assert.equal(typeof bird.vy, 'number');
    assert.equal(typeof bird.isDead, 'boolean');

    const pipes = api.getPipes();
    assert.ok(Array.isArray(pipes));

    // triggerFlap: START -> PLAYING
    api.triggerFlap();
    assert.equal(api.getState(), 'PLAYING');

    // triggerPause: PLAYING -> PAUSED -> PLAYING
    api.triggerPause();
    assert.equal(api.getState(), 'PAUSED');

    api.triggerPause();
    assert.equal(api.getState(), 'PLAYING');

    // restartGame resets to START
    api.restartGame();
    assert.equal(api.getState(), 'START');

    // Clean up globals
    delete global.window;
    delete global.document;
  });
});

// ==========================================
// Final Results Reporting & Exit Code
// ==========================================
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Total Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (failedTests > 0) {
  console.error('\x1b[31mFailures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.stack || error.message);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL MILESTONE 4 UI & STATE UNIT TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
