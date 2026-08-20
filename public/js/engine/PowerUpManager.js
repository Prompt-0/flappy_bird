/**
 * PowerUpManager.js - Manages floating power-up collectibles inside pipe gaps,
 * active effect timers, shield protection, score multipliers, and slow-motion warp.
 */

export const PowerUpType = {
  SHIELD: 'SHIELD',
  STAR: 'STAR',
  SLOW_MO: 'SLOW_MO'
};

export class PowerUpManager {
  /**
   * @param {import('./EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.activeItems = [];
    this.activeEffects = {
      hasShield: false,
      scoreMultiplier: 1,
      starTimer: 0,
      isSlowMo: false,
      slowMoTimer: 0
    };

    this.itemRadius = 14;
    this.hoverTimer = 0;

    if (this.eventBus) {
      this.eventBus.on('PIPE_SPAWN', (data) => this.onPipeSpawned(data));
      this.eventBus.on('PIPE_SPAWNED', (data) => this.onPipeSpawned(data));
    }
  }

  reset() {
    this.activeItems = [];
    this.activeEffects = {
      hasShield: false,
      scoreMultiplier: 1,
      starTimer: 0,
      isSlowMo: false,
      slowMoTimer: 0
    };
    this.hoverTimer = 0;
  }

  onPipeSpawned(data) {
    if (!data || typeof data.x !== 'number') return;
    // 50% chance to spawn a power-up in a pipe gap
    if (Math.random() > 0.50) return;

    const types = [PowerUpType.SHIELD, PowerUpType.STAR, PowerUpType.SLOW_MO];
    const type = types[Math.floor(Math.random() * types.length)];
    const topH = (typeof data.topHeight === 'number') ? data.topHeight : (data.gapTop || 100);
    const gapH = (typeof data.gapHeight === 'number') ? data.gapHeight : 135;

    const item = {
      id: `powerup_${Date.now()}_${Math.random()}`,
      type,
      x: data.x + 32, // Center of 64px wide pipe
      y: topH + gapH / 2,
      baseY: topH + gapH / 2,
      collected: false
    };

    this.activeItems.push(item);
  }

  update(dt, scrollSpeed, bird) {
    this.hoverTimer += dt;

    // Update active effect timers
    if (this.activeEffects.starTimer > 0) {
      this.activeEffects.starTimer -= dt;
      if (this.activeEffects.starTimer <= 0) {
        this.activeEffects.scoreMultiplier = 1;
      }
    }

    if (this.activeEffects.slowMoTimer > 0) {
      this.activeEffects.slowMoTimer -= dt;
      if (this.activeEffects.slowMoTimer <= 0) {
        this.activeEffects.isSlowMo = false;
      }
    }

    // Scroll and check collisions for items
    const actualScroll = scrollSpeed * (this.activeEffects.isSlowMo ? 0.65 : 1.0);

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      item.x -= actualScroll * dt;
      item.y = item.baseY + Math.sin(this.hoverTimer * 4 + i) * 6;

      // Remove offscreen items
      if (item.x < -40) {
        this.activeItems.splice(i, 1);
        continue;
      }

      // Check collision with bird
      if (!item.collected && bird && !bird.isDead) {
        const dx = bird.x - item.x;
        const dy = bird.y - item.y;
        const distSq = dx * dx + dy * dy;
        const rSum = bird.radius + this.itemRadius;

        // Use distance squared to avoid expensive Math.sqrt calls
        if (distSq < rSum * rSum) {
          item.collected = true;
          this.applyPowerUp(item.type, bird);
          this.activeItems.splice(i, 1);
        }
      }
    }
  }

  applyPowerUp(type, bird) {
    if (type === PowerUpType.SHIELD) {
      this.activeEffects.hasShield = true;
      if (this.eventBus) this.eventBus.emit('POWERUP_COLLECTED', { type, title: 'Shield Active 🛡️' });
    } else if (type === PowerUpType.STAR) {
      this.activeEffects.scoreMultiplier = 2;
      this.activeEffects.starTimer = 5.0; // 5 seconds double score
      if (this.eventBus) this.eventBus.emit('POWERUP_COLLECTED', { type, title: '2x Score Star ⭐' });
    } else if (type === PowerUpType.SLOW_MO) {
      this.activeEffects.isSlowMo = true;
      this.activeEffects.slowMoTimer = 6.0; // 6 seconds slow motion
      if (this.eventBus) this.eventBus.emit('POWERUP_COLLECTED', { type, title: 'Slow Motion ⏳' });
    }
  }

  consumeShield() {
    if (this.activeEffects.hasShield) {
      this.activeEffects.hasShield = false;
      if (this.eventBus) this.eventBus.emit('SHIELD_BROKEN');
      return true;
    }
    return false;
  }

  render(ctx) {
    if (!ctx) return;

    this.activeItems.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);

      // Glow backdrop
      ctx.beginPath();
      ctx.arc(0, 0, this.itemRadius + 4, 0, Math.PI * 2);
      ctx.fillStyle = item.type === PowerUpType.SHIELD ? 'rgba(56, 189, 248, 0.45)' :
                      item.type === PowerUpType.STAR ? 'rgba(250, 204, 21, 0.45)' : 'rgba(168, 85, 247, 0.45)';
      ctx.fill();

      // Item Badge Circle
      ctx.beginPath();
      ctx.arc(0, 0, this.itemRadius, 0, Math.PI * 2);
      ctx.fillStyle = item.type === PowerUpType.SHIELD ? '#0284c7' :
                      item.type === PowerUpType.STAR ? '#d97706' : '#7e22ce';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // Badge Symbol / Text Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = item.type === PowerUpType.SHIELD ? 'SHD' : item.type === PowerUpType.STAR ? '2X' : 'SLOW';
      ctx.fillText(label, 0, 1);

      ctx.restore();
    });
  }
}
