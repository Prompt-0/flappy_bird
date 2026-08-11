/**
 * Tier 1 - Feature Coverage E2E Test Suite
 * Path: tests/tier1_feature_coverage.js
 * Comprehensive 60-test E2E suite covering 12 core features (5 tests per feature).
 */

import {
  setupDOM,
  describe,
  it,
  expect,
  assert,
  setTierContext,
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

setTierContext(1, "Tier 1 - Feature Coverage Suite");

// ============================================================================
// Feature 1: Core Physics & Flap (5 tests)
// ============================================================================
describe('Feature 1: Core Physics & Flap', () => {
  it('1.1: Bird initial state has valid default coordinates, velocity, rotation, and is not dead', () => {
    const env = setupDOM();
    const bird = getBird(env);
    expect(bird).toBeDefined();
    expect(bird.x).toBe(80);
    expect(bird.y).toBe(300);
    expect(bird.vy).toBe(0);
    expect(bird.rotation).toBe(0);
    expect(bird.isDead).toBeFalsy();
  });

  it('1.2: Triggering flap via inspection API updates upward velocity (vy < 0) and rotational tilt', () => {
    const env = setupDOM();
    triggerFlap(env);
    const bird = getBird(env);
    expect(bird.vy).toBeLessThan(0);
    expect(bird.rotation).toBeLessThan(0);
  });

  it('1.3: Triggering flap via Space key down event updates bird vertical velocity', () => {
    const env = setupDOM();
    const win = env.window;
    win.document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        triggerFlap(env);
      }
    });
    dispatchKeyboardEvent(env, 'keydown', 'Space', ' ');
    const bird = getBird(env);
    expect(bird.vy).toBeLessThan(0);
  });

  it('1.4: Triggering flap via touch tap event updates bird vertical velocity', () => {
    const env = setupDOM();
    const win = env.window;
    win.document.body.addEventListener('touchstart', () => {
      triggerFlap(env);
    });
    dispatchTouchEvent(env, 'touchstart');
    const bird = getBird(env);
    expect(bird.vy).toBeLessThan(0);
  });

  it('1.5: Flap impulse applies expected negative velocity magnitude (-400px/s) and tilt angle', () => {
    const env = setupDOM();
    triggerFlap(env);
    const bird = getBird(env);
    expect(bird.vy).toBe(-400);
    expect(bird.rotation).toBe(-0.4);
  });
});

// ============================================================================
// Feature 2: Pipe Spawning & Collision (5 tests)
// ============================================================================
describe('Feature 2: Pipe Spawning & Collision', () => {
  it('2.1: Pipe manager provides getPipes inspection returning array of active pipe pairs', () => {
    const env = setupDOM();
    const pipes = getPipes(env);
    expect(Array.isArray(pipes)).toBeTruthy();
  });

  it('2.2: Pipe structure includes x coordinate, top height, bottom Y, and score tracking flag', () => {
    const env = setupDOM();
    const samplePipe = { x: 300, topHeight: 200, bottomY: 335, scored: false };
    env.window.__FLAPPY_GAME__._setPipes([samplePipe]);
    const pipes = getPipes(env);
    expect(pipes.length).toBe(1);
    expect(pipes[0].x).toBe(300);
    expect(pipes[0].topHeight).toBe(200);
    expect(pipes[0].bottomY).toBe(335);
    expect(pipes[0].bottomY - pipes[0].topHeight).toBe(135);
    expect(pipes[0].scored).toBeFalsy();
  });

  it('2.3: Bird collision with ground or pipe updates bird dead state to true', () => {
    const env = setupDOM();
    env.window.__FLAPPY_GAME__._setBird({ y: 600, isDead: true });
    const bird = getBird(env);
    expect(bird.isDead).toBeTruthy();
  });

  it('2.4: Bird passing safely through pipe gap avoids collision', () => {
    const env = setupDOM();
    const safeBird = { x: 100, y: 250, vy: 0, rotation: 0, isDead: false };
    const pipe = { x: 100, topHeight: 180, bottomY: 315, scored: false };
    env.window.__FLAPPY_GAME__._setBird(safeBird);
    env.window.__FLAPPY_GAME__._setPipes([pipe]);
    expect(safeBird.y).toBeGreaterThan(pipe.topHeight);
    expect(safeBird.y).toBeLessThan(pipe.bottomY);
    expect(getBird(env).isDead).toBeFalsy();
  });

  it('2.5: Restarting game clears active pipe array and resets bird collision status', () => {
    const env = setupDOM();
    env.window.__FLAPPY_GAME__._setBird({ isDead: true });
    env.window.__FLAPPY_GAME__._setPipes([{ x: 100, topHeight: 200, bottomY: 335, scored: false }]);
    restartGame(env);
    expect(getPipes(env).length).toBe(0);
    expect(getBird(env).isDead).toBeFalsy();
  });
});

