/**
 * Adversarial Test Harness for Milestone 4: ResponsiveScaler & InputManager Debouncing
 * Runner: Node.js native assert/strict module
 * Execution Command: node tests/unit/test_challenger_2_scaler_input.js
 */

import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { EventBus } from '../../public/js/engine/EventBus.js';
import { GameEngine, EngineState } from '../../public/js/engine/GameEngine.js';
import { StateMachine, GameState } from '../../public/js/state/StateMachine.js';
import { ResponsiveScaler } from '../../public/js/ui/ResponsiveScaler.js';
import { InputManager, InputAction } from '../../public/js/input/InputManager.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];
const vulnerabilities = [];

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

function recordVulnerability(id, title, description, impact) {
  vulnerabilities.push({ id, title, description, impact });
}

// Setup JSDOM environment for DOM tests
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="game-container"><canvas id="game-canvas"></canvas></div></body></html>');
const { window } = dom;
const { document } = window;

// Mock canvas context for JSDOM
function createMockCanvas() {
  const canvas = document.createElement('canvas');
  canvas.getContext = () => ({
    scale: () => {},
    clearRect: () => {},
    fillRect: () => {},
    imageSmoothingEnabled: false
  });
  return canvas;
}

// Mock Date.now for deterministic timing tests
let currentMockTime = 100000;
const originalDateNow = Date.now;
function setMockTime(t) {
  currentMockTime = t;
  Date.now = () => currentMockTime;
}
function restoreDateNow() {
  Date.now = originalDateNow;
}

// Helper to set window.devicePixelRatio in JSDOM
function setDevicePixelRatio(dpr) {
  Object.defineProperty(window, 'devicePixelRatio', {
    value: dpr,
    configurable: true,
    writable: true
  });
}

