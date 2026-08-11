/**
 * ResponsiveScaler.js - 9:16 Aspect Ratio Canvas & Container Scaling Engine
 * Manages 360x640 logical resolution scaling, flexbox letterboxing/pillarboxing, and resize handling.
 */

export class ResponsiveScaler {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.logicalWidth=360]
   * @param {number} [options.logicalHeight=640]
   * @param {HTMLElement} [options.container]
   * @param {HTMLCanvasElement} [options.canvas]
   */
  constructor(options = {}) {
    this.logicalWidth = options.logicalWidth || 360;
    this.logicalHeight = options.logicalHeight || 640;
    this.container = options.container || null;
    this.canvas = options.canvas || null;

    this.aspectRatio = this.logicalWidth / this.logicalHeight; // 9:16 = 0.5625
    this.metrics = null;

    this._onResize = this._onResize.bind(this);
    this._attached = false;

    // Initial scale calculation if window exists
    if (typeof window !== 'undefined') {
      const w = window.innerWidth || this.logicalWidth;
      const h = window.innerHeight || this.logicalHeight;
      this.metrics = this.calculateScale(w, h);
    } else {
      this.metrics = this.calculateScale(this.logicalWidth, this.logicalHeight);
    }
  }

  /**
   * Calculate exact 9:16 aspect ratio scaling metrics for any viewport dimensions.
   * @param {number} windowWidth
   * @param {number} windowHeight
   * @returns {Object} Scaling metrics including scale factor, display dimensions, offsets, and letterbox/pillarbox flags.
   */
  calculateScale(windowWidth, windowHeight) {
    const targetRatio = this.aspectRatio;
    const windowRatio = windowWidth / windowHeight;

    let scale;
    let pillarbox = false;
    let letterbox = false;

    if (windowRatio > targetRatio) {
      // Screen is wider than 9:16 -> Pillarbox (bars on left/right)
      scale = windowHeight / this.logicalHeight;
      pillarbox = true;
    } else if (windowRatio < targetRatio) {
      // Screen is taller than 9:16 -> Letterbox (bars on top/bottom)
      scale = windowWidth / this.logicalWidth;
      letterbox = true;
    } else {
      scale = windowWidth / this.logicalWidth;
    }

    const displayWidth = Math.floor(this.logicalWidth * scale);
    const displayHeight = Math.floor(this.logicalHeight * scale);

    const offsetX = Math.floor((windowWidth - displayWidth) / 2);
    const offsetY = Math.floor((windowHeight - displayHeight) / 2);

    return {
      scale,
      displayWidth,
      displayHeight,
      width: displayWidth,
      height: displayHeight,
      offsetX,
      offsetY,
      pillarbox,
      letterbox
    };
  }

  /**
   * Recalculate layout based on window or container dimensions and apply DOM styles.
   * @returns {Object} Metrics
   */
  updateLayout() {
    let w = this.logicalWidth;
    let h = this.logicalHeight;

    if (typeof window !== 'undefined') {
      w = window.innerWidth;
      h = window.innerHeight;
    }

    if (this.container && this.container.clientWidth && this.container.clientHeight) {
      // If container has strict parent bounds
      w = this.container.parentElement ? this.container.parentElement.clientWidth : this.container.clientWidth;
      h = this.container.parentElement ? this.container.parentElement.clientHeight : this.container.clientHeight;
    }

    this.metrics = this.calculateScale(w, h);

    if (this.canvas) {
      this.canvas.style.width = `${this.metrics.displayWidth}px`;
      this.canvas.style.height = `${this.metrics.displayHeight}px`;
    }

    if (this.container) {
      this.container.style.width = `${this.metrics.displayWidth}px`;
      this.container.style.height = `${this.metrics.displayHeight}px`;
    }

    return this.metrics;
  }

  /**
   * Get last computed scaling metrics.
   * @returns {Object}
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Attach window resize event listener.
   */
  attach() {
    if (this._attached || typeof window === 'undefined') return;
    window.addEventListener('resize', this._onResize);
    this._attached = true;
    this.updateLayout();
  }

  /**
   * Detach window resize event listener.
   */
  detach() {
    if (!this._attached || typeof window === 'undefined') return;
    window.removeEventListener('resize', this._onResize);
    this._attached = false;
  }

  _onResize() {
    this.updateLayout();
  }
}
