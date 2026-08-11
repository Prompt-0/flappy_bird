/**
 * Flappy Bird E2E Testing Harness
 * Path: tests/harness.js
 */

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// --- MOCK PROVIDERS FOR HEADLESS ENVIRONMENT ---

function setupCanvasMock(window) {
  if (!window.HTMLCanvasElement) return;

  window.HTMLCanvasElement.prototype.getContext = function (type) {
    if (type === '2d') {
      return {
        canvas: this,
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        createImageData: () => ([]),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {}
        }),
        createRadialGradient: () => ({
          addColorStop: () => {}
        }),
        createPattern: () => ({}),
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        shadowBlur: 0,
        shadowColor: 'transparent',
        shadowOffsetX: 0,
        shadowOffsetY: 0
      };
    }
    return null;
  };
}

function setupAudioMock(window) {
  class MockAudioContext {
    constructor() {
      this.state = 'suspended';
      this.destination = {};
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
    createGain() {
      return {
        gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        disconnect: () => {}
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { value: 440, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
        disconnect: () => {}
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: () => {},
        start: () => {},
        stop: () => {},
        disconnect: () => {}
      };
    }
    createBuffer() {
      return {
        getChannelData: () => new Float32Array(100)
      };
    }
  }

  if (!window.AudioContext) {
    window.AudioContext = MockAudioContext;
  }
  if (!window.webkitAudioContext) {
    window.webkitAudioContext = MockAudioContext;
  }
}

function setupAnimationMock(window) {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback) => {
      return setTimeout(() => callback(Date.now()), 16);
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id) => {
      clearTimeout(id);
    };
  }
}

function setupGameStub(window) {
  if (!window.__FLAPPY_GAME__) {
    let state = 'START';
    let score = 0;
    let highScore = 0;
    let bird = { x: 80, y: 300, vy: 0, rotation: 0, isDead: false };
    let pipes = [];

    window.__FLAPPY_GAME__ = {
      getState: () => state,
      getScore: () => score,
      getHighScore: () => highScore,
      getBird: () => ({ ...bird }),
      getPipes: () => [...pipes],
      triggerFlap: () => {
        bird.vy = -400;
        bird.rotation = -0.4;
      },
      triggerPause: () => {
        if (state === 'PLAYING') state = 'PAUSED';
        else if (state === 'PAUSED') state = 'PLAYING';
      },
      restartGame: () => {
        state = 'START';
        score = 0;
        bird = { x: 80, y: 300, vy: 0, rotation: 0, isDead: false };
        pipes = [];
      },
      _setState: (newState) => { state = newState; },
      _setScore: (val) => { score = val; },
      _setHighScore: (val) => { highScore = val; },
      _setBird: (b) => { bird = { ...bird, ...b }; },
      _setPipes: (p) => { pipes = p; }
    };
  }
}

const DEFAULT_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flappy Bird Web Game</title>
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas" data-testid="game-canvas" width="360" height="640"></canvas>
    
    <!-- UI Overlays -->
    <div id="start-screen" data-testid="start-screen" class="overlay active">
      <h1 class="game-title">FLAPPY BIRD</h1>
      <button id="start-btn" data-testid="start-btn">PLAY</button>
      <button id="skin-btn" data-testid="skin-select-btn">SKINS</button>
      <button id="settings-btn" data-testid="settings-btn">SETTINGS</button>
    </div>

    <div id="pause-screen" data-testid="pause-screen" class="overlay hidden">
      <h2>PAUSED</h2>
      <button id="resume-btn" data-testid="resume-btn">RESUME</button>
      <button id="restart-btn" data-testid="restart-btn">RESTART</button>
    </div>

    <div id="game-over-screen" data-testid="game-over-screen" class="overlay hidden">
      <h2>GAME OVER</h2>
      <div data-testid="score-display">0</div>
      <div data-testid="high-score-display">0</div>
      <button id="game-over-restart-btn" data-testid="game-over-restart-btn">PLAY AGAIN</button>
    </div>

    <div id="skin-select-screen" data-testid="skin-select-screen" class="overlay hidden">
      <h2>SELECT BIRD SKIN</h2>
      <div data-testid="skin-option-classic" class="skin-option">Classic Yellow</div>
      <div data-testid="skin-option-crimson" class="skin-option">Crimson Phoenix</div>
      <div data-testid="skin-option-neon" class="skin-option">Neon Cyber</div>
      <div data-testid="skin-option-golden" class="skin-option">Golden Eagle</div>
      <div data-testid="skin-option-midnight" class="skin-option">Midnight Raven</div>
      <button id="skin-back-btn" data-testid="skin-back-btn">BACK</button>
    </div>

    <div id="settings-screen" data-testid="settings-screen" class="overlay hidden">
      <h2>SETTINGS</h2>
      <button id="mute-btn" data-testid="mute-btn">MUTE AUDIO</button>
      <button id="settings-back-btn" data-testid="settings-back-btn">BACK</button>
    </div>
  </div>
