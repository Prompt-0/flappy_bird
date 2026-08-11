/**
 * Adversarial Stress Test Harness for Milestone 4 State Machine & Global API
 * Run with: node tests/unit/test_challenger_1_ui_state.js
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
const findings = [];

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

function recordFinding(severity, summary, details) {
  findings.push({ severity, summary, details });
  console.log(`  \x1b[33m⚠️ FINDING [${severity}]: ${summary}\x1b[0m`);
}

// Load index.html for DOM context
const indexPath = path.resolve(__dirname, '../../public/index.html');
const indexHtmlContent = fs.readFileSync(indexPath, 'utf-8');

function createTestEnvironment() {
  const dom = new JSDOM(indexHtmlContent, { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  const game = initGame();
  const api = dom.window.__FLAPPY_GAME__;
  return { dom, game, api, cleanup: () => {
    delete global.window;
    delete global.document;
  }};
}

// ============================================================================
// Suite 1: State Machine Transition Stress & Invalidation Matrix
// ============================================================================
describe('1) State Machine Transition Stress & Invalidation Matrix', () => {
  test('Rejects invalid direct transitions from all 6 states without corrupting state', () => {
    const sm = new StateMachine();

    const invalidMatrix = [
      { from: GameState.START, targets: [GameState.GAME_OVER, GameState.PAUSED, 'UNKNOWN', null, undefined, 123, {}] },
      { from: GameState.PLAYING, targets: [GameState.START, GameState.SKIN_SELECT, GameState.SETTINGS, 'INVALID'] },
      { from: GameState.PAUSED, targets: [GameState.GAME_OVER, GameState.SKIN_SELECT] },
      { from: GameState.GAME_OVER, targets: [GameState.PAUSED, GameState.SKIN_SELECT, GameState.SETTINGS] },
      { from: GameState.SKIN_SELECT, targets: [GameState.PLAYING, GameState.PAUSED, GameState.GAME_OVER, GameState.SETTINGS] },
      { from: GameState.SETTINGS, targets: [GameState.PLAYING, GameState.GAME_OVER, GameState.SKIN_SELECT] }
    ];

    // Helper to get from state to state via valid path
    function goToState(targetState) {
      if (sm.getState() === targetState) return;
      if (targetState === GameState.START) {
        if (sm.getState() === GameState.PLAYING) sm.setState(GameState.GAME_OVER);
        sm.setState(GameState.START);
      } else if (targetState === GameState.PLAYING) {
        goToState(GameState.START);
        sm.setState(GameState.PLAYING);
      } else if (targetState === GameState.PAUSED) {
        goToState(GameState.PLAYING);
        sm.setState(GameState.PAUSED);
      } else if (targetState === GameState.GAME_OVER) {
        goToState(GameState.PLAYING);
        sm.setState(GameState.GAME_OVER);
      } else if (targetState === GameState.SKIN_SELECT) {
        goToState(GameState.START);
        sm.setState(GameState.SKIN_SELECT);
      } else if (targetState === GameState.SETTINGS) {
        goToState(GameState.START);
        sm.setState(GameState.SETTINGS);
      }
    }

    for (const rule of invalidMatrix) {
      goToState(rule.from);
      assert.equal(sm.getState(), rule.from, `Failed setup state ${rule.from}`);

      for (const target of rule.targets) {
        const canTrans = sm.canTransition(target);
        assert.equal(canTrans, false, `State ${rule.from} should NOT be able to transition to ${target}`);
        const setRes = sm.setState(target);
        assert.equal(setRes, false, `setState(${target}) from ${rule.from} should return false`);
        assert.equal(sm.getState(), rule.from, `State should remain ${rule.from} after invalid transition to ${target}`);
      }
    }
  });

  test('Self-transition is rejected for all states', () => {
    const sm = new StateMachine();
    const states = Object.values(GameState);

    for (const state of states) {
      // Navigate to state
      if (state === GameState.PLAYING) sm.setState(GameState.PLAYING);
      else if (state === GameState.PAUSED) { sm.setState(GameState.PLAYING); sm.setState(GameState.PAUSED); }
      else if (state === GameState.GAME_OVER) { sm.setState(GameState.START); sm.setState(GameState.PLAYING); sm.setState(GameState.GAME_OVER); }
      else if (state === GameState.SKIN_SELECT) { sm.setState(GameState.START); sm.setState(GameState.SKIN_SELECT); }
      else if (state === GameState.SETTINGS) { sm.setState(GameState.START); sm.setState(GameState.SETTINGS); }

      assert.equal(sm.canTransition(state), false, `Self-transition to ${state} should be false`);
      assert.equal(sm.setState(state), false, `setState(${state}) while in ${state} should return false`);
      assert.equal(sm.getState(), state);
    }
  });

  test('Fuzz rapid random transition requests (1,000 operations)', () => {
    const bus = new EventBus();
    const sm = new StateMachine({ eventBus: bus });
    const statesAndGarbage = [...Object.values(GameState), 'FOO', '', null, undefined, 999, false];

    let attempted = 0;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < 1000; i++) {
      const target = statesAndGarbage[Math.floor(Math.random() * statesAndGarbage.length)];
      attempted++;
      const currentBefore = sm.getState();
      const res = sm.setState(target);
      if (res) {
        succeeded++;
        assert.equal(sm.getState(), target);
      } else {
        failed++;
        assert.equal(sm.getState(), currentBefore);
      }
    }

    assert.ok(Object.values(GameState).includes(sm.getState()), 'State must remain valid GameState after fuzzing');
    console.log(`    [Fuzz Info] 1000 random transition requests: ${succeeded} succeeded, ${failed} rejected.`);
  });
});

// ============================================================================
// Suite 2: Global window.__FLAPPY_GAME__ API & Rapid Action Invocations
// ============================================================================
describe('2) Global window.__FLAPPY_GAME__ API & Rapid Action Invocations', () => {
  test('Verify return values and shape of window.__FLAPPY_GAME__ methods', () => {
    const { game, api, cleanup } = createTestEnvironment();

    try {
      // Return types verification
      assert.equal(typeof api.getState(), 'string');
      assert.equal(typeof api.getScore(), 'number');
      assert.equal(typeof api.getHighScore(), 'number');

      const bird = api.getBird();
      assert.equal(typeof bird, 'object');
      assert.equal(typeof bird.x, 'number');
      assert.equal(typeof bird.y, 'number');
      assert.equal(typeof bird.vy, 'number');
      assert.equal(typeof bird.rotation, 'number');
      assert.equal(typeof bird.isDead, 'boolean');

      const pipes = api.getPipes();
      assert.ok(Array.isArray(pipes));

      // Test with active pipes
      game.gameEngine.pipeManager.spawnPipePair(200);
      const pipesActive = api.getPipes();
      assert.equal(pipesActive.length, 1);
      assert.equal(typeof pipesActive[0].x, 'number');
      assert.equal(typeof pipesActive[0].topHeight, 'number');
      assert.equal(typeof pipesActive[0].bottomY, 'number');
      assert.equal(typeof pipesActive[0].scored, 'boolean');
    } finally {
      cleanup();
    }
  });

  test('Rapid calls to triggerFlap(), triggerPause(), restartGame() during state transitions & edge states', () => {
    const { game, api, cleanup } = createTestEnvironment();

    try {
      // 1. Rapid triggerFlap in START state
      assert.equal(api.getState(), 'START');
      api.triggerFlap();
      assert.equal(api.getState(), 'PLAYING');
      api.triggerFlap();
      api.triggerFlap();
      api.triggerFlap();
      assert.equal(api.getState(), 'PLAYING');

      // 2. Rapid triggerPause in PLAYING state
      api.triggerPause(); // -> PAUSED
      assert.equal(api.getState(), 'PAUSED');
      api.triggerPause(); // -> PLAYING
      assert.equal(api.getState(), 'PLAYING');

      // Rapid pause toggles
      for (let i = 0; i < 100; i++) {
        api.triggerPause();
      }
      assert.equal(api.getState(), 'PLAYING'); // Even number of toggles = PLAYING

      // 3. triggerPause in START state (should do nothing)
      game.stateMachine.setState(GameState.GAME_OVER);
      game.stateMachine.setState(GameState.START);
      assert.equal(api.getState(), 'START');

      api.triggerPause();
      assert.equal(api.getState(), 'START'); // No change

      // 4. triggerFlap in GAME_OVER state
      game.stateMachine.setState(GameState.PLAYING);
      game.stateMachine.setState(GameState.GAME_OVER);
      assert.equal(api.getState(), 'GAME_OVER');

      api.triggerFlap();
      assert.equal(api.getState(), 'START'); // Flap in GAME_OVER transitions to START

    } finally {
      cleanup();
    }
  });

  test('EMPIRICAL BUG CHECK: restartGame() from PLAYING state', () => {
    const { game, api, cleanup } = createTestEnvironment();

    try {
      // Transition to PLAYING
      api.triggerFlap();
      assert.equal(api.getState(), 'PLAYING');
      assert.equal(game.gameEngine.state, 'PLAYING');

      // Call restartGame() from PLAYING state
      api.restartGame();

      const smState = api.getState(); // stateMachine.getState()
      const geState = game.gameEngine.state;

      console.log(`    [State Check] After restartGame() from PLAYING: StateMachine = "${smState}", GameEngine = "${geState}"`);

      if (smState !== geState) {
        recordFinding('HIGH', 'restartGame() in PLAYING state causes StateMachine and GameEngine desynchronization',
          `restartGame() calls stateMachine.setState(START) which is rejected because PLAYING -> START transition is invalid in StateMachine. But gameEngine.setState(START) executes, causing stateMachine to report "PLAYING" while gameEngine is "START".`
        );
      }

      assert.equal(smState, geState, `StateMachine state (${smState}) must match GameEngine state (${geState}) after restartGame()`);
    } finally {
      cleanup();
    }
  });

  test('EMPIRICAL BUG CHECK: restartGame() from SKIN_SELECT or SETTINGS states', () => {
    const { game, api, cleanup } = createTestEnvironment();

    try {
      // Move to SKIN_SELECT
      assert.equal(api.getState(), 'START');
      game.stateMachine.setState(GameState.SKIN_SELECT);
      assert.equal(api.getState(), 'SKIN_SELECT');

      // Call restartGame()
      api.restartGame();

      const smState = api.getState();
      const geState = game.gameEngine.state;

      assert.equal(smState, 'START', 'restartGame from SKIN_SELECT should set stateMachine to START');
      assert.equal(geState, 'START', 'restartGame from SKIN_SELECT should set gameEngine to START');
    } finally {
      cleanup();
    }
  });
});

// ============================================================================
// Suite 3: EventBus & State Machine Lifecycle Listener Leaks
// ============================================================================
describe('3) EventBus & State Machine Lifecycle Listener Leaks', () => {
  test('Repeated state transitions do NOT leak EventBus listeners or hooks', () => {
    const { game, api, cleanup } = createTestEnvironment();

    try {
      const bus = game.eventBus;
      const sm = game.stateMachine;

      // Count listeners before cycling states
      const listenerCountsBefore = {};
      for (const [event, set] of bus.listeners.entries()) {
        listenerCountsBefore[event] = set.size;
      }

      const enterHooksCountBefore = Array.from(sm.enterHooks.values()).reduce((sum, set) => sum + set.size, 0);
      const exitHooksCountBefore = Array.from(sm.exitHooks.values()).reduce((sum, set) => sum + set.size, 0);

      // Perform 500 state transitions
      for (let i = 0; i < 500; i++) {
        sm.setState(GameState.PLAYING);
        sm.setState(GameState.PAUSED);
        sm.setState(GameState.PLAYING);
        sm.setState(GameState.GAME_OVER);
        sm.setState(GameState.START);
      }

      // Count listeners after cycling states
      const listenerCountsAfter = {};
      for (const [event, set] of bus.listeners.entries()) {
        listenerCountsAfter[event] = set.size;
      }

      const enterHooksCountAfter = Array.from(sm.enterHooks.values()).reduce((sum, set) => sum + set.size, 0);
      const exitHooksCountAfter = Array.from(sm.exitHooks.values()).reduce((sum, set) => sum + set.size, 0);

      assert.deepEqual(listenerCountsAfter, listenerCountsBefore, 'EventBus listener counts should be identical before and after transitions');
      assert.equal(enterHooksCountAfter, enterHooksCountBefore, 'StateMachine enterHooks count should remain unchanged');
      assert.equal(exitHooksCountAfter, exitHooksCountBefore, 'StateMachine exitHooks count should remain unchanged');
    } finally {
      cleanup();
    }
  });

  test('EMPIRICAL BUG CHECK: Double emission of ENGINE_STATE_CHANGE during stateMachine.setState()', () => {
    const bus = new EventBus();
    const sm = new StateMachine({ eventBus: bus });
    const ge = new GameEngine({ eventBus: bus });

    // Replicate wiring in main.js
    sm.onEnter(GameState.START, () => ge.setState(GameState.START));
    sm.onEnter(GameState.PLAYING, () => ge.setState(GameState.PLAYING));
    sm.onEnter(GameState.PAUSED, () => ge.setState(GameState.PAUSED));
    sm.onEnter(GameState.GAME_OVER, () => ge.setState(GameState.GAME_OVER));

    let emitCount = 0;
    bus.on('ENGINE_STATE_CHANGE', (payload) => {
      emitCount++;
    });

    sm.setState(GameState.PLAYING);

    console.log(`    [Event Check] Calling sm.setState(PLAYING) emitted ENGINE_STATE_CHANGE ${emitCount} times.`);

    if (emitCount > 1) {
      recordFinding('MEDIUM', 'ENGINE_STATE_CHANGE is emitted twice per state change in standard module wiring',
        `When stateMachine.setState() runs, its enter hook triggers gameEngine.setState(), which emits ENGINE_STATE_CHANGE. Then stateMachine.setState() emits ENGINE_STATE_CHANGE a second time.`
      );
    }
  });

  test('Unsubscribing from stateMachine onEnter and onExit cleans up hooks', () => {
    const sm = new StateMachine();
    let count = 0;
    const unsubEnter = sm.onEnter(GameState.PLAYING, () => count++);
    const unsubExit = sm.onExit(GameState.START, () => count++);

    sm.setState(GameState.PLAYING);
    assert.equal(count, 2);

    unsubEnter();
    unsubExit();

    sm.setState(GameState.GAME_OVER);
    sm.setState(GameState.START);
    sm.setState(GameState.PLAYING);

    // Count should not increase further after unsubscribe
    assert.equal(count, 2);
  });
});

// ============================================================================
// Suite 4: DOM Overlay Sync & InputManager Action Routing
// ============================================================================
describe('4) DOM Overlay Sync & InputManager Action Routing', () => {
  test('UIManager overlay visibilities update accurately across state changes', () => {
    const { game, api, cleanup } = createTestEnvironment();

    try {
      const ui = game.uiManager;

      // 1. START
      let vis = ui.getOverlayVisibility();
      assert.equal(vis['start-screen'], true);
      assert.equal(vis['pause-screen'], false);
      assert.equal(vis['game-over-screen'], false);

      // 2. SKIN_SELECT
      game.stateMachine.setState(GameState.SKIN_SELECT);
      vis = ui.getOverlayVisibility();
      assert.equal(vis['start-screen'], false);
      assert.equal(vis['skin-select-screen'], true);

      // 3. Back to START -> SETTINGS
      game.stateMachine.setState(GameState.START);
      game.stateMachine.setState(GameState.SETTINGS);
      vis = ui.getOverlayVisibility();
      assert.equal(vis['settings-screen'], true);

      // 4. Back to START -> PLAYING
      game.stateMachine.setState(GameState.START);
      game.stateMachine.setState(GameState.PLAYING);
      vis = ui.getOverlayVisibility();
      assert.equal(vis['start-screen'], false);
      assert.equal(vis['settings-screen'], false);
      assert.equal(vis['pause-screen'], false);

      // 5. PAUSED
      game.stateMachine.setState(GameState.PAUSED);
      vis = ui.getOverlayVisibility();
      assert.equal(vis['pause-screen'], true);

    } finally {
      cleanup();
    }
  });

  test('InputManager action routing during invalid state actions', () => {
    const { game, api, cleanup } = createTestEnvironment();

    try {
      const input = game.inputManager;

      // In SETTINGS state, FLAP action should be ignored
      game.stateMachine.setState(GameState.SETTINGS);
      input.dispatchAction(InputAction.FLAP);
      assert.equal(api.getState(), 'SETTINGS');

      // BACK action in SETTINGS state returns to START
      input.dispatchAction(InputAction.BACK);
      assert.equal(api.getState(), 'START');

      // In SKIN_SELECT state, BACK action returns to START
      game.stateMachine.setState(GameState.SKIN_SELECT);
      input.dispatchAction(InputAction.BACK);
      assert.equal(api.getState(), 'START');

    } finally {
      cleanup();
    }
  });
});

// ============================================================================
// Final Reporting
// ============================================================================
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Total Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`Findings logged: ${findings.length}`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (findings.length > 0) {
  console.log('\x1b[33mSummary of Empirical Findings:\x1b[0m');
  findings.forEach((f, idx) => {
    console.log(`  ${idx + 1}. [${f.severity}] ${f.summary}`);
    console.log(`     ${f.details}\n`);
  });
}

if (failedTests > 0) {
  console.error('\x1b[31mFailures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.stack || error.message);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✔ EMPIRICAL STRESS TEST SUITE COMPLETED!\x1b[0m\n');
  process.exit(0);
}
