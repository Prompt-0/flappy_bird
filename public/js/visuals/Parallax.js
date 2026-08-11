/**
 * Parallax.js - 5-Layer Parallax Background & Dynamic Day/Night Weather Cycle Engine
 *
 * Layers:
 *  0: Sky       (0.0x) - Static/Gradient lerp
 *  1: Mountains (0.15x) - Distant mountain silhouettes
 *  2: Hills     (0.40x) - Rolling green/teal hills
 *  3: Bushes    (0.75x) - Foreground shrubs & foliage
 *  4: Ground    (1.0x)  - Playfield ground tile band
 */

export const WeatherPhase = {
  DAY: 'DAY',
  SUNSET: 'SUNSET',
  NIGHT: 'NIGHT',
  DAWN: 'DAWN'
};

const PHASE_ORDER = [WeatherPhase.DAY, WeatherPhase.SUNSET, WeatherPhase.NIGHT, WeatherPhase.DAWN];

// Color definitions for sky top and bottom per weather phase [R, G, B]
const SKY_PALETTES = {
  [WeatherPhase.DAY]: {
    top: [78, 192, 202],     // Bright cyan sky
    bottom: [160, 224, 255]   // Pale blue horizon
  },
  [WeatherPhase.SUNSET]: {
    top: [74, 37, 69],       // Deep dusk purple
    bottom: [255, 126, 95]    // Vivid sunset orange/pink
  },
  [WeatherPhase.NIGHT]: {
    top: [11, 29, 58],       // Midnight navy
    bottom: [26, 54, 93]      // Deep twilight blue
  },
  [WeatherPhase.DAWN]: {
    top: [44, 62, 80],       // Dawn slate blue
    bottom: [243, 156, 18]    // Golden sunrise yellow
  }
};

function lerpColor(colorA, colorB, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  const r = Math.round(colorA[0] + (colorB[0] - colorA[0]) * clampedT);
  const g = Math.round(colorA[1] + (colorB[1] - colorA[1]) * clampedT);
  const b = Math.round(colorA[2] + (colorB[2] - colorA[2]) * clampedT);
  return `rgb(${r}, ${g}, ${b})`;
}

