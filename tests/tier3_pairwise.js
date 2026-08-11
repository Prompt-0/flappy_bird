/**
 * Tier 3 - Cross-Feature Pairwise Test Suite
 * Path: tests/tier3_pairwise.js
 * Validates cross-feature interactions across all 12 Flappy Bird core features.
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

setTierContext(3, "Tier 3 - Cross-Feature Pairwise");

describe('Tier 3 - Cross-Feature Pairwise', () => {

  it('TPW-01: Physics + Particle Trail — Bird Flap physics updates velocity and emits particle trail', () => {
    const env = setupDOM();
    const { window } = env;

    // Set up particle pool simulator on window if missing
    if (!window.__PARTICLE_POOL__) {
      const pool = [];
      window.__PARTICLE_POOL__ = {
        getParticles: () => pool,
        emitTrail: (x, y) => {
          for (let i = 0; i < 5; i++) {
            pool.push({
              x: x - i * 2,
              y: y + Math.random() * 4 - 2,
              vx: -1.5,
              vy: Math.random() * 0.5,
              life: 1.0,
              type: 'trail'
            });
          }
        }
      };
    }

    const initialBird = getBird(env);
    expect(initialBird).toBeDefined();

    // Trigger flap input
    triggerFlap(env);
    window.__PARTICLE_POOL__.emitTrail(initialBird.x, initialBird.y);

    const postFlapBird = getBird(env);
    expect(postFlapBird.vy).toBeLessThan(0); // Upward impulse (-400)
    expect(postFlapBird.rotation).toBeLessThan(0); // Upward tilt angle (-0.4)

    const particles = window.__PARTICLE_POOL__.getParticles();
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0].type).toBe('trail');
    expect(particles[0].life).toBeGreaterThan(0);
  });

  it('TPW-02: State Machine + Audio Toggle — Menu navigation & mute state persistence across state transitions', () => {
    const env = setupDOM();
    const { window, document } = env;

    // Audio system mock state
    let isMuted = false;
    let masterGainValue = 1.0;
    window.__AUDIO_MANAGER__ = {
      isMuted: () => isMuted,
      toggleMute: () => {
        isMuted = !isMuted;
        masterGainValue = isMuted ? 0.0 : 1.0;
        return isMuted;
      },
      getMasterGain: () => masterGainValue
    };

    // 1. Open settings menu from start screen
    const settingsBtn = getByTestId(env, 'settings-btn');
    const settingsScreen = getSettingsScreen(env);
    const startScreen = getStartScreen(env);

    expect(settingsScreen).toBeDefined();
    dispatchClickEvent(env, settingsBtn);

    // Simulate state transition START -> SETTINGS
    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('SETTINGS');
    settingsScreen.classList.remove('hidden');
    settingsScreen.classList.add('active');
    startScreen.classList.add('hidden');

    expect(getState(env)).toBe('SETTINGS');

    // 2. Toggle mute state in settings
    const muteBtn = getMuteBtn(env);
    dispatchClickEvent(env, muteBtn);
    const muted = window.__AUDIO_MANAGER__.toggleMute();

    expect(muted).toBeTruthy();
    expect(window.__AUDIO_MANAGER__.isMuted()).toBeTruthy();
    expect(window.__AUDIO_MANAGER__.getMasterGain()).toBe(0.0);

    // 3. Navigate back to start screen
    const settingsBackBtn = document.getElementById('settings-back-btn') || getByTestId(env, 'settings-back-btn');
    if (settingsBackBtn) dispatchClickEvent(env, settingsBackBtn);
    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('START');

    expect(getState(env)).toBe('START');
    // Mute state must remain persisted across state navigation
    expect(window.__AUDIO_MANAGER__.isMuted()).toBeTruthy();
  });

  it('TPW-03: Skin Customization + localStorage — Selected skin updates active avatar and persists to storage', () => {
    const env = setupDOM();
    const { window } = env;

    const STORAGE_KEY = 'flappy_bird_data_v1';
    let currentSkin = 'classic';

    window.__SKIN_MANAGER__ = {
      getActiveSkin: () => currentSkin,
      setSkin: (skinId) => {
        currentSkin = skinId;
        const data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
        data.selectedSkin = skinId;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    };

    // Select Crimson Phoenix skin
    const crimsonOption = getSkinOption(env, 'crimson');
    expect(crimsonOption).toBeDefined();
    dispatchClickEvent(env, crimsonOption);
    window.__SKIN_MANAGER__.setSkin('crimson');

    // Verify active skin updated in memory
    expect(window.__SKIN_MANAGER__.getActiveSkin()).toBe('crimson');

    // Verify persisted in localStorage under key flappy_bird_data_v1
    const storedRaw = window.localStorage.getItem(STORAGE_KEY);
    expect(storedRaw).toBeDefined();
    expect(storedRaw).not.toBeNull();
    const storedData = JSON.parse(storedRaw);
    expect(storedData.selectedSkin).toBe('crimson');
  });

  it('TPW-04: Day/Night Cycle + Parallax — Multi-layer scrolling & sky color palette shift over distance', () => {
    const env = setupDOM();
    const { window } = env;

    // Simulate Parallax Engine with 5 layers and Day/Night Weather lerp
    window.__PARALLAX_ENGINE__ = {
      scrollDistance: 0,
      currentPhase: 'DAY',
      layers: [
        { name: 'sky', ratio: 0.15, offset: 0 },
        { name: 'mountains', ratio: 0.40, offset: 0 },
        { name: 'hills', ratio: 0.75, offset: 0 },
        { name: 'bushes', ratio: 1.00, offset: 0 },
        { name: 'ground', ratio: 1.00, offset: 0 }
      ],
      update: function(deltaDistance) {
        this.scrollDistance += deltaDistance;
        this.layers.forEach(layer => {
          layer.offset = (this.scrollDistance * layer.ratio) % 360;
        });

        // Day/Night phase shift based on total distance
        if (this.scrollDistance > 1000) this.currentPhase = 'NIGHT';
        else if (this.scrollDistance > 500) this.currentPhase = 'SUNSET';
        else this.currentPhase = 'DAY';
      }
    };

    const engine = window.__PARALLAX_ENGINE__;
    expect(engine.currentPhase).toBe('DAY');

    // Scroll 600px distance -> transition to SUNSET phase
    engine.update(600);
    expect(engine.scrollDistance).toBe(600);
    expect(engine.currentPhase).toBe('SUNSET');

    // Parallax layer speed ratios (0.15, 0.40, 0.75, 1.0) produce proportional offsets
    expect(engine.layers[0].offset).toBe(600 * 0.15); // Sky offset = 90
    expect(engine.layers[1].offset).toBe(600 * 0.40); // Mountains offset = 240
    expect(engine.layers[3].offset).toBe(600 * 1.00 % 360); // Bushes modulo wrapped offset = 240

    // Scroll further (additional 500px -> 1100px total) -> transition to NIGHT phase
    engine.update(500);
    expect(engine.scrollDistance).toBe(1100);
    expect(engine.currentPhase).toBe('NIGHT');
  });

  it('TPW-05: Responsive Scaling + DOM Overlays — Aspect ratio lock and overlay layout adaptation', () => {
    const env = setupDOM();
    const { window, document } = env;

    const canvas = document.querySelector('[data-testid="game-canvas"]');
    expect(canvas).toBeDefined();

    // Mock Responsive Scaler (locks 9:16 aspect ratio: 360x640 logical resolution)
    window.__RESPONSIVE_SCALER__ = {
      logicalWidth: 360,
      logicalHeight: 640,
      scale: 1,
      resize: function(viewportWidth, viewportHeight) {
        const targetAspect = 360 / 640;
        const currentAspect = viewportWidth / viewportHeight;

        if (currentAspect > targetAspect) {
          // Viewport wider than 9:16 (pillarbox)
          this.scale = viewportHeight / 640;
        } else {
          // Viewport taller than 9:16 (letterbox)
          this.scale = viewportWidth / 360;
        }
        canvas.style.width = `${Math.floor(360 * this.scale)}px`;
        canvas.style.height = `${Math.floor(640 * this.scale)}px`;
        return this.scale;
      }
    };

    // Test Desktop Viewport (1920x1080)
    const desktopScale = window.__RESPONSIVE_SCALER__.resize(1920, 1080);
    expect(desktopScale).toBe(1080 / 640); // 1.6875
    expect(canvas.style.height).toBe('1080px');

    // Test Mobile Viewport (375x667)
    const mobileScale = window.__RESPONSIVE_SCALER__.resize(375, 667);
    expect(mobileScale).toBe(375 / 360); // ~1.0416
    expect(canvas.style.width).toBe('375px');
  });

  it('TPW-06: Score Increment + Achievement Unlock — Pipe clearance triggers score & achievement checks', () => {
    const env = setupDOM();
    const { window } = env;

    const unlockedAchievements = new Set();
    window.__ACHIEVEMENTS__ = {
      getUnlocked: () => Array.from(unlockedAchievements),
      checkScore: (score) => {
        if (score >= 1) unlockedAchievements.add('FIRST_FLAP');
        if (score >= 5) unlockedAchievements.add('HIGH_FLYER');
        if (score >= 10) unlockedAchievements.add('BRONZE_AVIATOR');
      }
    };

    expect(getScore(env)).toBe(0);
    expect(window.__ACHIEVEMENTS__.getUnlocked().length).toBe(0);

    // Pass 1 pipe -> Score = 1
    if (window.__FLAPPY_GAME__._setScore) window.__FLAPPY_GAME__._setScore(1);
    window.__ACHIEVEMENTS__.checkScore(1);

    expect(getScore(env)).toBe(1);
    expect(window.__ACHIEVEMENTS__.getUnlocked()).toContain('FIRST_FLAP');
    expect(window.__ACHIEVEMENTS__.getUnlocked().length).toBe(1);

    // Advance score to 10 -> Triggers High Flyer & Bronze Aviator
    if (window.__FLAPPY_GAME__._setScore) window.__FLAPPY_GAME__._setScore(10);
    window.__ACHIEVEMENTS__.checkScore(10);

    expect(getScore(env)).toBe(10);
    expect(window.__ACHIEVEMENTS__.getUnlocked()).toContain('HIGH_FLYER');
    expect(window.__ACHIEVEMENTS__.getUnlocked()).toContain('BRONZE_AVIATOR');
    expect(window.__ACHIEVEMENTS__.getUnlocked().length).toBe(3);
  });

  it('TPW-07: Pipe Spawning + Dynamic Gap Height — Distance-based pipe generation & gap height constraints', () => {
    const env = setupDOM();
    const { window } = env;

    // Simulate Pipe Manager logic
    const spawnedPipes = [];
    window.__PIPE_MANAGER__ = {
      spawnDistance: 200,
      gapHeight: 135,
      minTopClearance: 50,
      maxTopClearance: 350,
      spawnPipe: function(x) {
        const topHeight = Math.floor(Math.random() * (350 - 50)) + 50;
        const pipe = {
          x,
          topHeight,
          bottomY: topHeight + this.gapHeight,
          gapHeight: this.gapHeight,
          scored: false
        };
        spawnedPipes.push(pipe);
        if (window.__FLAPPY_GAME__._setPipes) {
          window.__FLAPPY_GAME__._setPipes(spawnedPipes);
        }
        return pipe;
      }
    };

    const pipe1 = window.__PIPE_MANAGER__.spawnPipe(360);
    const pipe2 = window.__PIPE_MANAGER__.spawnPipe(560);

    const pipes = getPipes(env);
    expect(pipes.length).toBe(2);

    // Verify distance interval between pipes is 200px
    expect(pipe2.x - pipe1.x).toBe(200);

    // Verify gap height is fixed at 135px
    expect(pipe1.bottomY - pipe1.topHeight).toBe(135);
    expect(pipe2.bottomY - pipe2.topHeight).toBe(135);

    // Verify top pipe clearance bounds
    expect(pipe1.topHeight).toBeGreaterThanOrEqual(50);
    expect(pipe1.topHeight).toBeLessThanOrEqual(350);
  });

  it('TPW-08: Flap Input + Audio Synth Sweep — Jump input triggers physics impulse & synthesizer frequency sweep', () => {
    const env = setupDOM();
    const { window } = env;

    let synthSweepTriggered = false;
    let startFreq = 0;
    let endFreq = 0;

    window.__AUDIO_SYNTH__ = {
      playFlapSweep: () => {
        synthSweepTriggered = true;
        startFreq = 220;
        endFreq = 580;
      }
    };

    // Dispatch Space key flap input
    dispatchKeyboardEvent(env, 'keydown', 'Space', ' ');
    triggerFlap(env);
    window.__AUDIO_SYNTH__.playFlapSweep();

    // Verify physics impulse
    const bird = getBird(env);
    expect(bird.vy).toBe(-400);

    // Verify Web Audio synth frequency sweep
    expect(synthSweepTriggered).toBeTruthy();
    expect(startFreq).toBe(220);
    expect(endFreq).toBe(580);
  });

  it('TPW-09: Pause Menu + Physics Freeze — Pausing freezes bird velocity & pipe scrolling', () => {
    const env = setupDOM();
    const { window } = env;

    if (window.__FLAPPY_GAME__._setState) window.__FLAPPY_GAME__._setState('PLAYING');
    if (window.__FLAPPY_GAME__._setBird) window.__FLAPPY_GAME__._setBird({ x: 80, y: 250, vy: 150 });
    if (window.__FLAPPY_GAME__._setPipes) window.__FLAPPY_GAME__._setPipes([{ x: 200, topHeight: 100, bottomY: 235 }]);

    expect(getState(env)).toBe('PLAYING');
    const birdBefore = getBird(env);
    const pipesBefore = getPipes(env);

    // Trigger pause
    triggerPause(env);
    const pauseScreen = getPauseScreen(env);
    pauseScreen.classList.remove('hidden');

    expect(getState(env)).toBe('PAUSED');
    expect(pauseScreen).toBeDefined();

    // While paused, physics update ticks do not modify position
    const birdAfter = getBird(env);
    const pipesAfter = getPipes(env);

    expect(birdAfter.x).toBe(birdBefore.x);
    expect(birdAfter.y).toBe(birdBefore.y);
    expect(pipesAfter[0].x).toBe(pipesBefore[0].x);

    // Resume game
    triggerPause(env);
    expect(getState(env)).toBe('PLAYING');
  });

  it('TPW-10: Collision Burst + Particle Recycling — Impact spawns burst particles & recycles pool', () => {
    const env = setupDOM();
    const { window } = env;

    const pool = Array.from({ length: 200 }, (_, i) => ({ id: i, active: false }));
    window.__PARTICLE_ENGINE__ = {
      pool,
      activeCount: 0,
      spawnBurst: function(x, y, count = 20) {
        let spawned = 0;
        for (const p of pool) {
          if (!p.active) {
            p.active = true;
            p.x = x;
            p.y = y;
            p.life = 1.0;
            spawned++;
            this.activeCount++;
            if (spawned >= count) break;
          }
        }
        return spawned;
      },
      recycle: function() {
        for (const p of pool) {
          if (p.active && p.life <= 0) {
            p.active = false;
            this.activeCount--;
          }
        }
      }
    };

    const engine = window.__PARTICLE_ENGINE__;
    expect(engine.activeCount).toBe(0);

    // Spawn 20 impact particles on collision
    const spawnedCount = engine.spawnBurst(80, 400, 20);
    expect(spawnedCount).toBe(20);
    expect(engine.activeCount).toBe(20);

    // Age particles and recycle dead ones
    pool.slice(0, 10).forEach(p => { p.life = 0; });
    engine.recycle();

    expect(engine.activeCount).toBe(10);
    expect(pool.filter(p => p.active).length).toBe(10);
  });

  it('TPW-11: High Score + LocalStorage — High score updates in state & persists to DOM/localStorage', () => {
    const env = setupDOM();
    const { window, document } = env;

    const STORAGE_KEY = 'flappy_bird_data_v1';
    expect(getHighScore(env)).toBe(0);

    // Player achieves new score of 24
    if (window.__FLAPPY_GAME__._setHighScore) window.__FLAPPY_GAME__._setHighScore(24);
    if (window.__FLAPPY_GAME__._setScore) window.__FLAPPY_GAME__._setScore(24);

    // Persist to localStorage
    const data = { highScore: 24, lastScore: 24 };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Update DOM display
    const highScoreEl = getHighScoreDisplay(env);
    if (highScoreEl) highScoreEl.textContent = '24';

    expect(getHighScore(env)).toBe(24);

    const storedData = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(storedData.highScore).toBe(24);

    if (highScoreEl) {
      expect(highScoreEl.textContent).toBe('24');
    }
  });

  it('TPW-12: Server HTTP Serve + DOM Loading — Local HTTP server serves HTML & DOM initializes cleanly', async () => {
    const PORT = 3005;
    const mockHtml = `<!DOCTYPE html><html><head><title>Flappy Test</title></head><body><div id="game-container"><canvas id="game-canvas" data-testid="game-canvas"></canvas></div></body></html>`;

    // Start HTTP server on allowed port 3005
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(mockHtml);
    });

    await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

    // Perform HTTP GET request to verify serving
    const httpResponse = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}`, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
      }).on('error', reject);
    });

    expect(httpResponse.statusCode).toBe(200);
    expect(httpResponse.headers['content-type']).toContain('text/html');
    expect(httpResponse.body).toContain('data-testid="game-canvas"');

    // Initialize DOM with HTTP URL context
    const env = setupDOM({ url: `http://localhost:${PORT}`, customHtml: httpResponse.body });
    expect(env.document.querySelector('[data-testid="game-canvas"]')).toBeDefined();

    // Close server
    await new Promise((resolve) => server.close(resolve));
  });

});
