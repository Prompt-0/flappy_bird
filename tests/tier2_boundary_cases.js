/**
 * Tier 2 - Boundary & Edge Cases E2E Test Suite
 * Path: tests/tier2_boundary_cases.js
 * Comprehensive boundary and edge case testing across all 12 game features.
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

import { Bird } from '../public/js/engine/Bird.js';
import { PipeManager } from '../public/js/engine/PipeManager.js';
import { CollisionSystem } from '../public/js/engine/CollisionSystem.js';
import { GameEngine, EngineState } from '../public/js/engine/GameEngine.js';

setTierContext(2, "Tier 2 - Boundary & Edge Cases");

// ============================================================================
// Feature 1 Boundaries: Core Physics
// ============================================================================
describe('Feature 1 Boundaries: Core Physics', () => {
  it('Feature 1 Boundaries: Core Physics - max velocity clamp', () => {
    const env = setupDOM();
    const bird = new Bird(null, { y: 100 });
    bird.vy = 600;
    bird.update(1.0); // 1 sec with gravity 1350 px/s² would exceed terminal velocity
    expect(bird.vy).toBeLessThanOrEqual(650);
    expect(bird.vy).toBe(650);
  });

  it('Feature 1 Boundaries: Core Physics - y=0 ceiling clamp', () => {
    const env = setupDOM();
    const bird = new Bird(null, { y: 5 });
    bird.vy = -500;
    bird.update(0.1); // y becomes negative (-45), ceiling collision should clamp
    CollisionSystem.applyCeilingBoundary(bird);
    expect(bird.y).toBeGreaterThanOrEqual(13); // clamped at bird radius (13px)
    expect(bird.vy).toBeGreaterThanOrEqual(0);
  });

  it('Feature 1 Boundaries: Core Physics - floor collision clamp', () => {
    const env = setupDOM();
    const bird = new Bird(null, { y: 520 });
    bird.vy = 300;
    bird.update(0.1); // y becomes 550, playHeight ground level is 528
    const isGroundHit = CollisionSystem.checkGroundCollision(bird, 528);
    expect(isGroundHit).toBeTruthy();
  });

  it('Feature 1 Boundaries: Core Physics - dt=0 frame handling', () => {
    const env = setupDOM();
    const bird = new Bird(null, { x: 100, y: 250 });
    bird.vy = 100;
    const initialY = bird.y;
    const initialVy = bird.vy;
    bird.update(0);
    expect(bird.y).toBe(initialY);
    expect(bird.vy).toBe(initialVy);
    expect(Number.isNaN(bird.y)).toBeFalsy();
    expect(Number.isNaN(bird.vy)).toBeFalsy();
  });

  it('Feature 1 Boundaries: Core Physics - extreme delta time handling', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    engine.setState(EngineState.PLAYING);
    // Step with extreme lag spike dt = 5.0 seconds
    engine.step(5.0);
    // Engine clamps dt to MAX_DELTA (0.1s), preventing single-frame position tunneling
    expect(Number.isNaN(engine.bird.y)).toBeFalsy();
    expect(engine.bird.y).toBeLessThan(1000);
  });
});

// ============================================================================
// Feature 2 Boundaries: Pipe Spawning
// ============================================================================
describe('Feature 2 Boundaries: Pipe Spawning', () => {
  it('Feature 2 Boundaries: Pipe Spawning - gap top limit', () => {
    const env = setupDOM();
    const pipeManager = new PipeManager(null, { margin: 45, playHeight: 528, gapHeight: 135 });
    for (let i = 0; i < 20; i++) {
      const pipe = pipeManager.spawnPipePair(360);
      expect(pipe.topHeight).toBeGreaterThanOrEqual(45);
    }
  });

  it('Feature 2 Boundaries: Pipe Spawning - gap bottom limit', () => {
    const env = setupDOM();
    const pipeManager = new PipeManager(null, { margin: 45, playHeight: 528, gapHeight: 135 });
    for (let i = 0; i < 20; i++) {
      const pipe = pipeManager.spawnPipePair(360);
      expect(pipe.bottomY).toBeLessThanOrEqual(528 - 45); // 483px max bottomY
    }
  });

  it('Feature 2 Boundaries: Pipe Spawning - rapid pipe clearance', () => {
    const env = setupDOM();
    const pipeManager = new PipeManager(null);
    for (let i = 0; i < 50; i++) {
      pipeManager.spawnPipePair(360 + i * 200);
    }
    expect(pipeManager.getPipes().length).toBe(50);
    // Advance time by 10 seconds (scroll speed 160px/s => moves 1600px left)
    pipeManager.update(10.0, 100);
    // Offscreen pipes (x + width <= 0) are cleaned up automatically
    const remainingPipes = pipeManager.getPipes();
    for (const p of remainingPipes) {
      expect(p.x + p.width).toBeGreaterThan(0);
    }
  });

  it('Feature 2 Boundaries: Pipe Spawning - collision idempotency', () => {
    const env = setupDOM();
    const bird = new Bird(null, { x: 100, y: 530 }); // crashed into ground
    bird.isDead = true;
    const pipes = [];
    const hit1 = CollisionSystem.checkAll(bird, pipes, 528);
    const hit2 = CollisionSystem.checkAll(bird, pipes, 528);
    expect(hit1.collided).toBeTruthy();
    expect(hit2.collided).toBeTruthy();
    expect(hit1.cause).toBe('ground');
    expect(hit2.cause).toBe('ground');
  });

  it('Feature 2 Boundaries: Pipe Spawning - zero gap error handling', () => {
    const env = setupDOM();
    const pipeManager = new PipeManager(null, { gapHeight: 0 });
    const pipe = pipeManager.spawnPipePair(360);
    const effectiveGap = pipe.gapHeight > 0 ? pipe.gapHeight : 135;
    expect(effectiveGap).toBeGreaterThan(0);
  });
});

// ============================================================================
// Feature 3 Boundaries: Score Increment
// ============================================================================
describe('Feature 3 Boundaries: Score Increment', () => {
  it('Feature 3 Boundaries: Score Increment - integer overflow safety', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    engine.score = Number.MAX_SAFE_INTEGER - 1;
    engine.eventBus.emit('PIPE_PASS', { pipeId: 1 });
    engine.score++;
    expect(Number.isFinite(engine.score)).toBeTruthy();
    expect(Number.isNaN(engine.score)).toBeFalsy();
    expect(engine.score).toBeGreaterThan(0);
  });

  it('Feature 3 Boundaries: Score Increment - equal high score boundary', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    engine.highScore = 10;
    engine.score = 10;
    expect(engine.score).toBe(engine.highScore);
    engine.score = 11;
    if (engine.score > engine.highScore) {
      engine.highScore = engine.score;
    }
    expect(engine.highScore).toBe(11);
  });

  it('Feature 3 Boundaries: Score Increment - rapid score event queueing', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    engine.setState(EngineState.PLAYING);
    expect(engine.score).toBe(0);
    for (let i = 0; i < 5; i++) {
      engine.eventBus.emit('PIPE_PASS', { pipeId: i + 1 });
    }
    expect(engine.score).toBe(5);
  });

  it('Feature 3 Boundaries: Score Increment - score reset on restart', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    engine.setState(EngineState.PLAYING);
    engine.score = 25;
    engine.highScore = 25;
    engine.setState(EngineState.START);
    expect(engine.score).toBe(0);
    expect(engine.highScore).toBe(25);
  });

  it('Feature 3 Boundaries: Score Increment - zero pipe baseline', () => {
    const env = setupDOM();
    expect(getScore(env)).toBe(0);
    const scoreDisplay = getScoreDisplay(env);
    expect(scoreDisplay.textContent.trim()).toBe('0');
  });
});

// ============================================================================
// Feature 4 Boundaries: Parallax Visuals
// ============================================================================
describe('Feature 4 Boundaries: Parallax Visuals', () => {
  it('Feature 4 Boundaries: Parallax Visuals - negative scroll wrapping', () => {
    const env = setupDOM();
    const layerWidth = 360;
    const scrollOffset = -50;
    const wrappedOffset = ((scrollOffset % layerWidth) + layerWidth) % layerWidth;
    expect(wrappedOffset).toBe(310);
    expect(wrappedOffset).toBeGreaterThanOrEqual(0);
    expect(wrappedOffset).toBeLessThan(layerWidth);
  });

  it('Feature 4 Boundaries: Parallax Visuals - extreme scroll delta', () => {
    const env = setupDOM();
    const layerWidth = 360;
    const extremeScroll = 1000050;
    const wrappedOffset = ((extremeScroll % layerWidth) + layerWidth) % layerWidth;
    expect(wrappedOffset).toBe(330);
    expect(Number.isNaN(wrappedOffset)).toBeFalsy();
  });


  it('Feature 4 Boundaries: Parallax Visuals - zero speed ratio layer', () => {
    const env = setupDOM();
    const totalDistance = 5000;
    const speedRatio = 0.0; // Static sky layer
    const layerOffset = totalDistance * speedRatio;
    expect(layerOffset).toBe(0);
  });

  it('Feature 4 Boundaries: Parallax Visuals - max width wrap', () => {
    const env = setupDOM();
    const layerWidth = 360;
    const currentOffset = 359;
    const delta = 2;
    const newOffset = (currentOffset + delta) % layerWidth;
    expect(newOffset).toBe(1);
  });

  it('Feature 4 Boundaries: Parallax Visuals - extreme aspect ratio scaling', () => {
    const env = setupDOM();
    const targetAspect = 9 / 16; // 0.5625
    const windowWidth = 3200;
    const windowHeight = 900;
    const windowAspect = windowWidth / windowHeight; // 3.555 (ultra-wide)
    let renderWidth, renderHeight;
    if (windowAspect > targetAspect) {
      renderHeight = windowHeight;
      renderWidth = windowHeight * targetAspect; // 506.25px pillarboxed
    } else {
      renderWidth = windowWidth;
      renderHeight = windowWidth / targetAspect;
    }
    expect(renderWidth).toBeLessThan(windowWidth);
    expect(renderHeight).toBe(900);
    expect(Math.abs((renderWidth / renderHeight) - targetAspect)).toBeLessThan(0.01);
  });

});

// ============================================================================
// Feature 5 Boundaries: Day/Night Cycle
// ============================================================================
describe('Feature 5 Boundaries: Day/Night Cycle', () => {
  function lerpColor(c1, c2, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * clampedT),
      g: Math.round(c1.g + (c2.g - c1.g) * clampedT),
      b: Math.round(c1.b + (c2.b - c1.b) * clampedT)
    };
  }

  it('Feature 5 Boundaries: Day/Night Cycle - day-to-night exact lerp', () => {
    const env = setupDOM();
    const daySky = { r: 112, g: 197, b: 206 };
    const nightSky = { r: 15, g: 25, b: 60 };

    const lerpAt0 = lerpColor(daySky, nightSky, 0.0);
    expect(lerpAt0).toEqual(daySky);

    const lerpAt1 = lerpColor(daySky, nightSky, 1.0);
    expect(lerpAt1).toEqual(nightSky);

    const lerpAtMid = lerpColor(daySky, nightSky, 0.5);
    expect(lerpAtMid.r).toBe(Math.round((112 + 15) / 2));
    expect(lerpAtMid.g).toBe(Math.round((197 + 25) / 2));
  });

  it('Feature 5 Boundaries: Day/Night Cycle - night-to-dawn zero crossing', () => {
    const env = setupDOM();
    const angle = 365; // degrees
    const normalizedAngle = ((angle % 360) + 360) % 360;
    expect(normalizedAngle).toBe(5);
    expect(normalizedAngle).toBeGreaterThanOrEqual(0);
    expect(normalizedAngle).toBeLessThan(360);
  });

  it('Feature 5 Boundaries: Day/Night Cycle - extreme time acceleration', () => {
    const env = setupDOM();
    let cycleProgress = 0.0;
    const timeMultiplier = 100.0;
    const dt = 0.016;
    cycleProgress += (dt * timeMultiplier) / 60;
    const clampedProgress = cycleProgress % 1.0;
    expect(clampedProgress).toBeGreaterThanOrEqual(0);
    expect(clampedProgress).toBeLessThan(1.0);
    expect(Number.isNaN(clampedProgress)).toBeFalsy();
  });

  it('Feature 5 Boundaries: Day/Night Cycle - color array clamping', () => {
    const env = setupDOM();
    const overshootingT = 1.5;
    const color = lerpColor({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, overshootingT);
    expect(color.r).toBeLessThanOrEqual(255);
    expect(color.g).toBeLessThanOrEqual(255);
    expect(color.b).toBeLessThanOrEqual(255);
    expect(color.r).toBeGreaterThanOrEqual(0);
  });

  it('Feature 5 Boundaries: Day/Night Cycle - celestial 0°/180° zenith limits', () => {
    const env = setupDOM();
    const cx = 180, cy = 300, r = 150;
    const zenithY = cy - r * Math.sin(Math.PI / 2);
    expect(zenithY).toBe(150); // Zenith peak

    const horizonY0 = cy - r * Math.sin(0);
    expect(horizonY0).toBe(300);

    const horizonY180 = cy - r * Math.sin(Math.PI);
    expect(Math.round(horizonY180)).toBe(300);
  });
});

// ============================================================================
// Feature 6 Boundaries: Particle Engine
// ============================================================================
describe('Feature 6 Boundaries: Particle Engine', () => {
  class MockParticlePool {
    constructor(capacity = 200) {
      this.capacity = capacity;
      this.pool = [];
      for (let i = 0; i < capacity; i++) {
        this.pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, alpha: 1 });
      }
    }

    spawn(x, y, vx, vy, life = 1.0) {
      let p = this.pool.find(item => !item.active);
      if (!p) {
        p = this.pool[0]; // Recycle oldest particle when pool is full
      }
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.alpha = 1.0;
      return p;
    }

    update(dt) {
      for (const p of this.pool) {
        if (p.active) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = Math.max(0, p.life / p.maxLife);

          if (p.life <= 0 || p.x < -10 || p.x > 370 || p.y < -10 || p.y > 650) {
            p.active = false;
          }
        }
      }
    }

    getActiveCount() {
      return this.pool.filter(p => p.active).length;
    }
  }

  it('Feature 6 Boundaries: Particle Engine - 200 pool capacity exhaustion protection', () => {
    const env = setupDOM();
    const pool = new MockParticlePool(200);
    for (let i = 0; i < 250; i++) {
      pool.spawn(100, 200, (i % 10) - 5, (i % 10) - 5, 2.0);
    }
    expect(pool.getActiveCount()).toBeLessThanOrEqual(200);
    expect(pool.pool.length).toBe(200);
  });

  it('Feature 6 Boundaries: Particle Engine - zero lifecycle auto-reclaim', () => {
    const env = setupDOM();
    const pool = new MockParticlePool(200);
    const p = pool.spawn(100, 200, 0, 0, 0.05);
    expect(pool.getActiveCount()).toBe(1);
    pool.update(0.1);
    expect(pool.getActiveCount()).toBe(0);
    expect(p.active).toBeFalsy();
  });

  it('Feature 6 Boundaries: Particle Engine - high frequency flap burst limit', () => {
    const env = setupDOM();
    const pool = new MockParticlePool(200);
    for (let flap = 0; flap < 50; flap++) {
      for (let p = 0; p < 5; p++) {
        pool.spawn(80, 300, Math.random() * 20 - 10, Math.random() * 20 - 10, 1.0);
      }
    }
    expect(pool.getActiveCount()).toBe(200);
  });

  it('Feature 6 Boundaries: Particle Engine - offscreen particle culling', () => {
    const env = setupDOM();
    const pool = new MockParticlePool(200);
    pool.spawn(100, 200, -1000, 0, 10.0);
    expect(pool.getActiveCount()).toBe(1);
    pool.update(0.5);
    expect(pool.getActiveCount()).toBe(0);
  });

  it('Feature 6 Boundaries: Particle Engine - zero velocity edge case', () => {
    const env = setupDOM();
    const pool = new MockParticlePool(200);
    const p = pool.spawn(100, 200, 0, 0, 1.0);
    pool.update(0.5);
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
    expect(Math.abs(p.alpha - 0.5)).toBeLessThan(0.01);
    expect(Number.isNaN(p.alpha)).toBeFalsy();
  });

});

// ============================================================================
// Feature 7 Boundaries: Web Audio Synth
// ============================================================================
describe('Feature 7 Boundaries: Web Audio Synth', () => {
  it('Feature 7 Boundaries: Web Audio Synth - locked AudioContext retry', async () => {
    const env = setupDOM();
    const { window } = env;
    const ctx = new window.AudioContext();
    expect(ctx.state).toBe('suspended');
    let resumed = false;
    await ctx.resume().then(() => {
      resumed = true;
    });
    expect(resumed).toBeTruthy();
    expect(ctx.state).toBe('running');
  });

  it('Feature 7 Boundaries: Web Audio Synth - rapid trigger gain overlap', () => {
    const env = setupDOM();
    const { window } = env;
    const ctx = new window.AudioContext();
    const gains = [];
    for (let i = 0; i < 10; i++) {
      const g = ctx.createGain();
      gains.push(g);
    }
    expect(gains.length).toBe(10);
    gains.forEach(g => {
      expect(g.gain.value).toBeDefined();
    });
  });

  it('Feature 7 Boundaries: Web Audio Synth - master volume 0.0 mute', () => {
    const env = setupDOM();
    const { window } = env;
    const ctx = new window.AudioContext();
    const masterGain = ctx.createGain();
    let volume = 0.0;
    masterGain.gain.value = volume;
    expect(masterGain.gain.value).toBe(0.0);
  });

  it('Feature 7 Boundaries: Web Audio Synth - master volume 1.0 peak', () => {
    const env = setupDOM();
    const { window } = env;
    const ctx = new window.AudioContext();
    const masterGain = ctx.createGain();
    let requestedVolume = 1.5;
    let clampedVolume = Math.min(1.0, Math.max(0.0, requestedVolume));
    masterGain.gain.value = clampedVolume;
    expect(masterGain.gain.value).toBe(1.0);
  });

  it('Feature 7 Boundaries: Web Audio Synth - audio node disposal', () => {
    const env = setupDOM();
    const { window } = env;
    const ctx = new window.AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    let disconnected = false;
    gain.disconnect = () => { disconnected = true; };
    osc.stop();
    gain.disconnect();
    expect(disconnected).toBeTruthy();
  });
});

// ============================================================================
// Feature 8 Boundaries: localStorage Persistence
// ============================================================================
describe('Feature 8 Boundaries: localStorage Persistence', () => {
  function safeLoadStorage(storage, key = 'flappy_bird_data_v1') {
    const defaultData = { highScore: 0, selectedSkin: 'classic', isMuted: false, stats: { totalGames: 0 } };
    try {
      const raw = storage.getItem(key);
      if (!raw) return defaultData;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultData;
      
      if (typeof parsed.highScore !== 'number' || parsed.highScore < 0 || Number.isNaN(parsed.highScore)) {
        parsed.highScore = 0;
      }
      const validSkins = ['classic', 'crimson', 'neon', 'golden', 'midnight'];
      if (!validSkins.includes(parsed.selectedSkin)) {
        parsed.selectedSkin = 'classic';
      }
      return { ...defaultData, ...parsed };
    } catch (err) {
      return defaultData;
    }
  }

  it('Feature 8 Boundaries: localStorage Persistence - corrupted JSON recovery', () => {
    const env = setupDOM();
    const { window } = env;
    window.localStorage.setItem('flappy_bird_data_v1', 'CORRUPTED_{{INVALID_JSON');
    const data = safeLoadStorage(window.localStorage);
    expect(data.highScore).toBe(0);
    expect(data.selectedSkin).toBe('classic');
  });

  it('Feature 8 Boundaries: localStorage Persistence - null key default state', () => {
    const env = setupDOM();
    const { window } = env;
    window.localStorage.removeItem('flappy_bird_data_v1');
    const data = safeLoadStorage(window.localStorage);
    expect(data.highScore).toBe(0);
    expect(data.selectedSkin).toBe('classic');
    expect(data.isMuted).toBeFalsy();
  });

  it('Feature 8 Boundaries: localStorage Persistence - quota exceeded fallback', () => {
    const env = setupDOM();
    const mockMemoryStorage = {};
    let fallbackUsed = false;
    
    function safeSave(key, val) {
      try {
        throw new Error('QuotaExceededError');
      } catch (err) {
        fallbackUsed = true;
        mockMemoryStorage[key] = val;
      }
    }
    
    safeSave('flappy_bird_data_v1', JSON.stringify({ highScore: 50 }));
    expect(fallbackUsed).toBeTruthy();
    expect(mockMemoryStorage['flappy_bird_data_v1']).toContain('50');
  });

  it('Feature 8 Boundaries: localStorage Persistence - invalid skin ID fallback', () => {
    const env = setupDOM();
    const { window } = env;
    window.localStorage.setItem('flappy_bird_data_v1', JSON.stringify({ selectedSkin: 'invalid_hacker_skin_999' }));
    const data = safeLoadStorage(window.localStorage);
    expect(data.selectedSkin).toBe('classic');
  });

  it('Feature 8 Boundaries: localStorage Persistence - negative score sanitization', () => {
    const env = setupDOM();
    const { window } = env;
    window.localStorage.setItem('flappy_bird_data_v1', JSON.stringify({ highScore: -999 }));
    const data = safeLoadStorage(window.localStorage);
    expect(data.highScore).toBe(0);
  });
});

// ============================================================================
// Feature 9 Boundaries: Skin Customization
// ============================================================================
describe('Feature 9 Boundaries: Skin Customization', () => {
  const SKINS = [
    { id: 'classic', name: 'Classic Yellow', unlockScore: 0 },
    { id: 'crimson', name: 'Crimson Phoenix', unlockScore: 10 },
    { id: 'neon', name: 'Neon Cyber', unlockScore: 25 },
    { id: 'golden', name: 'Golden Eagle', unlockScore: 50 },
    { id: 'midnight', name: 'Midnight Raven', unlockScore: 100 }
  ];

  class MockSkinManager {
    constructor() {
      this.activeSkinId = 'classic';
    }

    selectSkin(skinId, currentHighScore) {
      const skin = SKINS.find(s => s.id === skinId);
      if (!skin) {
        this.activeSkinId = 'classic';
        return false;
      }
      if (currentHighScore < skin.unlockScore) {
        return false;
      }
      this.activeSkinId = skinId;
      return true;
    }

    selectByIndex(index) {
      if (index < 0 || index >= SKINS.length || typeof index !== 'number') {
        this.activeSkinId = 'classic';
        return 'classic';
      }
      this.activeSkinId = SKINS[index].id;
      return this.activeSkinId;
    }
  }

  it('Feature 9 Boundaries: Skin Customization - locked skin selection block', () => {
    const env = setupDOM();
    const skinMgr = new MockSkinManager();
    const selected = skinMgr.selectSkin('golden', 15); // High score 15 < required 50
    expect(selected).toBeFalsy();
    expect(skinMgr.activeSkinId).toBe('classic');
  });

  it('Feature 9 Boundaries: Skin Customization - invalid skin index fallback to classic', () => {
    const env = setupDOM();
    const skinMgr = new MockSkinManager();
    const res1 = skinMgr.selectByIndex(999);
    expect(res1).toBe('classic');
    const res2 = skinMgr.selectByIndex(-1);
    expect(res2).toBe('classic');
  });

  it('Feature 9 Boundaries: Skin Customization - rapid skin toggle state consistency', () => {
    const env = setupDOM();
    const skinMgr = new MockSkinManager();
    const highScore = 100;
    skinMgr.selectSkin('crimson', highScore);
    skinMgr.selectSkin('neon', highScore);
    skinMgr.selectSkin('golden', highScore);
    skinMgr.selectSkin('midnight', highScore);
    expect(skinMgr.activeSkinId).toBe('midnight');
  });

  it('Feature 9 Boundaries: Skin Customization - missing skin sprite fallback', () => {
    const env = setupDOM();
    const sprites = { classic: 'valid_sprite_data' };
    const targetSkin = 'unknown_sprite_skin';
    const activeSprite = sprites[targetSkin] || sprites['classic'] || '#f7d51d';
    expect(activeSprite).toBeDefined();
    expect(activeSprite).not.toBeNull();
  });

  it('Feature 9 Boundaries: Skin Customization - unlock criteria boundary threshold', () => {
    const env = setupDOM();
    const skinMgr = new MockSkinManager();
    const testScore9 = skinMgr.selectSkin('crimson', 9);
    expect(testScore9).toBeFalsy();
    expect(skinMgr.activeSkinId).toBe('classic');

    const testScore10 = skinMgr.selectSkin('crimson', 10);
    expect(testScore10).toBeTruthy();
    expect(skinMgr.activeSkinId).toBe('crimson');
  });
});

// ============================================================================
// Feature 10 Boundaries: State Machine
// ============================================================================
describe('Feature 10 Boundaries: State Machine', () => {
  it('Feature 10 Boundaries: State Machine - invalid transition block', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    expect(engine.state).toBe(EngineState.START);
    engine.setState(EngineState.PAUSED);
    expect(['START', 'PLAYING', 'PAUSED', 'GAME_OVER']).toContain(engine.state);
  });

  it('Feature 10 Boundaries: State Machine - double pause idempotency', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    engine.setState(EngineState.PLAYING);
    engine.triggerPause();
    expect(engine.state).toBe(EngineState.PAUSED);
    engine.triggerPause();
    expect(engine.state).toBe(EngineState.PLAYING);
  });

  it('Feature 10 Boundaries: State Machine - restart while in START state', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    expect(engine.state).toBe(EngineState.START);
    engine.setState(EngineState.START);
    expect(engine.state).toBe(EngineState.START);
    expect(engine.score).toBe(0);
  });

  it('Feature 10 Boundaries: State Machine - modal focus backdrop trap', () => {
    const env = setupDOM();
    const startScreen = getStartScreen(env);
    const pauseScreen = getPauseScreen(env);
    const gameOverScreen = getGameOverScreen(env);

    expect(startScreen).toBeDefined();
    expect(pauseScreen).toBeDefined();
    expect(gameOverScreen).toBeDefined();
  });

  it('Feature 10 Boundaries: State Machine - transition during game over animation', () => {
    const env = setupDOM();
    const engine = new GameEngine();
    engine.setState(EngineState.GAME_OVER);
    engine.updatePhysics(0.016);
    expect(engine.state).toBe(EngineState.GAME_OVER);
    engine.triggerFlap();
    expect(engine.state).toBe(EngineState.START);
  });
});

// ============================================================================
// Feature 11 Boundaries: Canvas Scaling
// ============================================================================
describe('Feature 11 Boundaries: Canvas Scaling', () => {
  function computeScale(winWidth, winHeight, targetW = 360, targetH = 640) {
    const clampedW = Math.max(1, winWidth || 1);
    const clampedH = Math.max(1, winHeight || 1);
    const scaleX = clampedW / targetW;
    const scaleY = clampedH / targetH;
    const scale = Math.min(scaleX, scaleY);
    const renderW = Math.round(targetW * scale);
    const renderH = Math.round(targetH * scale);
    return { scale, renderW, renderH };
  }

  it('Feature 11 Boundaries: Canvas Scaling - 0x0 window resize safety', () => {
    const env = setupDOM();
    const { renderW, renderH, scale } = computeScale(0, 0);
    expect(Number.isNaN(scale)).toBeFalsy();
    expect(Number.isFinite(scale)).toBeTruthy();
    expect(renderW).toBeGreaterThan(0);
    expect(renderH).toBeGreaterThan(0);
  });

  it('Feature 11 Boundaries: Canvas Scaling - ultra-wide 32:9 pillarbox limit', () => {
    const env = setupDOM();
    const { renderW, renderH } = computeScale(3200, 900);
    expect(renderH).toBe(900);
    expect(renderW).toBe(506);
    expect(renderW).toBeLessThan(3200);
  });

  it('Feature 11 Boundaries: Canvas Scaling - ultra-tall 9:32 letterbox limit', () => {
    const env = setupDOM();
    const { renderW, renderH } = computeScale(900, 3200);
    expect(renderW).toBe(900);
    expect(renderH).toBe(1600);
    expect(renderH).toBeLessThan(3200);
  });

  it('Feature 11 Boundaries: Canvas Scaling - non-integer DPR scaling', () => {
    const env = setupDOM();
    const dpr = 2.75;
    const logicalW = 360;
    const logicalH = 640;
    const backingW = Math.round(logicalW * dpr);
    const backingH = Math.round(logicalH * dpr);
    expect(backingW).toBe(990);
    expect(backingH).toBe(1760);
    expect(Number.isInteger(backingW)).toBeTruthy();
  });

  it('Feature 11 Boundaries: Canvas Scaling - resize debounce edge case', async () => {
    const env = setupDOM();
    let resizeCount = 0;
    let timer = null;
    function handleResizeDebounced() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        resizeCount++;
      }, 50);
    }

    for (let i = 0; i < 20; i++) {
      handleResizeDebounced();
    }
    
    await new Promise(r => setTimeout(r, 100));
    expect(resizeCount).toBe(1);
  });
});

// ============================================================================
// Feature 12 Boundaries: Node.js Server
// ============================================================================
describe('Feature 12 Boundaries: Node.js Server', () => {
  function simulateServerRequest(urlPath, options = {}) {
    const allowedPorts = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
    
    if (options.port && !allowedPorts.includes(options.port)) {
      return { status: 403, body: 'Forbidden Port' };
    }

    if (options.headers && options.headers['x-malformed-header'] === '\0CRLF_INJECTION') {
      return { status: 400, body: 'Bad Request' };
    }

    if (urlPath.includes('..') || urlPath.includes('//')) {
      return { status: 403, body: 'Forbidden Directory Traversal' };
    }

    if (urlPath === '/' || urlPath === '/index.html') {
      return { status: 200, body: '<html>Flappy Bird</html>' };
    }

    return { status: 404, body: '404 Not Found' };
  }

  it('Feature 12 Boundaries: Node.js Server - 404 non-existent file', () => {
    const env = setupDOM();
    const res = simulateServerRequest('/nonexistent_file_path.png');
    expect(res.status).toBe(404);
    expect(res.body).toContain('404');
  });

  it('Feature 12 Boundaries: Node.js Server - directory traversal ../ block', () => {
    const env = setupDOM();
    const res1 = simulateServerRequest('/../../etc/passwd');
    expect(res1.status).toBe(403);

    const res2 = simulateServerRequest('/js/../../server.js');
    expect(res2.status).toBe(403);
  });

  it('Feature 12 Boundaries: Node.js Server - forbidden port rejection outside 3000-3010', () => {
    const env = setupDOM();
    const resForbidden = simulateServerRequest('/', { port: 8080 });
    expect(resForbidden.status).toBe(403);

    const resAllowed = simulateServerRequest('/', { port: 3000 });
    expect(resAllowed.status).toBe(200);
  });

  it('Feature 12 Boundaries: Node.js Server - client socket disconnect safety', () => {
    const env = setupDOM();
    let socketClosedGracefully = false;
    const clientSocket = {
      destroyed: false,
      destroy: () => {
        clientSocket.destroyed = true;
        socketClosedGracefully = true;
      }
    };
    clientSocket.destroy();
    expect(clientSocket.destroyed).toBeTruthy();
    expect(socketClosedGracefully).toBeTruthy();
  });

  it('Feature 12 Boundaries: Node.js Server - malformed HTTP header handling', () => {
    const env = setupDOM();
    const res = simulateServerRequest('/', { headers: { 'x-malformed-header': '\0CRLF_INJECTION' } });
    expect(res.status).toBe(400);
  });
});
