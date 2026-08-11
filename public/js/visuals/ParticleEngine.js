/**
 * ParticleEngine.js - High-Performance Particle Engine with Zero-Allocation Object Pool
 *
 * Pre-allocates a fixed pool of exactly 200 particle objects upfront in constructor.
 * NO `new Particle()` or object literal `{}` creations are performed during emission,
 * update, or recycling cycles.
 */

export class ParticleEngine {
  constructor(capacity = 200) {
    this.capacity = capacity;
    this.pool = new Array(capacity);

    // Pre-allocate exactly 200 particle objects upfront
    for (let i = 0; i < capacity; i++) {
      this.pool[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        color: '#ffffff',
        size: 2,
        gravity: 0,
        alpha: 1,
        type: 'default'
      };
    }
  }

  getPoolCapacity() {
    return this.capacity;
  }

  getActiveCount() {
    let count = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.pool[i].active) {
        count++;
      }
    }
    return count;
  }

  reset() {
    for (let i = 0; i < this.capacity; i++) {
      this.pool[i].active = false;
    }
  }

  /**
   * Internal helper to acquire a particle object from pre-allocated pool.
   * If all 200 particles are active, recycles the particle with lowest remaining life.
   * NEVER allocates memory (no `new` or `{}`).
   */
  _acquireParticle() {
    // 1. Search for first inactive particle
    for (let i = 0; i < this.capacity; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }

    // 2. Pool saturated (all 200 active): recycle particle with lowest remaining life
    let minIndex = 0;
    let minLife = this.pool[0].life;
    for (let i = 1; i < this.capacity; i++) {
      if (this.pool[i].life < minLife) {
        minLife = this.pool[i].life;
        minIndex = i;
      }
    }
    return this.pool[minIndex];
  }

  /**
   * Mutates pre-allocated particle properties in-place.
   */
  _activateParticle(p, x, y, vx, vy, life, color, size, gravity = 0, type = 'default') {
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.color = color;
    p.size = size;
    p.gravity = gravity;
    p.alpha = 1.0;
    p.type = type;
  }

  /**
   * Preset 1: emitFlapTrail(x, y)
   * Subtle dust/wind particles emitted behind bird during flap.
   */
  emitFlapTrail(x, y) {
    const count = 4;
    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      const vx = -60 + (Math.random() * 40 - 20);
      const vy = (Math.random() * 40 - 20);
      const life = 0.3 + Math.random() * 0.2;
      const size = 2 + Math.random() * 2;
      const color = '#ffffff';
      const gravity = -30;

      this._activateParticle(p, x, y, vx, vy, life, color, size, gravity, 'flap');
    }
  }

  /**
   * Preset 2: emitCollisionBurst(x, y)
   * Radial burst of feathers/sparks on impact.
   */
  emitCollisionBurst(x, y) {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 180;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.5 + Math.random() * 0.4;
      const size = 3 + Math.random() * 3;
      const color = (i % 3 === 0) ? '#f39c12' : ((i % 3 === 1) ? '#e74c3c' : '#ffffff');
      const gravity = 350;

      this._activateParticle(p, x, y, vx, vy, life, color, size, gravity, 'collision');
    }
  }

  /**
   * Preset 3: emitScoreSparkles(x, y)
   * Upward/outward glittering score celebration particles.
   */
  emitScoreSparkles(x, y) {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const p = this._acquireParticle();
      const angle = -Math.PI / 2 + (Math.random() * 1.4 - 0.7);
      const speed = 120 + Math.random() * 160;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.6 + Math.random() * 0.4;
      const size = 2.5 + Math.random() * 2.5;
      const color = (i % 2 === 0) ? '#ffd700' : '#ffffff';
      const gravity = 120;

      this._activateParticle(p, x, y, vx, vy, life, color, size, gravity, 'score');
    }
  }

  update(dt) {
    if (dt <= 0) return;

    for (let i = 0; i < this.capacity; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  render(ctx) {
    if (!ctx) return;

    for (let i = 0; i < this.capacity; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