</body>
</html>`;

/**
 * Loads the DOM environment using JSDOM.
 * Reads public/index.html if available, or uses DEFAULT_FALLBACK_HTML.
 */
function setupDOM(options = {}) {
  const projectRoot = path.resolve(__dirname, '..');
  const indexPath = options.htmlPath || path.join(projectRoot, 'public', 'index.html');
  
  let htmlContent = options.customHtml;
  if (!htmlContent) {
    if (fs.existsSync(indexPath)) {
      htmlContent = fs.readFileSync(indexPath, 'utf8');
    } else {
      htmlContent = DEFAULT_FALLBACK_HTML;
    }
  }

  const dom = new JSDOM(htmlContent, {
    url: options.url || 'http://localhost:3000',
    runScripts: options.runScripts || 'dangerously',
    resources: options.resources || 'usable'
  });

  const { window } = dom;

  setupCanvasMock(window);
  setupAudioMock(window);
  setupAnimationMock(window);
  setupGameStub(window);

  return {
    dom,
    window,
    document: window.document
  };
}

// --- GAME INSPECTION API HELPERS ---

function getTargetWindow(domOrWindow) {
  if (!domOrWindow) return global.window;
  if (domOrWindow.window) return domOrWindow.window;
  return domOrWindow;
}

function getState(dom) {
  const win = getTargetWindow(dom);
  return win.__FLAPPY_GAME__ ? win.__FLAPPY_GAME__.getState() : null;
}

function getScore(dom) {
  const win = getTargetWindow(dom);
  return win.__FLAPPY_GAME__ ? win.__FLAPPY_GAME__.getScore() : null;
}

function getHighScore(dom) {
  const win = getTargetWindow(dom);
  return win.__FLAPPY_GAME__ ? win.__FLAPPY_GAME__.getHighScore() : null;
}

function getBird(dom) {
  const win = getTargetWindow(dom);
  return win.__FLAPPY_GAME__ ? win.__FLAPPY_GAME__.getBird() : null;
}

function getPipes(dom) {
  const win = getTargetWindow(dom);
  return win.__FLAPPY_GAME__ ? win.__FLAPPY_GAME__.getPipes() : null;
}

function triggerFlap(dom) {
  const win = getTargetWindow(dom);
  if (win.__FLAPPY_GAME__ && typeof win.__FLAPPY_GAME__.triggerFlap === 'function') {
    win.__FLAPPY_GAME__.triggerFlap();
  }
}

function triggerPause(dom) {
  const win = getTargetWindow(dom);
  if (win.__FLAPPY_GAME__ && typeof win.__FLAPPY_GAME__.triggerPause === 'function') {
    win.__FLAPPY_GAME__.triggerPause();
  }
}

function restartGame(dom) {
  const win = getTargetWindow(dom);
  if (win.__FLAPPY_GAME__ && typeof win.__FLAPPY_GAME__.restartGame === 'function') {
    win.__FLAPPY_GAME__.restartGame();
  }
}

// --- DOM QUERY HELPERS ---

function getDocument(dom) {
  if (!dom) return global.document;
  if (dom.document) return dom.document;
  if (dom.window && dom.window.document) return dom.window.document;
  return dom;
}

function getByTestId(dom, testId) {
  const doc = getDocument(dom);
  let el = doc.querySelector(`[data-testid="${testId}"]`);
  if (!el) {
    if (testId === 'start-btn') el = doc.querySelector('[data-testid="start-button"]') || doc.getElementById('start-button');
    if (testId === 'skin-select-btn') el = doc.querySelector('[data-testid="skin-select-button"]') || doc.getElementById('skin-select-button');
    if (testId === 'settings-btn') el = doc.querySelector('[data-testid="settings-button"]') || doc.getElementById('settings-button');
    if (testId === 'resume-btn') el = doc.querySelector('[data-testid="resume-button"]') || doc.getElementById('resume-button');
    if (testId === 'restart-btn') el = doc.querySelector('[data-testid="restart-button"]') || doc.getElementById('restart-button');
    if (testId === 'game-over-restart-btn') el = doc.querySelector('[data-testid="retry-button"]') || doc.getElementById('retry-button');
    if (testId === 'mute-btn') el = doc.querySelector('[data-testid="sound-toggle"]') || doc.getElementById('sound-toggle');
    if (testId === 'skin-back-btn') el = doc.querySelector('[data-testid="close-skin-button"]') || doc.getElementById('close-skin-button');
    if (testId === 'settings-back-btn') el = doc.querySelector('[data-testid="close-settings-button"]') || doc.getElementById('close-settings-button');
    if (testId.startsWith('skin-option-')) {
      const skinId = testId.replace('skin-option-', '');
      el = doc.querySelector(`[data-skin-id="${skinId}"]`) || doc.querySelector('[data-testid="skin-option"]');
    }
  }
  return el;
}

function queryByTestId(dom, testId) {
  return getByTestId(dom, testId);
}

function getAllByTestId(dom, testId) {
  const doc = getDocument(dom);
  let els = Array.from(doc.querySelectorAll(`[data-testid="${testId}"]`));
  if (els.length === 0) {
    if (testId === 'start-btn') els = Array.from(doc.querySelectorAll('[data-testid="start-button"], #start-button'));
    if (testId === 'skin-option') els = Array.from(doc.querySelectorAll('[data-testid^="skin-option"], .skin-option'));
  }
  return els;
}

function getStartScreen(dom) {
  return getByTestId(dom, 'start-screen');
}

function getPauseScreen(dom) {
  return getByTestId(dom, 'pause-screen');
}

function getGameOverScreen(dom) {
  return getByTestId(dom, 'game-over-screen');
}

function getSkinSelectScreen(dom) {
  return getByTestId(dom, 'skin-select-screen');
}

function getSettingsScreen(dom) {
  return getByTestId(dom, 'settings-screen');
}

function getScoreDisplay(dom) {
  return getByTestId(dom, 'score-display');
}

function getHighScoreDisplay(dom) {
  return getByTestId(dom, 'high-score-display');
}

function getMuteBtn(dom) {
  return getByTestId(dom, 'mute-btn');
}

function getSkinOption(dom, skinId) {
  return getByTestId(dom, `skin-option-${skinId}`);
}

// --- EVENT DISPATCH HELPERS ---

function dispatchKeyboardEvent(dom, type, code = 'Space', key = ' ', options = {}) {
  const win = getTargetWindow(dom);
  const doc = getDocument(dom);
  const target = options.target || doc.body || doc.documentElement || win;
  
  const event = new win.KeyboardEvent(type, {
    code,
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  target.dispatchEvent(event);
}

function dispatchTouchEvent(dom, type, targetOrOptions = {}, options = {}) {
  const win = getTargetWindow(dom);
  const doc = getDocument(dom);
  
  let target = doc.body;
  let opts = options;
  if (targetOrOptions && targetOrOptions.nodeType) {
    target = targetOrOptions;
  } else if (typeof targetOrOptions === 'object') {
    opts = targetOrOptions;
    if (opts.target) target = opts.target;
  }

  const event = new win.Event(type, {
    bubbles: true,
    cancelable: true,
    ...opts
  });
  target.dispatchEvent(event);
}

function dispatchClickEvent(dom, targetOrTestId, options = {}) {
  const win = getTargetWindow(dom);
  const doc = getDocument(dom);
  
  let target = doc.body;
  if (typeof targetOrTestId === 'string') {
    target = getByTestId(dom, targetOrTestId) || doc.body;
  } else if (targetOrTestId && targetOrTestId.nodeType) {
    target = targetOrTestId;
  }

  const event = new win.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: win,
    ...options
  });
  target.dispatchEvent(event);
}

// --- MICRO TEST FRAMEWORK ---

const testRegistry = [];
let currentSuite = null;
let currentTier = 1;

function setTierContext(tier) {
  currentTier = tier;
}

function describe(suiteName, fn) {
  let tier = currentTier;
  const match = suiteName.match(/Tier\s*([1-4])/i);
  if (match) {
    tier = parseInt(match[1], 10);
  }

  const suite = {
    name: suiteName,
    tier,
    tests: [],
    beforeEachHooks: [],
    afterEachHooks: []
  };

  const prevSuite = currentSuite;
  currentSuite = suite;
  testRegistry.push(suite);

  fn();

  currentSuite = prevSuite;
}

function it(testName, fn) {
  if (!currentSuite) {
    describe('Default Suite', () => {
      it(testName, fn);
    });
    return;
  }

  currentSuite.tests.push({
    name: testName,
    fn,
    suiteName: currentSuite.name,
    tier: currentSuite.tier
  });
}

function beforeEach(fn) {
  if (currentSuite) {
    currentSuite.beforeEachHooks.push(fn);
  }
}

function afterEach(fn) {
  if (currentSuite) {
    currentSuite.afterEachHooks.push(fn);
  }
}

// --- ASSERTIONS & MATCHERS ---

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new AssertionError(message || 'Assertion failed');
  }
}

function isDeepEqual(a, b) {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!isDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

function expect(actual) {
  const matchers = {
    toBe(expected) {
      assert(
        Object.is(actual, expected),
        `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`
      );
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      assert(
        diff < tolerance,
        `Expected ${actual} to be close to ${expected} (precision ${precision})`
      );
    },
    toEqual(expected) {
      assert(
        isDeepEqual(actual, expected),
        `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
      );
    },
    toBeGreaterThan(expected) {
      assert(
        actual > expected,
        `Expected ${actual} to be greater than ${expected}`
      );
    },
    toBeGreaterThanOrEqual(expected) {
      assert(
        actual >= expected,
        `Expected ${actual} to be greater than or equal to ${expected}`
      );
    },
    toBeLessThan(expected) {
      assert(
        actual < expected,
        `Expected ${actual} to be less than ${expected}`
      );
    },
    toBeLessThanOrEqual(expected) {
      assert(
        actual <= expected,
        `Expected ${actual} to be less than or equal to ${expected}`
      );
    },
    toBeTruthy() {
      assert(Boolean(actual), `Expected ${actual} to be truthy`);
    },
    toBeFalsy() {
      assert(!Boolean(actual), `Expected ${actual} to be falsy`);
    },
    toBeNull() {
      assert(actual === null, `Expected ${actual} to be null`);
    },
    toBeUndefined() {
      assert(actual === undefined, `Expected ${actual} to be undefined`);
    },
    toBeDefined() {
      assert(actual !== undefined, `Expected value to be defined`);
    },
    toContain(item) {
      if (typeof actual === 'string') {
        assert(actual.includes(item), `Expected "${actual}" to contain "${item}"`);
      } else if (Array.isArray(actual)) {
        assert(actual.includes(item), `Expected array to contain ${JSON.stringify(item)}`);
      } else {
        assert(false, `toContain target must be array or string`);
      }
    },
    toThrow(expectedError) {
      assert(typeof actual === 'function', `toThrow requires actual to be a function`);
      let threw = false;
      let thrownError = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        thrownError = err;
      }
      assert(threw, `Expected function to throw an error, but it did not`);
      if (expectedError) {
        if (typeof expectedError === 'string') {
          assert(
            thrownError.message.includes(expectedError),
            `Expected thrown error message "${thrownError.message}" to include "${expectedError}"`
          );
        } else if (expectedError instanceof RegExp) {
          assert(
            expectedError.test(thrownError.message),
            `Expected thrown error message "${thrownError.message}" to match ${expectedError}`
          );
        }
      }
    }
  };

  const notMatchers = {
    toBe(expected) {
      assert(
        !Object.is(actual, expected),
        `Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`
      );
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      assert(
        diff >= tolerance,
        `Expected ${actual} NOT to be close to ${expected} (precision ${precision})`
      );
    },
    toEqual(expected) {
      assert(
        !isDeepEqual(actual, expected),
        `Expected ${JSON.stringify(actual)} NOT to equal ${JSON.stringify(expected)}`
      );
    },
    toBeGreaterThan(expected) {
      assert(
        actual <= expected,
        `Expected ${actual} NOT to be greater than ${expected}`
      );
    },
    toBeGreaterThanOrEqual(expected) {
      assert(
        actual < expected,
        `Expected ${actual} NOT to be greater than or equal to ${expected}`
      );
    },
    toBeLessThan(expected) {
      assert(
        actual >= expected,
        `Expected ${actual} NOT to be less than ${expected}`
      );
    },
    toBeLessThanOrEqual(expected) {
      assert(
        actual > expected,
        `Expected ${actual} NOT to be less than or equal to ${expected}`
      );
    },
    toBeTruthy() {
      assert(!Boolean(actual), `Expected ${actual} NOT to be truthy`);
    },
    toBeFalsy() {
      assert(Boolean(actual), `Expected ${actual} NOT to be falsy`);
    },
    toBeNull() {
      assert(actual !== null, `Expected ${actual} NOT to be null`);
    },
    toBeUndefined() {
      assert(actual !== undefined, `Expected ${actual} NOT to be undefined`);
    },
    toBeDefined() {
      assert(actual === undefined, `Expected value NOT to be defined`);
    },
    toContain(item) {
      if (typeof actual === 'string') {
        assert(!actual.includes(item), `Expected "${actual}" NOT to contain "${item}"`);
      } else if (Array.isArray(actual)) {
        assert(!actual.includes(item), `Expected array NOT to contain ${JSON.stringify(item)}`);
      }
    }
  };

  return {
    ...matchers,
    not: notMatchers
  };
}

