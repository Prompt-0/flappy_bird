import { EventBus } from './EventBus.js';
import { Bird } from './Bird.js';
import { PipeManager } from './PipeManager.js';
import { CollisionSystem } from './CollisionSystem.js';
import { Parallax } from '../visuals/Parallax.js';
import { ParticleEngine } from '../visuals/ParticleEngine.js';
import { SpriteCache } from '../visuals/SpriteCache.js';
import { StorageEngine } from '../storage/StorageEngine.js';
import { SkinManager } from '../storage/SkinManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { PowerUpManager } from './PowerUpManager.js';
import { GameModeManager } from '../modes/GameModeManager.js';
import { AchievementManager } from '../achievements/AchievementManager.js';

export const EngineState = {
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER'
};

export class GameEngine {
  constructor(options = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.storageEngine = options.storageEngine || new StorageEngine();
    this.skinManager = options.skinManager || new SkinManager(this.storageEngine);
    this.audioManager = options.audioManager || new AudioManager({ eventBus: this.eventBus, storageEngine: this.storageEngine });

    this.bird = new Bird(this.eventBus);
    this.pipeManager = new PipeManager(this.eventBus);
    this.parallax = new Parallax(360, 640, { playHeight: 528 });
    this.particleEngine = new ParticleEngine(200);
    this.spriteCache = new SpriteCache();

    this.powerUpManager = new PowerUpManager(this.eventBus);
    this.gameModeManager = new GameModeManager(this.eventBus);
    this.achievementManager = new AchievementManager(this.eventBus, this.storageEngine);

    this.state = EngineState.START;
    this.score = 0;
    this.highScore = this.storageEngine.getHighScore();
    this.initialHighScore = this.highScore;

    // Logical dimensions
    this.width = 360;
    this.height = 640;
    this.playHeight = 528;

    // Fixed timestep accumulator loop parameters
    this.FIXED_DT = 1 / 60; // 0.0166667s (60Hz fixed step)
    this.MAX_DELTA = 0.1;   // 100ms delta clamp
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.isRunning = false;
    this.animationFrameId = null;

    this.hoverTimer = 0;

    // Sync active bird skin
    const activeSkin = this.skinManager.getSkinDetails();
    if (activeSkin && activeSkin.palette) {
      this.bird.setPalette(activeSkin.palette);
    }

    if (options.canvas) {
      this.setupCanvas(options.canvas);
    }

    // Subscribe to gameplay events for particle FX and score tracking
    this.eventBus.on('PIPE_PASS', (data) => {
      if (this.state === EngineState.PLAYING) {
        const mult = (this.powerUpManager && this.powerUpManager.activeEffects.scoreMultiplier) || 1;
        const addScore = (data && typeof data.score === 'number') ? (data.score - this.score) : 1;
        this.score += Math.max(1, addScore) * mult;

        if (this.score > this.highScore) {
          this.highScore = this.score;
        }
        this.particleEngine.emitScoreSparkles(this.bird.x, this.bird.y);
      }
    });

    this.eventBus.on('BIRD_FLAP', () => {
      if (!this.bird.isDead) {
        this.particleEngine.emitFlapTrail(this.bird.x - 10, this.bird.y + 4);
      }
    });

    this.eventBus.on('BIRD_HIT', () => {
      this.particleEngine.emitCollisionBurst(this.bird.x, this.bird.y);
    });

    this.eventBus.on('SKIN_CHANGED', ({ skinId }) => {
      const details = this.skinManager.getSkinDetails(skinId);
      if (details && details.palette) {
        this.bird.setPalette(details.palette);
      }
    });

    this.setupGlobalAPI();
  }