export class Parallax {
  constructor(width = 360, height = 640, options = {}) {
    this.width = width;
    this.height = height;
    this.playHeight = options.playHeight || 528;

    // 5 Parallax layers with speed ratios
    this.layers = [
      { name: 'sky', ratio: 0.0, offset: 0, width: this.width },
      { name: 'mountains', ratio: 0.15, offset: 0, width: this.width },
      { name: 'hills', ratio: 0.40, offset: 0, width: this.width },
      { name: 'bushes', ratio: 0.75, offset: 0, width: this.width },
      { name: 'ground', ratio: 1.0, offset: 0, width: this.width }
    ];

    // Weather Cycle State
    this.currentPhase = options.initialPhase || WeatherPhase.DAY;
    this.targetPhase = this.currentPhase;
    this.phaseTransitionProgress = 1.0; // 1.0 = fully in currentPhase
    this.phaseDuration = options.phaseDuration || 30; // Seconds per phase if auto-cycling
    this.autoCycle = options.autoCycle !== undefined ? options.autoCycle : true;
    this.phaseTimer = 0;
    this.phaseProgress = 0.5; // Progress within current phase (0 = start, 0.5 = zenith/mid, 1 = end)

    // Starfield for Night / Twilight
    this.stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * (this.playHeight * 0.65),
      radius: 0.6 + Math.random() * 1.4,
      baseAlpha: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 1.5 + Math.random() * 3.0,
      twinklePhase: Math.random() * Math.PI * 2,
      currentAlpha: 0.5
    }));
  }

  update(dt, scrollSpeed = 160) {
    if (dt <= 0) return;

    // 1. Update Parallax Layer Offsets using Modulo Wrapping Math
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.ratio > 0) {
        layer.offset = (layer.offset + scrollSpeed * layer.ratio * dt) % layer.width;
      }
    }

    // 2. Weather Cycle Timer & Auto Progression
    if (this.autoCycle) {
      this.phaseTimer += dt;
      this.phaseProgress = (this.phaseTimer % this.phaseDuration) / this.phaseDuration;

      const currentPhaseIdx = Math.floor(this.phaseTimer / this.phaseDuration) % PHASE_ORDER.length;
      const nextPhaseIdx = (currentPhaseIdx + 1) % PHASE_ORDER.length;

      const activePhase = PHASE_ORDER[currentPhaseIdx];
      const targetPhase = PHASE_ORDER[nextPhaseIdx];

      // Lerp transition during last 20% of phase duration
      const transitionWindow = 0.2;
      const phaseSubProgress = (this.phaseTimer % this.phaseDuration) / this.phaseDuration;

      if (phaseSubProgress > (1 - transitionWindow)) {
        this.currentPhase = activePhase;
        this.targetPhase = targetPhase;
        this.phaseTransitionProgress = (phaseSubProgress - (1 - transitionWindow)) / transitionWindow;
      } else {
        this.currentPhase = activePhase;
        this.targetPhase = activePhase;
        this.phaseTransitionProgress = 1.0;
      }
    }

    // 3. Starfield Twinkle Updates
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.twinklePhase += star.twinkleSpeed * dt;
      star.currentAlpha = star.baseAlpha * (0.6 + 0.4 * Math.sin(star.twinklePhase));
    }
  }

  getPhase() {
    return this.currentPhase;
  }

  setPhase(phase) {
    if (WeatherPhase[phase]) {
      this.currentPhase = WeatherPhase[phase];
      this.targetPhase = WeatherPhase[phase];
      this.phaseTransitionProgress = 1.0;
      this.phaseTimer = PHASE_ORDER.indexOf(this.currentPhase) * this.phaseDuration;
      this.phaseProgress = 0.5;
    }
  }

  getLayerOffsets() {
    const offsets = [
      this.layers[0].offset,
      this.layers[1].offset,
      this.layers[2].offset,
      this.layers[3].offset,
      this.layers[4].offset
    ];
    offsets.sky = this.layers[0].offset;
    offsets.mountains = this.layers[1].offset;
    offsets.hills = this.layers[2].offset;
    offsets.bushes = this.layers[3].offset;
    offsets.ground = this.layers[4].offset;
    return offsets;
  }

  getSkyColors() {
    const paletteCurrent = SKY_PALETTES[this.currentPhase] || SKY_PALETTES[WeatherPhase.DAY];
    const paletteTarget = SKY_PALETTES[this.targetPhase] || paletteCurrent;

    const t = (this.currentPhase === this.targetPhase) ? 1.0 : this.phaseTransitionProgress;

    const top = lerpColor(paletteCurrent.top, paletteTarget.top, t);
    const bottom = lerpColor(paletteCurrent.bottom, paletteTarget.bottom, t);

    const result = [top, bottom];
    result.top = top;
    result.bottom = bottom;
    return result;
  }

  getCelestialPosition() {
    const cx = this.width / 2;
    const rx = (this.width / 2) - 30; // Radius along X axis (starts at x=30 horizon, peaks at x=180 zenith, ends at x=330)
    const horizonY = this.playHeight * 0.75;
    const arcHeight = 220;

    let celestialType = 'sun';
    let p = 0; // Normalized orbital angle index (0.0 = east horizon -> 0.5 = zenith -> 1.0 = west horizon)

    if (this.currentPhase === WeatherPhase.DAY) {
      celestialType = 'sun';
      p = this.phaseProgress; // 0.0 (East) -> 0.5 (Zenith 180px) -> 1.0 (West)
    } else if (this.currentPhase === WeatherPhase.SUNSET) {
      celestialType = 'sun';
      p = 1.0 + (this.phaseProgress * 0.35); // Sinks below West horizon ground
    } else if (this.currentPhase === WeatherPhase.NIGHT) {
      celestialType = 'moon';
      p = this.phaseProgress; // 0.0 (East) -> 0.5 (Zenith 180px) -> 1.0 (West)
    } else if (this.currentPhase === WeatherPhase.DAWN) {
      celestialType = 'moon';
      p = 1.0 + (this.phaseProgress * 0.35); // Sinks below West horizon ground as dawn breaks
    }

    const angle = p * Math.PI;
    const x = cx - rx * Math.cos(angle);
    const y = horizonY - arcHeight * Math.sin(angle);

    return {
      x,
      y,
      angle,
      type: celestialType
    };
  }

  render(ctx) {
    if (!ctx) return;

    const skyColors = this.getSkyColors();

    // 1. Layer 0: Sky Gradient
    const skyGradient = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, 0, this.playHeight) : null;
    if (skyGradient && skyGradient.addColorStop) {
      skyGradient.addColorStop(0, skyColors.top);
      skyGradient.addColorStop(1, skyColors.bottom);
      ctx.fillStyle = skyGradient;
    } else {
      ctx.fillStyle = skyColors.bottom;
    }
    ctx.fillRect(0, 0, this.width, this.playHeight);

    // 2. Celestial Body (Sun / Moon) & Volumetric Rays
    const celestial = this.getCelestialPosition();
    ctx.save();
    if (celestial.type === 'sun') {
      // 1. Volumetric God-Rays
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#fffbeb';
      const rayCount = 6;
      for (let i = 0; i < rayCount; i++) {
        const rayAngle = (i * Math.PI / 3) + (this.phaseTimer * 0.05);
        ctx.beginPath();
        ctx.moveTo(celestial.x, celestial.y);
        ctx.lineTo(celestial.x + Math.cos(rayAngle - 0.15) * 350, celestial.y + Math.sin(rayAngle - 0.15) * 350);
        ctx.lineTo(celestial.x + Math.cos(rayAngle + 0.15) * 350, celestial.y + Math.sin(rayAngle + 0.15) * 350);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 2. Outer Sun Corona Halo
      ctx.fillStyle = 'rgba(255, 234, 100, 0.18)';
      ctx.beginPath();
      ctx.arc(celestial.x, celestial.y, 42, 0, Math.PI * 2);
      ctx.fill();

      // 3. Middle Glow
      ctx.fillStyle = 'rgba(255, 234, 100, 0.35)';
      ctx.beginPath();
      ctx.arc(celestial.x, celestial.y, 28, 0, Math.PI * 2);
      ctx.fill();

      // 4. Core Sun Disk
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(celestial.x, celestial.y, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Moon Outer Halo
      ctx.fillStyle = 'rgba(240, 243, 244, 0.2)';
      ctx.beginPath();
      ctx.arc(celestial.x, celestial.y, 28, 0, Math.PI * 2);
      ctx.fill();

      // Moon Body
      ctx.fillStyle = '#f0f3f4';
      ctx.beginPath();
      ctx.arc(celestial.x, celestial.y, 18, 0, Math.PI * 2);
      ctx.fill();

      // Moon crater details
      ctx.fillStyle = '#d5dbdb';
      ctx.beginPath();
      ctx.arc(celestial.x - 4, celestial.y - 3, 5, 0, Math.PI * 2);
      ctx.arc(celestial.x + 5, celestial.y + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Starfield Rendering (Night / Twilight)
    const nightFactor = (this.currentPhase === WeatherPhase.NIGHT) ? 1.0 :
                       (this.currentPhase === WeatherPhase.SUNSET || this.currentPhase === WeatherPhase.DAWN) ? 0.4 : 0.0;
    if (nightFactor > 0) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        ctx.globalAlpha = star.currentAlpha * nightFactor;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Layer 1: Mountains (0.15x)
    const mOffset = this.layers[1].offset;
    this.renderMountains(ctx, -mOffset);
    this.renderMountains(ctx, this.width - mOffset);

    // 5. Layer 2: Hills (0.40x)
    const hOffset = this.layers[2].offset;
    this.renderHills(ctx, -hOffset);
    this.renderHills(ctx, this.width - hOffset);

    // 6. Layer 3: Bushes (0.75x)
    const bOffset = this.layers[3].offset;
    this.renderBushes(ctx, -bOffset);
    this.renderBushes(ctx, this.width - bOffset);

    // 7. Layer 4: Ground (1.0x)
    const gOffset = this.layers[4].offset;
    this.renderGround(ctx, -gOffset);
    this.renderGround(ctx, this.width - gOffset);
  }

  renderMountains(ctx, offsetX) {
    ctx.save();
    ctx.fillStyle = (this.currentPhase === WeatherPhase.NIGHT) ? '#1c2833' : '#4a6572';
    ctx.beginPath();
    ctx.moveTo(offsetX, this.playHeight);
    ctx.lineTo(offsetX + 40, this.playHeight - 80);
    ctx.lineTo(offsetX + 90, this.playHeight - 40);
    ctx.lineTo(offsetX + 150, this.playHeight - 120);
    ctx.lineTo(offsetX + 220, this.playHeight - 60);
    ctx.lineTo(offsetX + 290, this.playHeight - 110);
    ctx.lineTo(offsetX + 360, this.playHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderHills(ctx, offsetX) {
    ctx.save();
    ctx.fillStyle = (this.currentPhase === WeatherPhase.NIGHT) ? '#196f3d' : '#27ae60';
    ctx.beginPath();
    ctx.moveTo(offsetX, this.playHeight);
    ctx.arc(offsetX + 90, this.playHeight, 70, Math.PI, 0);
    ctx.arc(offsetX + 270, this.playHeight, 90, Math.PI, 0);
    ctx.lineTo(offsetX + 360, this.playHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderBushes(ctx, offsetX) {
    ctx.save();
    ctx.fillStyle = (this.currentPhase === WeatherPhase.NIGHT) ? '#145a32' : '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(offsetX, this.playHeight);
    ctx.arc(offsetX + 40, this.playHeight - 10, 25, Math.PI, 0);
    ctx.arc(offsetX + 140, this.playHeight - 10, 30, Math.PI, 0);
    ctx.arc(offsetX + 240, this.playHeight - 10, 22, Math.PI, 0);
    ctx.arc(offsetX + 320, this.playHeight - 10, 28, Math.PI, 0);
    ctx.lineTo(offsetX + 360, this.playHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderGround(ctx, offsetX) {
    const groundY = this.playHeight;
    const groundHeight = this.height - this.playHeight;

    ctx.save();
    // Dirt base
    ctx.fillStyle = '#ded895';
    ctx.fillRect(offsetX, groundY, this.width, groundHeight);

    // Top grass strip
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(offsetX, groundY, this.width, 14);

    // Dark green edge line
    ctx.fillStyle = '#558022';
    ctx.fillRect(offsetX, groundY + 14, this.width, 3);
    ctx.restore();
  }
}
