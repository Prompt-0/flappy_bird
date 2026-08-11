# Scope: Milestone 2 (Visual Effects & Polish)

## Architecture
Milestone 2 implements visual polish modules for Flappy Bird:
- `public/js/visuals/Parallax.js`: 5-layer parallax scrolling background (Sky, Mountains, Hills, Bushes, Ground) with speed ratios (0.15x, 0.40x, 0.75x, 1.0x), modulo seamless wrapping, and 4-phase day/night weather cycle (Day, Sunset, Night, Dawn) with sky gradient lerping, celestial orbital arc (Sun/Moon), and starfield.
- `public/js/visuals/ParticleEngine.js`: 200-capacity pre-allocated object pool particle engine for flap trails, collision bursts, and score sparkles.
- `public/js/visuals/SpriteCache.js`: Offscreen canvas pre-rendering for pipes, ground tiles, and parallax layers.
- Unit test suite: `tests/unit/test_visuals.js` verifying parallax scroll math, particle recycling without allocation, and day/night state transitions.

## Feature Inventory
| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 7 | 5-Layer Parallax Background | Continuous parallax scrolling (Sky, Mountains, Hills, Bushes, Ground) with speed ratios (0.15x, 0.40x, 0.75x, 1.0x) | DONE |
| 8 | Modulo Seamless Layer Wrapping | Modulo wrap calculation for infinite horizontal scrolling without visual seams | DONE |
| 9 | Dynamic Day/Night Weather Cycle | 4-phase sky gradient & tint transitions (Day, Sunset, Night, Dawn) with celestial orbital arc (Sun/Moon) & starfield | DONE |
| 10 | Particle Engine & Object Pool | 200-capacity pre-allocated particle pool for flap trails, collision bursts, and score sparkles | DONE |
| 11 | Offscreen Sprite Caching | Offscreen canvas pre-rendering for pipes, ground tiles, and parallax layers for 60 FPS performance | DONE |

## Interface Contracts
- Parallax exports/class: `Parallax(canvasWidth, canvasHeight)` with methods `update(dt, scrollSpeed)`, `render(ctx)`, `getPhase()`, etc.
- ParticleEngine exports/class: `ParticleEngine(capacity = 200)` with pre-allocated pool, methods `emitFlapTrail(x, y)`, `emitCollisionBurst(x, y)`, `emitScoreSparkles(x, y)`, `update(dt)`, `render(ctx)`, `getActiveCount()`.
- SpriteCache exports/class: `SpriteCache` for offscreen canvas pre-rendering of pipes, ground tiles, parallax layers.
- Unit tests: `tests/unit/test_visuals.js` runnable via `node tests/unit/test_visuals.js`.

## Code Layout
```
/root/Projects/flappy_bird/
├── public/js/visuals/
│   ├── Parallax.js
│   ├── ParticleEngine.js
│   └── SpriteCache.js
└── tests/unit/
    └── test_visuals.js
```
