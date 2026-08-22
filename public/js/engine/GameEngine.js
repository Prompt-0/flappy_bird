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
    this.invulnerableTimer = 0;
    this.screenShakeTimer = 0;

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
    this.eventBus.on('PIPE_PASS', () => {
      if (this.state === EngineState.PLAYING) {
        const mult = (this.powerUpManager && this.powerUpManager.activeEffects.scoreMultiplier) || 1;
        this.score += 1 * mult;

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
      this.screenShakeTimer = 0.25; // 250ms camera shake
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
      this.invulnerableTimer = 0;
    } else if (newState === EngineState.PLAYING && oldState === EngineState.START) {
      this.initialHighScore = this.highScore;
      this.invulnerableTimer = 0;
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
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= dt;
    }

    if (this.state === EngineState.START) {
      this.hoverTimer += dt;
      this.bird.y = 250 + Math.sin(this.hoverTimer * 5) * 6;
      this.bird.rotation = 0;
      this.parallax.update(dt, 80);
      this.particleEngine.update(dt);
    } else if (this.state === EngineState.PLAYING) {
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= dt;
      }

      const effectiveDt = (this.powerUpManager && this.powerUpManager.activeEffects.isSlowMo)
        ? dt * 0.60
        : dt;

      this.bird.update(effectiveDt);
      this.pipeManager.update(effectiveDt, this.bird.x);
      this.powerUpManager.update(dt, this.pipeManager.scrollSpeed, this.bird);
      this.parallax.update(effectiveDt, 160);
      this.particleEngine.update(dt);

      // ⚡ Bolt: Use cached CollisionSystem.NO_COLLISION instead of new object { collided: false }
      const hit = (this.invulnerableTimer <= 0)
        ? CollisionSystem.checkAll(this.bird, this.pipeManager.getPipes(), this.playHeight)
        : CollisionSystem.NO_COLLISION;

      if (hit.collided) {
        if (this.gameModeManager && this.gameModeManager.currentMode === 'ZEN') {
          // Zen mode: soft bounce without game over
          this.bird.vy = -220;
        } else if (this.powerUpManager && this.powerUpManager.consumeShield()) {
          // Shield absorbed collision! Give invulnerability window to clear pipe
          this.bird.vy = -260;
          this.invulnerableTimer = 0.6; // 0.6s grace period
          this.particleEngine.emitCollisionBurst(this.bird.x, this.bird.y);
          this.screenShakeTimer = 0.2;
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

    this.ctx.save();

    // Camera screen shake offset
    if (this.screenShakeTimer > 0) {
      const shakeX = (Math.random() * 8 - 4);
      const shakeY = (Math.random() * 8 - 4);
      this.ctx.translate(shakeX, shakeY);
    }

    // 1. Multi-layer Parallax & Weather Background
    this.parallax.render(this.ctx);

    // 2. Pipes, Power-ups & Entities
    this.pipeManager.render(this.ctx);
    this.powerUpManager.render(this.ctx);
    this.particleEngine.render(this.ctx);

    // Render soft ground drop shadow under bird
    if (this.bird.y < this.playHeight - 14) {
      this.ctx.save();
      const shadowY = this.playHeight - 2;
      const heightRatio = Math.max(0, 1 - (this.playHeight - this.bird.y) / 450);
      const shadowWidth = (this.bird.radius * 1.4) * (0.5 + 0.5 * heightRatio);
      const shadowAlpha = 0.25 * heightRatio;

      // ⚡ Bolt: Removed per-frame string allocation for drop shadow
      this.ctx.globalAlpha = shadowAlpha;
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.ellipse(this.bird.x, shadowY, shadowWidth, shadowWidth * 0.35, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
      this.ctx.restore();
    }

    // Render bird (flash during invulnerability)
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      this.ctx.globalAlpha = 0.4;
    }
    this.bird.render(this.ctx);
    this.ctx.globalAlpha = 1.0;

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

    // 4. Render Active Power-Up Effects HUD (Top Right)
    if (this.powerUpManager && this.state === EngineState.PLAYING) {
      const fx = this.powerUpManager.activeEffects;
      // ⚡ Bolt: Removed per-frame array and object allocations for pills
      if (fx.hasShield || fx.starTimer > 0 || fx.slowMoTimer > 0) {
        this.ctx.save();
        let currY = 20;

        const drawPill = (text, color) => {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(this.width - 98, currY, 88, 20);
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(this.width - 98, currY, 88, 20);

          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = 'bold 9px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(text, this.width - 54, currY + 10);
          currY += 24;
        };

        if (fx.hasShield) drawPill('SHIELD', '#0284c7');
        if (fx.starTimer > 0) drawPill(`2X (${fx.starTimer.toFixed(1)}s)`, '#d97706');
        if (fx.slowMoTimer > 0) drawPill(`SLOW (${fx.slowMoTimer.toFixed(1)}s)`, '#7e22ce');

        this.ctx.restore();
      }
    }

    this.ctx.restore();
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