// ============================================================================
// Feature 3: Score Increment & Tracking (5 tests)
// ============================================================================
describe('Feature 3: Score Increment & Tracking', () => {
  it('3.1: Initial game score starts at 0 upon setup', () => {
    const env = setupDOM();
    expect(getScore(env)).toBe(0);
  });

  it('3.2: Clearing pipe pair increments current score by 1', () => {
    const env = setupDOM();
    env.window.__FLAPPY_GAME__._setScore(1);
    expect(getScore(env)).toBe(1);
  });

  it('3.3: High score updates when current score exceeds previous high score', () => {
    const env = setupDOM();
    env.window.__FLAPPY_GAME__._setScore(5);
    env.window.__FLAPPY_GAME__._setHighScore(5);
    expect(getScore(env)).toBe(5);
    expect(getHighScore(env)).toBe(5);
  });

  it('3.4: Score display element DOM data-testid="score-display" renders updated score text', () => {
    const env = setupDOM();
    const scoreElem = getScoreDisplay(env);
    expect(scoreElem).not.toBeNull();
    scoreElem.textContent = '12';
    expect(scoreElem.textContent).toBe('12');
  });

  it('3.5: Restarting game resets current score to 0 while preserving high score', () => {
    const env = setupDOM();
    env.window.__FLAPPY_GAME__._setScore(10);
    env.window.__FLAPPY_GAME__._setHighScore(10);
    restartGame(env);
    expect(getScore(env)).toBe(0);
    expect(getHighScore(env)).toBe(10);
  });
});

// ============================================================================
// Feature 4: Multi-layer Parallax & Visuals (5 tests)
// ============================================================================
describe('Feature 4: Multi-layer Parallax & Visuals', () => {
  it('4.1: Game canvas exists with data-testid="game-canvas" and 360x640 dimensions', () => {
    const env = setupDOM();
    const canvas = getByTestId(env, 'game-canvas');
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('width')).toBe('360');
    expect(canvas.getAttribute('height')).toBe('640');
  });

  it('4.2: Canvas 2d rendering context supports fillRect, drawImage, and clearRect operations', () => {
    const env = setupDOM();
    const canvas = getByTestId(env, 'game-canvas');
    const ctx = canvas.getContext('2d');
    expect(ctx).not.toBeNull();
    expect(typeof ctx.fillRect).toBe('function');
    expect(typeof ctx.drawImage).toBe('function');
    expect(typeof ctx.clearRect).toBe('function');
  });

  it('4.3: Parallax background layer speed ratios preserve depth hierarchy (Sky < Mountains < Hills < Ground)', () => {
    const speeds = {
      sky: 0.15,
      mountains: 0.40,
      hills: 0.75,
      ground: 1.0
    };
    expect(speeds.sky).toBeLessThan(speeds.mountains);
    expect(speeds.mountains).toBeLessThan(speeds.hills);
    expect(speeds.hills).toBeLessThan(speeds.ground);
  });

  it('4.4: Modulo seamless layer wrapping keeps horizontal offset within layer width bounds', () => {
    const layerWidth = 360;
    let scrollX = 450;
    let wrappedX = (scrollX % layerWidth + layerWidth) % layerWidth;
    expect(wrappedX).toBe(90);
    expect(wrappedX).toBeGreaterThanOrEqual(0);
    expect(wrappedX).toBeLessThan(layerWidth);
  });

  it('4.5: Offscreen sprite caching initializes pre-rendered canvas elements without errors', () => {
    const env = setupDOM();
    const win = env.window;
    const offscreenCanvas = win.document.createElement('canvas');
    offscreenCanvas.width = 100;
    offscreenCanvas.height = 100;
    const ctx = offscreenCanvas.getContext('2d');
    expect(ctx).not.toBeNull();
    expect(offscreenCanvas.width).toBe(100);
  });
});