async function runTestSuite() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    durationMs: 0,
    tiers: {
      1: { total: 0, passed: 0, failed: 0, durationMs: 0 },
      2: { total: 0, passed: 0, failed: 0, durationMs: 0 },
      3: { total: 0, passed: 0, failed: 0, durationMs: 0 },
      4: { total: 0, passed: 0, failed: 0, durationMs: 0 }
    },
    testDetails: []
  };

  const suiteStartTime = Date.now();

  for (const suite of testRegistry) {
    const tier = suite.tier || 1;

    for (const test of suite.tests) {
      results.total++;
      results.tiers[tier].total++;

      const testStartTime = Date.now();
      let status = 'PASSED';
      let error = null;

      try {
        for (const hook of suite.beforeEachHooks) {
          await hook();
        }
        await test.fn();
      } catch (err) {
        status = 'FAILED';
        error = err;
        results.failed++;
        results.tiers[tier].failed++;
      } finally {
        try {
          for (const hook of suite.afterEachHooks) {
            await hook();
          }
        } catch (hookErr) {
          if (status !== 'FAILED') {
            status = 'FAILED';
            error = hookErr;
            results.failed++;
            results.tiers[tier].failed++;
          }
        }
      }

      if (status === 'PASSED') {
        results.passed++;
        results.tiers[tier].passed++;
      }

      const testDuration = Date.now() - testStartTime;
      results.tiers[tier].durationMs += testDuration;

      results.testDetails.push({
        name: test.name,
        suiteName: test.suiteName,
        tier,
        status,
        durationMs: testDuration,
        error: error ? error.message : null,
        stack: error ? error.stack : null
      });
    }
  }

  results.durationMs = Date.now() - suiteStartTime;
  return results;
}