  setupCanvas(canvas) {
    this.canvas = canvas;
    if (!canvas || typeof canvas.getContext !== 'function') return;

    this.ctx = canvas.getContext('2d');
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    this.dpr = dpr;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;

    if (this.canvas.style) {
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
    }

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  setState(newState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;

    if (newState === EngineState.START) {
      this.score = 0;
      this.initialHighScore = this.highScore;
      this.bird.reset(100, 250);
      this.pipeManager.reset();
      this.powerUpManager.reset();
      this.particleEngine.reset();
      this.hoverTimer = 0;
    } else if (newState === EngineState.PLAYING && oldState === EngineState.START) {
      this.initialHighScore = this.highScore;
    } else if (newState === EngineState.GAME_OVER) {
      if (this.storageEngine) {
        this.storageEngine.setHighScore(this.highScore);
        this.storageEngine.updateStats({ totalGames: 1, totalPipes: this.score });
        this.skinManager.checkUnlocks(this.highScore, this.storageEngine.getStats());
      }
    }

    this.eventBus.emit('ENGINE_STATE_CHANGE', { oldState, newState });
  }

  triggerFlap() {
    if (this.state === EngineState.START) {
      this.setState(EngineState.PLAYING);
      this.bird.flap();
    } else if (this.state === EngineState.PLAYING) {
      this.bird.flap();
    } else if (this.state === EngineState.GAME_OVER) {
      this.setState(EngineState.START);
    }
  }

  triggerPause() {
    if (this.state === EngineState.PLAYING) {
      this.setState(EngineState.PAUSED);
    } else if (this.state === EngineState.PAUSED) {
      this.setState(EngineState.PLAYING);
    }
  }

  updatePhysics(dt) {
    if (this.state === EngineState.START) {
      this.hoverTimer += dt;
      this.bird.y = 250 + Math.sin(this.hoverTimer * 5) * 6;
      this.bird.rotation = 0;
      this.parallax.update(dt, 80);
      this.particleEngine.update(dt);
    } else if (this.state === EngineState.PLAYING) {
      this.bird.update(dt);
      this.pipeManager.update(dt, this.bird.x);
      this.powerUpManager.update(dt, this.pipeManager.scrollSpeed, this.bird);
      this.parallax.update(dt, 160);
      this.particleEngine.update(dt);

      const hit = CollisionSystem.checkAll(this.bird, this.pipeManager.getPipes(), this.playHeight);
      if (hit.collided) {
        if (this.gameModeManager && this.gameModeManager.currentMode === 'ZEN') {
          // Zen mode: soft bounce without game over
          this.bird.vy = -220;
        } else if (this.powerUpManager && this.powerUpManager.consumeShield()) {
          // Shield absorbed collision!
          this.bird.vy = -280;
          this.particleEngine.emitCollisionBurst(this.bird.x, this.bird.y);
        } else {
          this.bird.isDead = true;
          this.eventBus.emit('BIRD_HIT', { x: this.bird.x, y: this.bird.y, cause: hit.cause });
          const isHighScore = this.score > this.initialHighScore;
          this.setState(EngineState.GAME_OVER);
          this.eventBus.emit('GAME_OVER', { score: this.score, finalScore: this.score, isHighScore });
        }
      }
    } else if (this.state === EngineState.GAME_OVER) {
      this.particleEngine.update(dt);
      if (!CollisionSystem.checkGroundCollision(this.bird, this.playHeight)) {
        this.bird.update(dt);
      }
    }
  }

  step(dt) {
    const clampedDt = Math.min(dt, this.MAX_DELTA);
    this.accumulator += clampedDt;

    while (this.accumulator >= this.FIXED_DT - 1e-7) {
      this.updatePhysics(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }

    this.render();
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Multi-layer Parallax & Weather Background
    this.parallax.render(this.ctx);

    // 2. Pipes, Power-ups & Entities
    this.pipeManager.render(this.ctx);
    this.powerUpManager.render(this.ctx);
    this.particleEngine.render(this.ctx);
    this.bird.render(this.ctx);

    // 3. Render Shield Bubble Aura around Bird
    if (this.powerUpManager && this.powerUpManager.activeEffects.hasShield && !this.bird.isDead) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(this.bird.x, this.bird.y, this.bird.radius + 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#38bdf8';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#38bdf8';
      this.ctx.shadowBlur = 12;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = 0;
    this.accumulator = 0;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;

    let frameTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // Delta time clamping (prevent tab-switch lag explosion)
    if (frameTime > this.MAX_DELTA) {
      frameTime = this.MAX_DELTA;
    }

    this.accumulator += frameTime;

    while (this.accumulator >= this.FIXED_DT - 1e-7) {
      this.updatePhysics(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }

    this.render();

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  setupGlobalAPI() {
    if (typeof window !== 'undefined') {
      window.__FLAPPY_GAME__ = {
        getState: () => this.state,
        getScore: () => this.score,
        getHighScore: () => this.highScore,
        getBird: () => ({
          x: this.bird.x,
          y: this.bird.y,
          vy: this.bird.vy,
          rotation: this.bird.rotation,
          isDead: this.bird.isDead
        }),
        getPipes: () => this.pipeManager.getPipes(),
        triggerFlap: () => this.triggerFlap(),
        triggerPause: () => this.triggerPause(),
        restartGame: () => this.setState(EngineState.START)
      };
    }
  }
}
