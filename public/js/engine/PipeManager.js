/**
 * PipeManager Entity
 * Horizontal scroll speed: -160 px/s
 * Spawn interval: Every 200 px of horizontal scroll
 * Gap height: 135 px, Pipe width: 64 px
 * Ground level: 528 px (640 - 112)
 * Safety margins: 45 px top/bottom -> Gap top range [45, 348] px
 * Emits PIPE_SPAWN and PIPE_PASS events
 */
export class PipeManager {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.pipeWidth = config.pipeWidth || 64;
    this.gapHeight = config.gapHeight || 135;
    this.scrollSpeed = config.scrollSpeed || 160; // px/s
    this.playHeight = config.playHeight || 528;
    this.margin = config.margin || 45;
    this.spawnInterval = config.spawnInterval || 200; // px interval

    this.reset();
  }

  reset() {
    this.pipes = [];
    this.distanceScrolled = 0;
    this.lastSpawnDistance = 0;
    this.nextPipeId = 1;
    this.score = 0;
  }

  generateGapPosition() {
    const minGapTop = this.margin; // 45
    const maxGapTop = this.playHeight - this.gapHeight - this.margin; // 528 - 135 - 45 = 348
    return Math.floor(Math.random() * (maxGapTop - minGapTop + 1)) + minGapTop;
  }

  spawnPipePair(xPosition = 360, gapTopOverride = null) {
    const topHeight = gapTopOverride !== null ? gapTopOverride : this.generateGapPosition();
    const bottomY = topHeight + this.gapHeight;
    const bottomHeight = this.playHeight - bottomY;

    const pipePair = {
      id: this.nextPipeId++,
      x: xPosition,
      width: this.pipeWidth,
      topHeight: topHeight,
      bottomY: bottomY,
      bottomHeight: bottomHeight,
      gapHeight: this.gapHeight,
      scored: false,
      topPipe: { rx: xPosition, ry: 0, rw: this.pipeWidth, rh: topHeight },
      bottomPipe: { rx: xPosition, ry: bottomY, rw: this.pipeWidth, rh: bottomHeight }
    };

    this.pipes.push(pipePair);

    if (this.eventBus) {
      this.eventBus.emit('PIPE_SPAWN', {
        pipeId: pipePair.id,
        x: pipePair.x,
        topHeight: pipePair.topHeight,
        bottomY: pipePair.bottomY,
        gapHeight: pipePair.gapHeight
      });
    }

    return pipePair;
  }

  checkScoring(bird) {
    const birdX = typeof bird === 'number' ? bird : (bird && bird.x !== undefined ? bird.x : 100);
    for (const pipe of this.pipes) {
      if (!pipe.scored && birdX > pipe.x + this.pipeWidth) {
        pipe.scored = true;
        this.score++;
        if (this.eventBus) {
          this.eventBus.emit('PIPE_PASS', { score: this.score, pipeId: pipe.id });
        }
      }
    }
  }

  update(dt, birdX = 100) {
    const moveDistance = this.scrollSpeed * dt;
    this.distanceScrolled += moveDistance;

    // 1. Scroll active pipes left
    for (const pipe of this.pipes) {
      pipe.x -= moveDistance;
      pipe.topPipe.rx = pipe.x;
      pipe.bottomPipe.rx = pipe.x;
    }

    // 2. Check distance-based spawning strictly after 200px scroll displacement
    if (this.distanceScrolled - this.lastSpawnDistance >= this.spawnInterval - 1e-5) {
      this.spawnPipePair(360);
      this.lastSpawnDistance += this.spawnInterval;
    }

    // 3. Score clearance check
    this.checkScoring(birdX);

    // 4. Recycle offscreen pipes
    this.pipes = this.pipes.filter(p => p.x + this.pipeWidth > 0);
  }

  getPipes() {
    return this.pipes;
  }

  render(ctx) {
    if (!ctx) return;
    ctx.fillStyle = '#73bf2e';
    ctx.strokeStyle = '#558022';
    ctx.lineWidth = 2;

    for (const pipe of this.pipes) {
      // Top Pipe
      ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
      ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);

      // Bottom Pipe
      ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
      ctx.strokeRect(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
    }
  }
}