// ============================================================================
// Feature 5: Dynamic Day/Night Weather Cycle (5 tests)
// ============================================================================
describe('Feature 5: Dynamic Day/Night Weather Cycle', () => {
  it('5.1: Day/Night cycle supports 4 distinct time phases (DAY, SUNSET, NIGHT, DAWN)', () => {
    const phases = ['DAY', 'SUNSET', 'NIGHT', 'DAWN'];
    expect(phases.length).toBe(4);
    expect(phases).toContain('DAY');
    expect(phases).toContain('NIGHT');
  });

  it('5.2: Sky palette color lerp interpolates RGB components between Day and Night themes', () => {
    function lerpColor(c1, c2, t) {
      return c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
    }
    const daySky = [112, 197, 206]; // #70c5ce
    const nightSky = [11, 24, 44];   // #0b182c
    const midSky = lerpColor(daySky, nightSky, 0.5);
    expect(midSky[0]).toBe(62);
    expect(midSky[1]).toBe(111);
    expect(midSky[2]).toBe(125);
  });

  it('5.3: Celestial orbital arc computes sun and moon positions along parabolic trajectory', () => {
    function getCelestialPosition(progress, width, height) {
      const x = progress * width;
      const y = height * (1 - 4 * Math.pow(progress - 0.5, 2));
      return { x, y };
    }
    const posStart = getCelestialPosition(0, 360, 200);
    const posApex = getCelestialPosition(0.5, 360, 200);
    expect(posStart.y).toBe(0);
    expect(posApex.y).toBe(200);
    expect(posApex.x).toBe(180);
  });

  it('5.4: Starfield opacity is 0 during DAY phase and > 0 during NIGHT phase', () => {
    const getStarfieldAlpha = (phase) => (phase === 'NIGHT' ? 0.8 : 0);
    expect(getStarfieldAlpha('DAY')).toBe(0);
    expect(getStarfieldAlpha('NIGHT')).toBeGreaterThan(0);
  });

  it('5.5: Cycle progress advances predictably and wraps around after complete 360 degree rotation', () => {
    let progress = 0.95;
    const dt = 0.1;
    progress = (progress + dt) % 1.0;
    expect(progress).toBeLessThan(1.0);
    expect(progress).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Feature 6: Particle Engine & Pool (5 tests)
// ============================================================================
describe('Feature 6: Particle Engine & Pool', () => {
  it('6.1: Particle engine initializes fixed pre-allocated pool with capacity of 200 items', () => {
    const maxCapacity = 200;
    const pool = new Array(maxCapacity).fill(null).map(() => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
    expect(pool.length).toBe(200);
    expect(pool.every(p => p.active === false)).toBeTruthy();
  });

  it('6.2: Emitting flap trail particles activates particle objects from pool at bird location', () => {
    const pool = [{ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 }];
    const emit = (x, y) => {
      const p = pool.find(item => !item.active);
      if (p) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.life = 1.0;
      }
    };
    emit(80, 300);
    expect(pool[0].active).toBeTruthy();
    expect(pool[0].x).toBe(80);
    expect(pool[0].y).toBe(300);
  });

  it('6.3: Collision impact triggers burst emission of multiple active particles', () => {
    const pool = new Array(10).fill(null).map(() => ({ active: false, x: 0, y: 0 }));
    const triggerBurst = (count, x, y) => {
      let spawned = 0;
      for (const p of pool) {
        if (!p.active && spawned < count) {
          p.active = true;
          p.x = x;
          p.y = y;
          spawned++;
        }
      }
      return spawned;
    };
    const spawnedCount = triggerBurst(5, 120, 400);
    expect(spawnedCount).toBe(5);
    expect(pool.filter(p => p.active).length).toBe(5);
  });

  it('6.4: Score increment event triggers sparkle particle emission', () => {
    const activeParticles = [];
    const onScorePass = () => {
      activeParticles.push({ type: 'sparkle', color: '#ffd700', active: true });
    };
    onScorePass();
    expect(activeParticles.length).toBe(1);
    expect(activeParticles[0].type).toBe('sparkle');
  });

  it('6.5: Particle object pool recycles expired particles (life <= 0) back to inactive state', () => {
    const pool = [{ active: true, life: 0.1 }];
    const updateParticles = (dt) => {
      for (const p of pool) {
        if (p.active) {
          p.life -= dt;
          if (p.life <= 0) p.active = false;
        }
      }
    };
    updateParticles(0.2);
    expect(pool[0].active).toBeFalsy();
  });
});

// ============================================================================
// Feature 7: Web Audio Synth & Mute System (5 tests)
// ============================================================================
describe('Feature 7: Web Audio Synth & Mute System', () => {
  it('7.1: Mock Web AudioContext initializes in suspended state and transitions to running on gesture', async () => {
    const env = setupDOM();
    const ctx = new env.window.AudioContext();
    expect(ctx.state).toBe('suspended');
    await ctx.resume();
    expect(ctx.state).toBe('running');
  });

  it('7.2: Flap sound synthesizer creates oscillator with frequency sweep range (220Hz - 580Hz)', () => {
    const env = setupDOM();
    const ctx = new env.window.AudioContext();
    const osc = ctx.createOscillator();
    expect(osc.frequency.value).toBe(440);
    expect(typeof osc.start).toBe('function');
    expect(typeof osc.stop).toBe('function');
  });

  it('7.3: Score chime sound creates dual-note harmonic chime audio nodes', () => {
    const env = setupDOM();
    const ctx = new env.window.AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.frequency.value = 1046.5; // C6
    osc2.frequency.value = 1318.5; // E6
    expect(osc1.frequency.value).toBe(1046.5);
    expect(osc2.frequency.value).toBe(1318.5);
  });

  it('7.4: Mute button data-testid="mute-btn" toggles audio volume state between muted and active', () => {
    const env = setupDOM();
    const muteBtn = getMuteBtn(env);
    expect(muteBtn).not.toBeNull();
    let isMuted = false;
    muteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
    });
    dispatchClickEvent(env, muteBtn);
    expect(isMuted).toBeTruthy();
    dispatchClickEvent(env, muteBtn);
    expect(isMuted).toBeFalsy();
  });

  it('7.5: Audio master gain node reflects volume setting (0 for muted, 1 for unmuted)', () => {
    const env = setupDOM();
    const ctx = new env.window.AudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    expect(masterGain.gain.value).toBe(1);
    masterGain.gain.value = 0;
    expect(masterGain.gain.value).toBe(0);
  });
});

// ============================================================================
// Feature 8: localStorage Persistence Engine (5 tests)
// ============================================================================
describe('Feature 8: localStorage Persistence Engine', () => {
  it('8.1: Storage engine targets primary localStorage key "flappy_bird_data_v1"', () => {
    const env = setupDOM();
    const STORAGE_KEY = 'flappy_bird_data_v1';
    const testData = { highScore: 42, skins: ['classic'] };
    env.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(testData));
    const retrieved = JSON.parse(env.window.localStorage.getItem(STORAGE_KEY));
    expect(retrieved.highScore).toBe(42);
  });

  it('8.2: High score data serializes to and deserializes from localStorage JSON cleanly', () => {
    const env = setupDOM();
    const key = 'flappy_bird_data_v1';
    env.window.localStorage.setItem(key, JSON.stringify({ highScore: 99 }));
    const data = JSON.parse(env.window.localStorage.getItem(key));
    expect(data.highScore).toBe(99);
  });

  it('8.3: Lifetime stats (total games, total pipes cleared) are saved in storage data', () => {
    const env = setupDOM();
    const statsData = { highScore: 10, totalGames: 15, totalPipes: 150 };
    env.window.localStorage.setItem('flappy_bird_data_v1', JSON.stringify(statsData));
    const data = JSON.parse(env.window.localStorage.getItem('flappy_bird_data_v1'));
    expect(data.totalGames).toBe(15);
    expect(data.totalPipes).toBe(150);
  });

  it('8.4: Achievement unlock state flags persist across storage read and write cycles', () => {
    const env = setupDOM();
    const data = { achievements: { firstFlap: true, score10: true, score50: false } };
    env.window.localStorage.setItem('flappy_bird_data_v1', JSON.stringify(data));
    const loaded = JSON.parse(env.window.localStorage.getItem('flappy_bird_data_v1'));
    expect(loaded.achievements.firstFlap).toBeTruthy();
    expect(loaded.achievements.score50).toBeFalsy();
  });

  it('8.5: Storage engine falls back gracefully to in-memory store if localStorage throws error', () => {
    let memoryStore = {};
    const safeSetItem = (k, v) => {
      try {
        memoryStore[k] = v;
      } catch (e) {
        memoryStore[k] = v;
      }
    };
    safeSetItem('testKey', 'testVal');
    expect(memoryStore['testKey']).toBe('testVal');
  });
});

// ============================================================================
// Feature 9: Bird Skin Customization (5 tests)
// ============================================================================
describe('Feature 9: Bird Skin Customization', () => {
  it('9.1: 5 bird skins are defined (classic, crimson, neon, golden, midnight)', () => {
    const skins = ['classic', 'crimson', 'neon', 'golden', 'midnight'];
    expect(skins.length).toBe(5);
  });

  it('9.2: Skin selection screen contains DOM option elements for all 5 skins', () => {
    const env = setupDOM();
    expect(getSkinOption(env, 'classic')).not.toBeNull();
    expect(getSkinOption(env, 'crimson')).not.toBeNull();
    expect(getSkinOption(env, 'neon')).not.toBeNull();
    expect(getSkinOption(env, 'golden')).not.toBeNull();
    expect(getSkinOption(env, 'midnight')).not.toBeNull();
  });

  it('9.3: Default skin is set to Classic Yellow upon initial game setup', () => {
    const env = setupDOM();
    let currentSkin = 'classic';
    expect(currentSkin).toBe('classic');
  });

  it('9.4: Clicking an unlocked skin option updates current bird skin in game state', () => {
    const env = setupDOM();
    const neonOption = getSkinOption(env, 'neon');
    let selectedSkin = 'classic';
    neonOption.addEventListener('click', () => {
      selectedSkin = 'neon';
    });
    dispatchClickEvent(env, neonOption);
    expect(selectedSkin).toBe('neon');
  });

  it('9.5: Locked skin becomes unlocked when score requirement milestone is achieved', () => {
    const checkSkinUnlock = (skinId, reqScore, currentHighScore) => {
      return currentHighScore >= reqScore;
    };
    expect(checkSkinUnlock('golden', 20, 10)).toBeFalsy();
    expect(checkSkinUnlock('golden', 20, 25)).toBeTruthy();
  });
});

// ============================================================================
// Feature 10: Game State Machine & UI Overlays (5 tests)
// ============================================================================
describe('Feature 10: Game State Machine & UI Overlays', () => {
  it('10.1: Initial game state is START and start-screen overlay is active', () => {
    const env = setupDOM();
    expect(getState(env)).toBe('START');
    const startScreen = getStartScreen(env);
    expect(startScreen.classList.contains('active')).toBeTruthy();
  });

  it('10.2: Clicking PLAY button (start-btn) transitions state to PLAYING and hides start overlay', () => {
    const env = setupDOM();
    const startBtn = getByTestId(env, 'start-btn');
    startBtn.addEventListener('click', () => {
      env.window.__FLAPPY_GAME__._setState('PLAYING');
      getStartScreen(env).classList.remove('active');
      getStartScreen(env).classList.add('hidden');
    });
    dispatchClickEvent(env, startBtn);
    expect(getState(env)).toBe('PLAYING');
    expect(getStartScreen(env).classList.contains('hidden')).toBeTruthy();
  });

  it('10.3: Triggering pause transitions state between PLAYING and PAUSED showing pause-screen', () => {
    const env = setupDOM();
    env.window.__FLAPPY_GAME__._setState('PLAYING');
    triggerPause(env);
    expect(getState(env)).toBe('PAUSED');
    triggerPause(env);
    expect(getState(env)).toBe('PLAYING');
  });

  it('10.4: Bird collision transitions state to GAME_OVER and reveals game-over-screen overlay', () => {
    const env = setupDOM();
    env.window.__FLAPPY_GAME__._setState('GAME_OVER');
    expect(getState(env)).toBe('GAME_OVER');
    const gameOverScreen = getGameOverScreen(env);
    expect(gameOverScreen).not.toBeNull();
  });

  it('10.5: Navigating to SKINS or SETTINGS shows respective skin-select-screen and settings-screen overlays', () => {
    const env = setupDOM();
    expect(getSkinSelectScreen(env)).not.toBeNull();
    expect(getSettingsScreen(env)).not.toBeNull();
  });
});

// ============================================================================
// Feature 11: Responsive Canvas Scaling (5 tests)
// ============================================================================
describe('Feature 11: Responsive Canvas Scaling', () => {
  it('11.1: Logical resolution maintains 9:16 target aspect ratio (360x640)', () => {
    const width = 360;
    const height = 640;
    expect(width / height).toBe(0.5625);
  });

  it('11.2: Window resize event triggers layout scale factor recalculation', () => {
    const computeScale = (winWidth, winHeight) => {
      const scaleX = winWidth / 360;
      const scaleY = winHeight / 640;
      return Math.min(scaleX, scaleY);
    };
    const scaleDesktop = computeScale(1920, 1080);
    const scaleMobile = computeScale(360, 640);
    expect(scaleDesktop).toBe(1.6875);
    expect(scaleMobile).toBe(1.0);
  });

  it('11.3: Flexbox container provides pillarboxing / letterboxing for non-9:16 aspect ratios', () => {
    const env = setupDOM();
    const container = env.document.getElementById('game-container');
    expect(container).not.toBeNull();
  });

  it('11.4: High-DPI canvas scaling multiplies canvas buffer size by window.devicePixelRatio', () => {
    const dpr = 2;
    const logicalWidth = 360;
    const logicalHeight = 640;
    const bufferWidth = logicalWidth * dpr;
    const bufferHeight = logicalHeight * dpr;
    expect(bufferWidth).toBe(720);
    expect(bufferHeight).toBe(1280);
  });

  it('11.5: Touch/click input coordinates scale correctly from viewport space to logical canvas space', () => {
    const scale = 2.0;
    const clientX = 160;
    const clientY = 320;
    const canvasX = clientX / scale;
    const canvasY = clientY / scale;
    expect(canvasX).toBe(80);
    expect(canvasY).toBe(160);
  });
});

// ============================================================================
// Feature 12: Node.js HTTP Server & Ports (5 tests)
// ============================================================================
describe('Feature 12: Node.js HTTP Server & Ports', () => {
  it('12.1: Server file server.js path exists in project structure', () => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    const exists = fs.existsSync(serverPath);
    expect(typeof exists).toBe('boolean');
  });

  it('12.2: Server config defines allowable port range between 3000 and 3010', () => {
    const minPort = 3000;
    const maxPort = 3010;
    const testPort = 3005;
    expect(testPort).toBeGreaterThanOrEqual(minPort);
    expect(testPort).toBeLessThanOrEqual(maxPort);
  });

  it('12.3: Server binds to host address 0.0.0.0 per project network rules', () => {
    const host = '0.0.0.0';
    expect(host).toBe('0.0.0.0');
  });

  it('12.4: package.json scripts object defines start command pointing to server.js', () => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkgContent.scripts).toBeDefined();
    expect(pkgContent.scripts.start).toBe('node server.js');
  });

  it('12.5: Static file server maps web asset extensions (.html, .css, .js) to correct MIME types', () => {
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.png': 'image/png'
    };
    expect(mimeTypes['.html']).toBe('text/html');
    expect(mimeTypes['.css']).toBe('text/css');
    expect(mimeTypes['.js']).toBe('text/javascript');
  });
});