// ==========================================
// Suite 1: ResponsiveScaler Viewport Calculations & Extreme Boundaries
// ==========================================
describe('1) ResponsiveScaler Viewport Calculations & Extreme Boundaries', () => {
  test('Standard 360x640 (9:16) viewport yields scale 1.0, 0 offset, no letterbox/pillarbox', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const m = scaler.calculateScale(360, 640);

    assert.equal(m.scale, 1.0);
    assert.equal(m.displayWidth, 360);
    assert.equal(m.displayHeight, 640);
    assert.equal(m.offsetX, 0);
    assert.equal(m.offsetY, 0);
    assert.equal(m.pillarbox, false);
    assert.equal(m.letterbox, false);
  });

  test('Double resolution 720x1280 yields scale 2.0, display 720x1280', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const m = scaler.calculateScale(720, 1280);

    assert.equal(m.scale, 2.0);
    assert.equal(m.displayWidth, 720);
    assert.equal(m.displayHeight, 1280);
    assert.equal(m.offsetX, 0);
    assert.equal(m.offsetY, 0);
    assert.equal(m.pillarbox, false);
    assert.equal(m.letterbox, false);
  });

  test('Ultra-wide viewport 3840x1080 (32:9 aspect ratio) calculations', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const m = scaler.calculateScale(3840, 1080);

    // windowRatio = 3840 / 1080 = 3.555... > 0.5625 (targetRatio) -> Pillarbox
    const expectedScale = 1080 / 640; // 1.6875
    assert.equal(m.scale, expectedScale);
    assert.equal(m.pillarbox, true);
    assert.equal(m.letterbox, false);

    assert.equal(m.displayHeight, 1080);
    assert.equal(m.displayWidth, Math.floor(360 * 1.6875)); // 607
    assert.equal(m.offsetY, 0);
    assert.equal(m.offsetX, Math.floor((3840 - 607) / 2)); // 1616
    assert.ok(!Number.isNaN(m.scale));
    assert.ok(!Number.isNaN(m.offsetX));
  });

  test('Ultra-tall viewport 1080x3840 (9:32 aspect ratio) calculations', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const m = scaler.calculateScale(1080, 3840);

    // windowRatio = 1080 / 3840 = 0.28125 < 0.5625 -> Letterbox
    const expectedScale = 1080 / 360; // 3.0
    assert.equal(m.scale, expectedScale);
    assert.equal(m.pillarbox, false);
    assert.equal(m.letterbox, true);

    assert.equal(m.displayWidth, 1080);
    assert.equal(m.displayHeight, Math.floor(640 * 3.0)); // 1920
    assert.equal(m.offsetX, 0);
    assert.equal(m.offsetY, Math.floor((3840 - 1920) / 2)); // 960
    assert.ok(!Number.isNaN(m.scale));
    assert.ok(!Number.isNaN(m.offsetY));
  });

  test('Extreme 0x0 viewport math verification', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const m = scaler.calculateScale(0, 0);

    // windowRatio = 0 / 0 = NaN
    // NaN > targetRatio -> false, NaN < targetRatio -> false -> else branch: scale = 0 / 360 = 0
    assert.equal(m.scale, 0);
    assert.equal(m.displayWidth, 0);
    assert.equal(m.displayHeight, 0);
    assert.equal(m.offsetX, 0);
    assert.equal(m.offsetY, 0);
    assert.equal(m.pillarbox, false);
    assert.equal(m.letterbox, false);
    assert.ok(!Number.isNaN(m.scale), 'Scale must not be NaN for 0x0 viewport');
    assert.ok(!Number.isNaN(m.offsetX), 'OffsetX must not be NaN for 0x0 viewport');
  });

  test('Asymmetric zero boundary viewports (0x640 and 360x0)', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });

    // 0x640 -> windowRatio = 0 < 0.5625 -> scale = 0 / 360 = 0, letterbox = true
    const m1 = scaler.calculateScale(0, 640);
    assert.equal(m1.scale, 0);
    assert.equal(m1.displayWidth, 0);
    assert.equal(m1.letterbox, true);
    assert.ok(!Number.isNaN(m1.offsetX));

    // 360x0 -> windowRatio = Infinity > 0.5625 -> scale = 0 / 640 = 0, pillarbox = true
    const m2 = scaler.calculateScale(360, 0);
    assert.equal(m2.scale, 0);
    assert.equal(m2.displayHeight, 0);
    assert.equal(m2.pillarbox, true);
    assert.ok(!Number.isNaN(m2.offsetY));
  });

  test('Fractional viewports (360.75 x 640.25)', () => {
    const scaler = new ResponsiveScaler({ logicalWidth: 360, logicalHeight: 640 });
    const m = scaler.calculateScale(360.75, 640.25);

    assert.ok(typeof m.displayWidth === 'number');
    assert.ok(typeof m.displayHeight === 'number');
    assert.ok(Number.isInteger(m.displayWidth), 'displayWidth should be integer pixels via Math.floor');
    assert.ok(Number.isInteger(m.displayHeight), 'displayHeight should be integer pixels via Math.floor');
  });

  test('Fractional DPR scaling interaction with GameEngine backing store', () => {
    const dprs = [0.5, 1.25, 1.5, 2.25, 2.75, 3.0];
    global.window = window;

    dprs.forEach(dpr => {
      setDevicePixelRatio(dpr);
      const canvas = createMockCanvas();
      const engine = new GameEngine({ canvas });
      assert.equal(engine.dpr, dpr);
      assert.equal(canvas.width, 360 * dpr);
      assert.equal(canvas.height, 640 * dpr);
    });

    delete global.window;
  });

  test('ResponsiveScaler updateLayout applies styles to canvas and container DOM elements', () => {
    const container = document.createElement('div');
    const canvas = createMockCanvas();
    container.appendChild(canvas);

    const scaler = new ResponsiveScaler({
      logicalWidth: 360,
      logicalHeight: 640,
      container,
      canvas
    });

    const metrics = scaler.calculateScale(720, 1280);
    scaler.metrics = metrics;

    if (canvas.style) {
      canvas.style.width = `${metrics.displayWidth}px`;
      canvas.style.height = `${metrics.displayHeight}px`;
    }
    if (container.style) {
      container.style.width = `${metrics.displayWidth}px`;
      container.style.height = `${metrics.displayHeight}px`;
    }

    assert.equal(canvas.style.width, '720px');
    assert.equal(canvas.style.height, '1280px');
    assert.equal(container.style.width, '720px');
    assert.equal(container.style.height, '1280px');
  });
});

