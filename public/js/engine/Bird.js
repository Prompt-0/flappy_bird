/**
 * Bird Physics Entity
 * Gravity: +1350 px/s²
 * Flap impulse: -400 px/s
 * Terminal velocity: +650 px/s
 * Rotational tilt: -20° on flap, smooth lerp to +90° as vy increases past +150 px/s.
 */
export class Bird {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.initialX = config.x !== undefined ? config.x : 100;
    this.initialY = config.y !== undefined ? config.y : 250;

    this.radius = 13;
    this.width = 34;
    this.height = 24;

    this.gravity = 1350;     // px/s²
    this.flapImpulse = -400; // px/s
    this.terminalVel = 650;  // px/s

    this.wingTimer = 0;
    this.palette = config.palette || {
      body: '#F7D02C',
      wing: '#E2AB18',
      belly: '#FFF59D',
      beak: '#FF6F00',
      eye: '#000000',
      outline: '#553C00'
    };

    this.reset(this.initialX, this.initialY);
  }

  setPalette(palette) {
    if (palette) {
      this.palette = { ...this.palette, ...palette };
    }
  }

  reset(x = this.initialX, y = this.initialY) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.rotation = 0; // radians
    this.wingTimer = 0;
    this.isDead = false;
  }

  flap() {
    if (this.isDead) return;
    this.vy = this.flapImpulse;
    this.rotation = -20 * (Math.PI / 180); // Instant -20° (-0.349066 rad)
    if (this.eventBus) {
      this.eventBus.emit('BIRD_FLAP', { x: this.x, y: this.y, vy: this.vy });
    }
  }

  update(dt) {
    // 1. Velocity and position integration (Semi-Implicit Euler)
    this.vy = Math.min(this.vy + this.gravity * dt, this.terminalVel);
    this.y += this.vy * dt;
    this.wingTimer += dt;

    // 2. Velocity-based rotational tilt math
    const minRot = -20 * (Math.PI / 180); // -20° (-0.349066 rad)
    const maxRot = 90 * (Math.PI / 180);  // +90° (+1.570796 rad)
    let targetRotation = minRot;

    if (this.vy > 150) {
      const factor = Math.min(1.0, (this.vy - 150) / (this.terminalVel - 150));
      targetRotation = minRot + factor * (maxRot - minRot);
    }

    // Rotational lerp smoothing
    const lerpRate = Math.min(1.0, 10 * dt);
    this.rotation += (targetRotation - this.rotation) * lerpRate;
  }

  getBoundingCircle() {
    return {
      x: this.x,
      y: this.y,
      radius: this.radius
    };
  }

  render(ctx) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const p = this.palette;

    // 1. Main body ellipse
    ctx.fillStyle = p.body || '#F7D02C';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.outline || '#553C00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. White belly patch
    ctx.fillStyle = p.belly || '#FFF59D';
    ctx.beginPath();
    ctx.arc(-2, 3, 7, 0, Math.PI * 2);
    ctx.fill();

    // 3. Beak (orange/red polygon)
    ctx.fillStyle = p.beak || '#FF6F00';
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.lineTo(16, 2);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.outline || '#553C00';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Eye & Pupil / Dead 'X'
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.outline || '#553C00';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.isDead) {
      // Dead 'X' eye
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -7);
      ctx.lineTo(6, -3);
      ctx.moveTo(6, -7);
      ctx.lineTo(2, -3);
      ctx.stroke();
    } else {
      // Pupil + reflection dot
      ctx.fillStyle = p.eye || '#000000';
      ctx.beginPath();
      ctx.arc(5, -5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4.2, -6, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Flapping Wing
    const wingY = Math.sin(this.wingTimer * 20) * 4;
    ctx.fillStyle = p.wing || '#E2AB18';
    ctx.beginPath();
    ctx.ellipse(-4, 2 + wingY, 7, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.outline || '#553C00';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}
