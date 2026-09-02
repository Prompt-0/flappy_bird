import os
import re

# 1. GameEngine.js
engine_file = 'public/js/engine/GameEngine.js'
with open(engine_file, 'r') as f:
    engine_code = f.read()

engine_code = engine_code.replace("""    this.bird = new Bird(this.eventBus);
    this.pipeManager = new PipeManager(this.eventBus);
    this.parallax = new Parallax(360, 640, { playHeight: 528 });
    this.particleEngine = new ParticleEngine(200);
    this.spriteCache = new SpriteCache();""", """    this.spriteCache = new SpriteCache();
    this.bird = new Bird(this.eventBus);
    this.pipeManager = new PipeManager(this.eventBus, { spriteCache: this.spriteCache });
    this.parallax = new Parallax(360, 640, { playHeight: 528, spriteCache: this.spriteCache });
    this.particleEngine = new ParticleEngine(200);""")
with open(engine_file, 'w') as f:
    f.write(engine_code)

# 2. PipeManager.js
pipe_file = 'public/js/engine/PipeManager.js'
with open(pipe_file, 'r') as f:
    pipe_code = f.read()

pipe_code = pipe_code.replace("""    this.spawnInterval = config.spawnInterval || 200; // px interval

    this.reset();""", """    this.spawnInterval = config.spawnInterval || 200; // px interval

    // ⚡ Bolt: Store injected SpriteCache for off-screen rendering optimization
    this.spriteCache = config.spriteCache || null;

    this.reset();""")

pipe_code = pipe_code.replace("""  render(ctx) {
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
  }""", """  render(ctx) {
    if (!ctx) return;

    // ⚡ Bolt: Optimization - Use pre-rendered offscreen canvas sprites instead of expensive per-frame primitive drawing
    // Impact: Avoids multiple fillRect and strokeRect calls per pipe, reducing main thread rendering time significantly.
    if (this.spriteCache) {
      const pipeSprite = this.spriteCache.getPipeSprite(this.pipeWidth, 400); // 400 is max height for cache
      for (const pipe of this.pipes) {
        // Top Pipe - Draw upside down using save/restore context transforms
        ctx.save();
        ctx.translate(pipe.x, pipe.topHeight);
        ctx.scale(1, -1);
        ctx.drawImage(pipeSprite, 0, 0, this.pipeWidth, pipe.topHeight, 0, 0, this.pipeWidth, pipe.topHeight);
        ctx.restore();

        // Bottom Pipe
        ctx.drawImage(pipeSprite, 0, 0, this.pipeWidth, pipe.bottomHeight, pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
      }
    } else {
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
  }""")
with open(pipe_file, 'w') as f:
    f.write(pipe_code)

# 3. Parallax.js
parallax_file = 'public/js/visuals/Parallax.js'
with open(parallax_file, 'r') as f:
    parallax_code = f.read()

parallax_code = parallax_code.replace("""    this.playHeight = config.playHeight || (this.height - 112);""", """    this.playHeight = config.playHeight || (this.height - 112);
    // ⚡ Bolt: Store injected SpriteCache for off-screen rendering optimization
    this.spriteCache = config.spriteCache || null;""")

parallax_code = parallax_code.replace("""  renderGround(ctx, offsetX) {
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
  }""", """  renderGround(ctx, offsetX) {
    const groundY = this.playHeight;
    const groundHeight = this.height - this.playHeight;

    // ⚡ Bolt: Optimization - Use pre-rendered offscreen canvas sprites instead of expensive per-frame primitive drawing
    // Impact: Avoids multiple fillRect calls per frame, reducing main thread rendering time significantly.
    if (this.spriteCache) {
      const groundSprite = this.spriteCache.getGroundSprite(this.width, groundHeight);
      ctx.drawImage(groundSprite, offsetX, groundY);
    } else {
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
  }""")

with open(parallax_file, 'w') as f:
    f.write(parallax_code)
