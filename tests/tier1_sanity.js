/**
 * Tier 1 Baseline Sanity Test Suite
 * Path: tests/tier1_sanity.js
 * Validates the core E2E harness, DOM loading, inspection API, event dispatchers, and assertion framework.
 */



import {
  setupDOM,
  describe,
  it,
  expect,
  assert,
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
  dispatchClickEvent
} from './harness.js';


describe('Tier 1 - Baseline Harness Sanity Suite', () => {

  it('Sanity 1: JSDOM environment and DOM loading utility work correctly', () => {
    const { dom, window, document } = setupDOM();
    expect(dom).toBeDefined();
    expect(window).toBeDefined();
    expect(document).toBeDefined();
    expect(document.title).toBe('Flappy Bird Web Game');
  });

  it('Sanity 2: Assertion framework (assert and expect matchers) functions properly', () => {
    assert(1 + 1 === 2, 'Basic addition should hold true');
    expect(42).toBe(42);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect(10).toBeGreaterThan(5);
    expect(5).toBeLessThan(10);
    expect(true).toBeTruthy();
    expect(false).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
    expect([1, 2, 3]).toContain(2);
    expect('flappy').toContain('flap');
    expect(() => { throw new Error('boom'); }).toThrow('boom');
    expect(10).not.toBe(20);
    expect({ a: 1 }).not.toEqual({ a: 2 });
  });

  it('Sanity 3: DOM data-testid query helpers return valid elements', () => {
    const env = setupDOM();
    
    const startScreen = getStartScreen(env);
    expect(startScreen).toBeDefined();
    expect(startScreen).not.toBeNull();

    const pauseScreen = getPauseScreen(env);
    expect(pauseScreen).toBeDefined();
    expect(pauseScreen).not.toBeNull();

    const gameOverScreen = getGameOverScreen(env);
    expect(gameOverScreen).toBeDefined();

    const skinSelectScreen = getSkinSelectScreen(env);
    expect(skinSelectScreen).toBeDefined();

    const settingsScreen = getSettingsScreen(env);
    expect(settingsScreen).toBeDefined();

    const scoreDisplay = getScoreDisplay(env);
    expect(scoreDisplay).toBeDefined();

    const highScoreDisplay = getHighScoreDisplay(env);
    expect(highScoreDisplay).toBeDefined();

    const muteBtn = getMuteBtn(env);
    expect(muteBtn).toBeDefined();

    const classicSkin = getSkinOption(env, 'classic');
    expect(classicSkin).toBeDefined();

    const queryRes = queryByTestId(env, 'non-existent-id');
    expect(queryRes).toBeNull();

    const allButtons = getAllByTestId(env, 'start-btn');
    expect(allButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('Sanity 4: window.__FLAPPY_GAME__ state and inspection helpers work as expected', () => {
    const env = setupDOM();
    
    expect(getState(env)).toBe('START');
    expect(getScore(env)).toBe(0);
    expect(getHighScore(env)).toBe(0);
    
    const bird = getBird(env);
    expect(bird).toBeDefined();
    expect(bird.x).toBeDefined();
    expect(bird.y).toBeDefined();

    const pipes = getPipes(env);
    expect(Array.isArray(pipes)).toBeTruthy();

    triggerFlap(env);
    const birdAfterFlap = getBird(env);
    expect(birdAfterFlap.vy).toBeLessThan(0);

    triggerPause(env);
    restartGame(env);
    expect(getState(env)).toBe('START');
    expect(getScore(env)).toBe(0);
  });

  it('Sanity 5: Keyboard, touch, and mouse click event dispatch helpers dispatch events cleanly', () => {
    const env = setupDOM();
    const { document } = env;

    let keyboardEventFired = false;
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') keyboardEventFired = true;
    });

    dispatchKeyboardEvent(env, 'keydown', 'Space', ' ');
    expect(keyboardEventFired).toBeTruthy();

    let touchEventFired = false;
    document.body.addEventListener('touchstart', () => {
      touchEventFired = true;
    });
    dispatchTouchEvent(env, 'touchstart');
    expect(touchEventFired).toBeTruthy();

    let clickEventFired = false;
    const startBtn = getByTestId(env, 'start-btn');
    startBtn.addEventListener('click', () => {
      clickEventFired = true;
    });
    dispatchClickEvent(env, startBtn);
    expect(clickEventFired).toBeTruthy();
  });

});