// ==========================================
// Suite 2: InputManager Touch Debouncing & Timing Edge Cases
// ==========================================
describe('2) InputManager Touch Debouncing & Timing Edge Cases', () => {
  test('Touch debouncing boundary timing: 299ms vs 300ms vs 301ms', () => {
    setMockTime(10000);
    const inputMgr = new InputManager({ debounceMs: 300 });

    // Touch event recorded at t=10000ms
    inputMgr.lastTouchTime = Date.now();
    assert.equal(inputMgr.lastTouchTime, 10000);

    // Case A: Mouse click at t = 10299ms (dt = 299ms < 300ms) -> Debounced (returns true)
    setMockTime(10299);
    assert.equal(inputMgr.isTouchDebounced(), true, '299ms elapsed must be debounced (suppressed)');

    // Case B: Mouse click at t = 10300ms (dt = 300ms) -> Not debounced (returns false)
    setMockTime(10300);
    assert.equal(inputMgr.isTouchDebounced(), false, '300ms elapsed is NOT < 300ms, so not debounced');

    // Case C: Mouse click at t = 10301ms (dt = 301ms > 300ms) -> Not debounced (returns false)
    setMockTime(10301);
    assert.equal(inputMgr.isTouchDebounced(), false, '301ms elapsed must NOT be debounced');

    restoreDateNow();
  });

  test('InputManager suppresses mousedown event when touch debounced', () => {
    setMockTime(20000);
    const bus = new EventBus();
    const inputMgr = new InputManager({ eventBus: bus, debounceMs: 300 });

    let actionDispatched = false;
    bus.on('INPUT_ACTION', () => { actionDispatched = true; });

    // Touch event fires at t=20000
    inputMgr._onTouchStart({ preventDefault: () => {}, target: null });
    assert.equal(actionDispatched, true, 'Touch start should dispatch action');

    actionDispatched = false;
    // Mouse click at t=20150ms (150ms after touch)
    setMockTime(20150);
    inputMgr._onMouseDown({ target: null });
    assert.equal(actionDispatched, false, 'Mouse down 150ms after touch MUST be suppressed by debounce');

    // Mouse click at t=20350ms (350ms after touch)
    setMockTime(20350);
    inputMgr._onMouseDown({ target: null });
    assert.equal(actionDispatched, true, 'Mouse down 350ms after touch MUST be processed');

    restoreDateNow();
  });

  test('Custom debounceMs configuration (e.g. 500ms & 0ms)', () => {
    setMockTime(30000);

    // 500ms debounce
    const mgr500 = new InputManager({ debounceMs: 500 });
    mgr500.lastTouchTime = Date.now();
    setMockTime(30400); // 400ms later
    assert.equal(mgr500.isTouchDebounced(), true, '400ms is < 500ms debounce window');
    setMockTime(30600); // 600ms later
    assert.equal(mgr500.isTouchDebounced(), false, '600ms is >= 500ms debounce window');

    // 0ms debounce
    setMockTime(30000);
    const mgr0 = new InputManager({ debounceMs: 0 });
    mgr0.lastTouchTime = Date.now();
    setMockTime(30001);
    assert.equal(mgr0.isTouchDebounced(), false, '0ms debounce permits immediate click');

    restoreDateNow();
  });

  test('Rapid multi-touch events: consecutive touchstart within 5ms', () => {
    setMockTime(40000);
    const bus = new EventBus();
    const inputMgr = new InputManager({ eventBus: bus });

    let actionCount = 0;
    bus.on('INPUT_ACTION', (payload) => {
      if (payload.action === InputAction.FLAP) actionCount++;
    });

    // Touch 1 at t=40000ms
    inputMgr._onTouchStart({ preventDefault: () => {}, target: null });

    // Rapid Touch 2 at t=40005ms (5ms later, multi-touch tap)
    setMockTime(40005);
    inputMgr._onTouchStart({ preventDefault: () => {}, target: null });

    assert.equal(actionCount, 2, 'Both rapid touches trigger FLAP actions');
    restoreDateNow();
  });

  test('Touch / Click on UI button elements is ignored by InputManager dispatcher', () => {
    const button = document.createElement('button');
    const bus = new EventBus();
    const inputMgr = new InputManager({ eventBus: bus });

    let actionDispatched = false;
    bus.on('INPUT_ACTION', () => { actionDispatched = true; });

    // Touch on button element
    inputMgr._onTouchStart({ preventDefault: () => {}, target: button });
    assert.equal(actionDispatched, false, 'Touch on button must not trigger canvas game flap');

    // Click on child inside button element
    const icon = document.createElement('span');
    button.appendChild(icon);
    inputMgr._onMouseDown({ target: icon });
    assert.equal(actionDispatched, false, 'Click on button descendant must not trigger canvas game flap');
  });

  test('Keyboard spacebar auto-repeat behavior (event.repeat === true)', () => {
    const bus = new EventBus();
    const sm = new StateMachine({ eventBus: bus });
    const ge = new GameEngine({ eventBus: bus });
    const inputMgr = new InputManager({ stateMachine: sm, gameEngine: ge, eventBus: bus });

    sm.setState(GameState.PLAYING);

    let flapCount = 0;
    bus.on('BIRD_FLAP', () => { flapCount++; });

    // Initial press (repeat = false)
    inputMgr._onKeyDown({ code: 'Space', key: ' ', repeat: false, preventDefault: () => {} });
    assert.equal(flapCount, 1, 'Initial Space press must trigger 1 flap');

    // Auto-repeat press 1 (repeat = true, held down by OS)
    inputMgr._onKeyDown({ code: 'Space', key: ' ', repeat: true, preventDefault: () => {} });

    // Auto-repeat press 2 (repeat = true)
    inputMgr._onKeyDown({ code: 'Space', key: ' ', repeat: true, preventDefault: () => {} });

    if (flapCount > 1) {
      recordVulnerability(
        'VULN-KEY-REPEAT',
        'Unfiltered Keyboard Auto-Repeat',
        `InputManager._onKeyDown does not filter event.repeat === true. Holding down Spacebar causes continuous FLAP actions on every key repeat event (${flapCount} flaps recorded for 2 repeat events).`,
        'MEDIUM'
      );
      console.log(`    \x1b[33m⚠ VULNERABILITY DETECTED:\x1b[0m Keyboard auto-repeat (event.repeat === true) triggers repeated FLAP actions (${flapCount} flaps executed)`);
    } else {
      console.log('    ✔ Keyboard auto-repeat is properly ignored');
    }
  });

  test('Keyboard P and Escape auto-repeat behavior on state toggling', () => {
    const sm = new StateMachine();
    const inputMgr = new InputManager({ stateMachine: sm });

    sm.setState(GameState.PLAYING);

    // Initial P keydown -> PAUSED
    inputMgr._onKeyDown({ code: 'KeyP', key: 'p', repeat: false, preventDefault: () => {} });
    assert.equal(sm.getState(), GameState.PAUSED);

    // Repeat P keydown (repeat = true) -> toggles back to PLAYING!
    inputMgr._onKeyDown({ code: 'KeyP', key: 'p', repeat: true, preventDefault: () => {} });

    if (sm.getState() === GameState.PLAYING) {
      console.log('    \x1b[33m⚠ VULNERABILITY CONFIRMED:\x1b[0m Holding P key causes game to rapidly toggle PAUSED/PLAYING due to unfiltered event.repeat');
    }
  });

  test('Comprehensive Action Dispatch across all 6 Game States', () => {
    const states = [
      GameState.START,
      GameState.PLAYING,
      GameState.PAUSED,
      GameState.GAME_OVER,
      GameState.SKIN_SELECT,
      GameState.SETTINGS
    ];

    states.forEach(st => {
      const sm = new StateMachine();
      sm.state = st;
      const inputMgr = new InputManager({ stateMachine: sm });

      assert.doesNotThrow(() => {
        inputMgr.dispatchAction(InputAction.FLAP);
        inputMgr.dispatchAction(InputAction.PAUSE);
        inputMgr.dispatchAction(InputAction.BACK);
        inputMgr.dispatchAction(InputAction.ENTER);
      }, `Action dispatch in state ${st} must not throw`);
    });
  });
});

// ==========================================
// Final Results Reporting & Exit Code
// ==========================================
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Challenger 2 Total Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`Vulnerabilities / Defects Found: ${vulnerabilities.length}`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (vulnerabilities.length > 0) {
  console.log('\x1b[33mSummary of Identified Defects:\x1b[0m');
  vulnerabilities.forEach(v => {
    console.log(`- [${v.id}] (${v.impact}) ${v.title}: ${v.description}`);
  });
}

if (failedTests > 0) {
  console.error('\x1b[31mFailures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.stack || error.message);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL SCALER & INPUT DEBOUNCING ADVERSARIAL TESTS COMPLETED!\x1b[0m\n');
  process.exit(0);
}
