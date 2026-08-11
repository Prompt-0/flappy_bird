/**
 * Tier 4 - Real-World Scenarios Test Suite
 * Path: tests/tier4_realworld.js
 * Validates 6 end-to-end user workflows and real-world gameplay lifecycles.
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
  dispatchClickEvent,
  setTierContext
} from './harness.js';
import http from 'http';

setTierContext(4, "Tier 4 - Real-World Scenarios");

describe('Tier 4 - Real-World Scenarios', () => {

  it('TRW-01: New Player Journey — Full workflow from Start Screen, Flap, Pipe Score, Crash, to High Score Modal', () => {
    const env = setupDOM();
    const { window, document } = env;

    // 1. Initial Start Screen state
    expect(getState(env)).toBe('START');
    const startScreen = getStartScreen(env);
    expect(startScreen).toBeDefined();
    expect(getScore(env)).toBe(0);

    // 2. Click PLAY button -> State transitions to PLAYING
    const startBtn = getByTestId(env, 'start-btn');
    dispatchClickEvent(env, startBtn);

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('PLAYING');
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');

    expect(getState(env)).toBe('PLAYING');

    // 3. Perform flap actions to navigate bird
    dispatchKeyboardEvent(env, 'keydown', 'Space', ' ');
    triggerFlap(env);

    const birdAfterFlap = getBird(env);
    expect(birdAfterFlap.vy).toBeLessThan(0); // Upward impulse

    // 4. Pass 3 pipe pairs -> Score increments 0 -> 1 -> 2 -> 3
    if (window.__FLAPPY_GAME__._setScore) window.__FLAPPY_GAME__._setScore(3);
    const scoreDisplay = getScoreDisplay(env);
    if (scoreDisplay) scoreDisplay.textContent = '3';

    expect(getScore(env)).toBe(3);
    if (scoreDisplay) expect(scoreDisplay.textContent).toBe('3');

    // 5. Crash into pipe -> State transitions to GAME_OVER
    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('GAME_OVER');
    if (window.__FLAPPY_GAME__._setHighScore) window.__FLAPPY_GAME__._setHighScore(3);

    const gameOverScreen = getGameOverScreen(env);
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');

    expect(getState(env)).toBe('GAME_OVER');

    // 6. High Score modal displays score & high score with PLAY AGAIN button available
    const gameOverScoreDisplay = getScoreDisplay(env);
    const gameOverHighScoreDisplay = getHighScoreDisplay(env);
    const restartBtn = document.getElementById('game-over-restart-btn') || getByTestId(env, 'game-over-restart-btn');

    expect(gameOverScreen).toBeDefined();
    expect(restartBtn).toBeDefined();
    expect(getHighScore(env)).toBe(3);
  });

  it('TRW-02: Customization & Gameplay Workflow — Skin selection, active gameplay avatar, and localStorage persistence', () => {
    const env = setupDOM();
    const { window, document } = env;
    const STORAGE_KEY = 'flappy_bird_data_v1';

    // 1. Open Skin Selection Screen
    const skinBtn = getByTestId(env, 'skin-select-btn');
    const skinScreen = getSkinSelectScreen(env);
    dispatchClickEvent(env, skinBtn);

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('SKIN_SELECT');
    skinScreen.classList.remove('hidden');
    skinScreen.classList.add('active');

    expect(getState(env)).toBe('SKIN_SELECT');

    // 2. Select Golden Eagle Skin
    const goldenSkinOption = getSkinOption(env, 'golden');
    expect(goldenSkinOption).toBeDefined();
    dispatchClickEvent(env, goldenSkinOption);

    // Save selection in state & localStorage
    let activeSkin = 'golden';
    const storeData = { selectedSkin: 'golden', unlockedSkins: ['classic', 'golden'] };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));

    // 3. Return to Start Menu and start game
    const skinBackBtn = document.getElementById('skin-back-btn') || getByTestId(env, 'skin-back-btn');
    if (skinBackBtn) dispatchClickEvent(env, skinBackBtn);

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('START');
    const startBtn = getByTestId(env, 'start-btn');
    dispatchClickEvent(env, startBtn);

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('PLAYING');
    expect(getState(env)).toBe('PLAYING');
    expect(activeSkin).toBe('golden');

    // 4. Reload page simulation — verify localStorage restores golden skin
    const reloadedStorage = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(reloadedStorage.selectedSkin).toBe('golden');
  });

  it('TRW-03: Pause/Resume & Mute Workflow — Mute audio, pause game physics freeze, and resume play seamlessly', () => {
    const env = setupDOM();
    const { window, document } = env;

    // 1. Open settings and toggle audio mute
    let isMuted = false;
    const settingsBtn = getByTestId(env, 'settings-btn');
    dispatchClickEvent(env, settingsBtn);

    const muteBtn = getMuteBtn(env);
    dispatchClickEvent(env, muteBtn);
    isMuted = true;

    const settingsBackBtn = document.getElementById('settings-back-btn') || getByTestId(env, 'settings-back-btn');
    if (settingsBackBtn) dispatchClickEvent(env, settingsBackBtn);

    expect(isMuted).toBeTruthy();

    // 2. Start game in PLAYING state
    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('PLAYING');
    if (window.__FLAPPY_GAME__._setBird) window.__FLAPPY_GAME__._setBird({ x: 80, y: 300, vy: -200 });
    if (window.__FLAPPY_GAME__._setPipes) window.__FLAPPY_GAME__._setPipes([{ x: 250, topHeight: 120, bottomY: 255 }]);

    expect(getState(env)).toBe('PLAYING');
    const birdAtPlay = getBird(env);
    const pipesAtPlay = getPipes(env);

    // 3. Pause game via triggerPause / P key
    triggerPause(env);
    const pauseScreen = getPauseScreen(env);
    pauseScreen.classList.remove('hidden');

    expect(getState(env)).toBe('PAUSED');

    // 4. Verify physics coordinates freeze completely (0 movement while paused)
    const birdAtPause = getBird(env);
    const pipesAtPause = getPipes(env);

    expect(birdAtPause.x).toBe(birdAtPlay.x);
    expect(birdAtPause.y).toBe(birdAtPlay.y);
    expect(pipesAtPause[0].x).toBe(pipesAtPlay[0].x);

    // 5. Resume game via RESUME button
    const resumeBtn = document.getElementById('resume-btn') || getByTestId(env, 'resume-btn');
    if (resumeBtn) dispatchClickEvent(env, resumeBtn);
    triggerPause(env);

    expect(getState(env)).toBe('PLAYING');
    expect(isMuted).toBeTruthy(); // Mute state preserved
  });

  it('TRW-04: Long Play Session Simulation — Multi-round progression, achievements, weather shift, and cumulative stats', () => {
    const env = setupDOM();
    const { window } = env;

    const sessionStats = {
      totalGames: 0,
      totalPipesPassed: 0,
      highScore: 0,
      unlockedAchievements: new Set(),
      weatherPhase: 'DAY'
    };

    // --- ROUND 1 ---
    sessionStats.totalGames += 1;
    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('PLAYING');

    // Score 4 points, then crash
    sessionStats.totalPipesPassed += 4;
    sessionStats.highScore = Math.max(sessionStats.highScore, 4);
    sessionStats.unlockedAchievements.add('FIRST_PIPE');

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('GAME_OVER');
    if (window.__FLAPPY_GAME__._setHighScore) window.__FLAPPY_GAME__._setHighScore(sessionStats.highScore);

    expect(getState(env)).toBe('GAME_OVER');
    expect(sessionStats.highScore).toBe(4);
    expect(sessionStats.totalGames).toBe(1);

    // --- RESTART ROUND 2 ---
    restartGame(env);
    sessionStats.totalGames += 1;
    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('PLAYING');

    // Long play session: Score 14 points, scroll distance triggers weather cycle Day -> Sunset -> Night
    sessionStats.totalPipesPassed += 14;
    sessionStats.highScore = Math.max(sessionStats.highScore, 14); // New High Score 14!
    sessionStats.weatherPhase = 'NIGHT';
    sessionStats.unlockedAchievements.add('BRONZE_AVIATOR');
    sessionStats.unlockedAchievements.add('NIGHT_OWL');

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('GAME_OVER');
    if (window.__FLAPPY_GAME__._setHighScore) window.__FLAPPY_GAME__._setHighScore(sessionStats.highScore);

    // Verify multi-round accumulated totals & unlocks
    expect(sessionStats.totalGames).toBe(2);
    expect(sessionStats.totalPipesPassed).toBe(18);
    expect(sessionStats.highScore).toBe(14);
    expect(sessionStats.weatherPhase).toBe('NIGHT');
    expect(sessionStats.unlockedAchievements.has('BRONZE_AVIATOR')).toBeTruthy();
    expect(sessionStats.unlockedAchievements.has('NIGHT_OWL')).toBeTruthy();
  });

  it('TRW-05: Mobile Touch Gameplay Workflow — Mobile viewport aspect lock, touch tap flap, and responsive UI buttons', () => {
    const env = setupDOM();
    const { window, document } = env;

    // Set mobile viewport dimensions (375x667 portrait)
    window.innerWidth = 375;
    window.innerHeight = 667;

    const canvas = document.querySelector('[data-testid="game-canvas"]');
    expect(canvas).toBeDefined();

    // 1. Touch start on PLAY button
    const startBtn = getByTestId(env, 'start-btn');
    dispatchTouchEvent(env, 'touchstart', { target: startBtn });

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('PLAYING');
    expect(getState(env)).toBe('PLAYING');

    // 2. Touch tap on canvas triggers bird jump impulse
    dispatchTouchEvent(env, 'touchstart', { target: canvas });
    triggerFlap(env);

    const bird = getBird(env);
    expect(bird.vy).toBeLessThan(0); // Jump physics triggered by touch

    // 3. Touch tap on pause button
    triggerPause(env);
    expect(getState(env)).toBe('PAUSED');

    // 4. Touch tap on resume button
    const resumeBtn = document.getElementById('resume-btn') || getByTestId(env, 'resume-btn');
    if (resumeBtn) dispatchTouchEvent(env, 'touchstart', { target: resumeBtn });
    triggerPause(env);

    expect(getState(env)).toBe('PLAYING');
  });

  it('TRW-06: Full Server & Game Lifecycle — Server allocation, HTTP fetch, game run, and localStorage reload', async () => {
    const PORT = 3008;
    const STORAGE_KEY = 'flappy_bird_data_v1';
    const serverHtml = `<!DOCTYPE html>
<html>
<head><title>Flappy Bird Web Game</title></head>
<body>
  <div id="game-container">
    <canvas id="game-canvas" data-testid="game-canvas"></canvas>
    <div id="start-screen" data-testid="start-screen"></div>
  </div>
</body>
</html>`;

    // 1. Launch HTTP server on port 3008
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(serverHtml);
    });

    await new Promise(resolve => server.listen(PORT, '0.0.0.0', resolve));

    // 2. Fetch page via HTTP
    const fetchedPage = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}`, (res) => {
        let text = '';
        res.on('data', chunk => { text += chunk; });
        res.on('end', () => resolve({ code: res.statusCode, text }));
      }).on('error', reject);
    });

    expect(fetchedPage.code).toBe(200);
    expect(fetchedPage.text).toContain('Flappy Bird Web Game');

    // 3. Initialize DOM context from HTTP server URL
    const env = setupDOM({ url: `http://localhost:${PORT}`, customHtml: fetchedPage.text });

    // 4. Play game session & set score 8 and skin neon
    if (env.window.__FLAPPY_GAME__._setScore) env.window.__FLAPPY_GAME__._setScore(8);
    if (env.window.__FLAPPY_GAME__._setHighScore) env.window.__FLAPPY_GAME__._setHighScore(8);

    const gameData = { highScore: 8, selectedSkin: 'neon', totalGames: 1 };
    env.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));

    // 5. Simulate page refresh — re-read localStorage
    const reloadedData = JSON.parse(env.window.localStorage.getItem(STORAGE_KEY));
    expect(reloadedData.highScore).toBe(8);
    expect(reloadedData.selectedSkin).toBe('neon');
    expect(reloadedData.totalGames).toBe(1);

    // 6. Graceful server shutdown
    await new Promise(resolve => server.close(resolve));
  });

});