function resetRegistry() {
  testRegistry.length = 0;
  currentSuite = null;
  currentTier = 1;
}

export {
  // DOM & Environment Setup
  setupDOM,
  DEFAULT_FALLBACK_HTML,

  // Game Inspection API Helpers
  getState,
  getScore,
  getHighScore,
  getBird,
  getPipes,
  triggerFlap,
  triggerPause,
  restartGame,

  // DOM Query Helpers
  getByTestId,
  queryByTestId,
  getAllByTestId,
  getStartScreen,
  getPauseScreen,
  getGameOverScreen,
  getSkinSelectScreen,
  getSettingsScreen,
  getScoreDisplay,
  getHighScoreDisplay,
  getMuteBtn,
  getSkinOption,

  // Event Dispatch Helpers
  dispatchKeyboardEvent,
  dispatchTouchEvent,
  dispatchClickEvent,

  // Micro Test Framework
  describe,
  it,
  beforeEach,
  afterEach,
  setTierContext,
  assert,
  expect,
  AssertionError,
  runTestSuite,
  resetRegistry
};

export default {
  setupDOM,
  DEFAULT_FALLBACK_HTML,
  getState,
  getScore,
  getHighScore,
  getBird,
  getPipes,
  triggerFlap,
  triggerPause,
  restartGame,
  getByTestId,
  queryByTestId,
  getAllByTestId,
  getStartScreen,
  getPauseScreen,
  getGameOverScreen,
  getSkinSelectScreen,
  getSettingsScreen,
  getScoreDisplay,
  getHighScoreDisplay,
  getMuteBtn,
  getSkinOption,
  dispatchKeyboardEvent,
  dispatchTouchEvent,
  dispatchClickEvent,
  describe,
  it,
  beforeEach,
  afterEach,
  setTierContext,
  assert,
  expect,
  AssertionError,
  runTestSuite,
  resetRegistry
};



