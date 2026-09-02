1. **Understand Issue**: The prompt expects me to be "Bolt" ⚡, an agent focused on identifying and implementing performance improvements.
2. **Identify Bottleneck**: The `SpriteCache` class is designed for off-screen canvas pre-rendering of static assets (pipes, ground tiles) to improve performance, but it wasn't fully utilized in the `PipeManager` and `Parallax` classes for rendering the pipes and the ground. The game's `GameEngine.js` already instantiates a `SpriteCache`, but doesn't pass it to `PipeManager` or `Parallax`.
3. **Implement Optimization**:
    - Update `public/js/engine/GameEngine.js` to initialize `SpriteCache` *before* `PipeManager` and `Parallax`.
    - Pass the `SpriteCache` instance to `PipeManager` and `Parallax` via their constructors (in the `config` object or as an argument if supported).
    - Update `PipeManager.render` to use `this.spriteCache.getPipeSprite()` and `ctx.drawImage()` if the sprite cache is available, replacing multiple `fillRect` and `strokeRect` calls per pipe.
    - Update `Parallax.renderGround` to use `this.spriteCache.getGroundSprite()` and `ctx.drawImage()` if available, replacing primitive drawing calls for the ground.
4. **Verification**:
    - Run unit and visual tests (`npm run test`, `npm run test:visuals`) to ensure no logic is broken.
    - Manually check the modified files for syntactic correctness.
5. **Documentation**:
    - Add explicit comments indicating the "⚡ Bolt: Optimization" in the modified files.
    - Add an entry to `.jules/bolt.md` detailing the usage of `SpriteCache`.
6. **Pre-commit Instructions**: Run the required pre-commit checks.
7. **Submit**: Create a PR with the required title and description format.
