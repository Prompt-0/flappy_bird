/**
 * SpriteCache.js - Offscreen Canvas Pre-rendering & Caching Manager
 *
 * Pre-renders repeating static assets (pipes, ground tiles, visual backdrops) onto
 * offscreen canvas instances to ensure silky-smooth 60 FPS rendering.
 * Gracefully degrades when running in Node.js test environments without DOM canvas.
 */

export class SpriteCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Safe canvas creation supporting OffscreenCanvas, DOM Canvas, or Node.js Mock Canvas.
   */
  createCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        return new OffscreenCanvas(width, height);
      } catch (e) {
        // Fall back to DOM canvas if OffscreenCanvas fails
      }
    }
    if (typeof document !== 'undefined' && document.createElement) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    // Node.js test environment mock canvas
    return this._createMockCanvas(width, height);
  }

  _createMockCanvas(width, height) {
    const dummyCtx = {
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      strokeRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createPattern: () => ({}),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    };
    return {
      width,
      height,
      getContext: () => dummyCtx,
      isMock: true
    };
  }

  /**
   * Pre-renders and caches pipe sprite asset with glossy 3D cylindrical lighting.
   */
  getPipeSprite(width = 64, height = 400, color = '#73bf2e') {
    const key = `pipe_${width}_${height}_${color}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. 3D Cylindrical Main Body Gradient
      const bodyGrad = (ctx.createLinearGradient)
        ? ctx.createLinearGradient(0, 0, width, 0)
        : null;

      if (bodyGrad && bodyGrad.addColorStop) {
        bodyGrad.addColorStop(0, '#3e6b18');
        bodyGrad.addColorStop(0.18, '#8de635');
        bodyGrad.addColorStop(0.40, color);
        bodyGrad.addColorStop(0.80, '#4e821e');
        bodyGrad.addColorStop(1.0, '#2d4d11');
        ctx.fillStyle = bodyGrad;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(0, 0, width, height);

      // Specular highlight stripe
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(Math.floor(width * 0.12), 0, Math.max(2, Math.floor(width * 0.08)), height);

      // Outer crisp bevel stroke
      if (ctx.strokeRect) {
        ctx.strokeStyle = '#233d0e';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width - 2, height - 2);
      }

      // 2. Top Collar Cap with 3D Bevel & Drop Shadow
      const collarHeight = 24;
      const collarGrad = (ctx.createLinearGradient)
        ? ctx.createLinearGradient(0, 0, width, 0)
        : null;

      if (collarGrad && collarGrad.addColorStop) {
        collarGrad.addColorStop(0, '#4c821e');
        collarGrad.addColorStop(0.20, '#a2f547');
        collarGrad.addColorStop(0.45, color);
        collarGrad.addColorStop(0.85, '#4e821e');
        collarGrad.addColorStop(1.0, '#233d0e');
        ctx.fillStyle = collarGrad;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(0, 0, width, collarHeight);

      // Collar highlight & rim shadow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(Math.floor(width * 0.12), 0, Math.max(2, Math.floor(width * 0.08)), collarHeight);

      // Drop shadow underneath collar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, collarHeight, width, 5);

      if (ctx.strokeRect) {
        ctx.strokeStyle = '#1b300b';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width - 2, collarHeight - 2);
      }
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  /**
   * Pre-renders and caches repeating ground tile pattern sprite.
   */
  getGroundSprite(width = 360, height = 112) {
    const key = `ground_${width}_${height}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dirt soil base
      ctx.fillStyle = '#ded895';
      ctx.fillRect(0, 0, width, height);

      // Top grass strip
      ctx.fillStyle = '#73bf2e';
      ctx.fillRect(0, 0, width, 14);

      // Dark green border line
      ctx.fillStyle = '#558022';
      ctx.fillRect(0, 14, width, 3);

      // Diagonal soil hatch lines
      if (ctx.beginPath && ctx.stroke) {
        ctx.strokeStyle = '#cbb86b';
        ctx.lineWidth = 2;
        for (let x = -height; x < width + height; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, 17);
          ctx.lineTo(x + height, height);
          ctx.stroke();
        }
      }
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  clearCache() {
    this.cache.clear();
  }
}
