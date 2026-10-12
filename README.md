# Flappy Bird Deluxe

[![Tests](https://img.shields.io/badge/tests-41%2F41%20passing-brightgreen?style=for-the-badge&logo=node.js)](https://github.com/Prompt-0/flappy_bird)
[![Canvas](https://img.shields.io/badge/canvas-HTML5%2060Hz%2F120Hz-orange?style=for-the-badge&logo=html5)](https://github.com/Prompt-0/flappy_bird)
[![Zero-Alloc](https://img.shields.io/badge/particles-zero--alloc%20object%20pool-blue?style=for-the-badge)](https://github.com/Prompt-0/flappy_bird)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

A high-performance, deterministic web arcade game engine featuring fixed-timestep physics, circle-vs-AABB continuous collision detection, a zero-allocation particle pooling engine, and a dynamic 24-hour celestial orbit and atmospheric lighting system.

---

## ⚡ Engineering Architecture & Features

- **Deterministic Fixed-Timestep Physics**: Accumulator-based game loop decoupling render framerate from physics simulation. Guarantees bit-identical flight trajectories across 60 Hz, 120 Hz, and 144 Hz display refresh rates.
- **Accurate Circle-to-AABB Collisions**: Exact geometric collision detection calculating euclidean distances to pipe rectangle edges and clamped corners, eliminating false bounding-box corner deaths.
- **Zero-Allocation Particle Engine**: Pre-allocates a fixed pool of 200 recycled particle objects in memory, eliminating garbage collection (GC) stutter during intense flapping trails.
- **Dynamic 24h Celestial & Weather Cycle**: Smooth linear interpolation between Day, Sunset, Night, and Dawn phases with dynamic sky gradients and solar/lunar orbital arcs.
- **Offscreen Canvas Sprite Caching**: Renders complex metallic pipe gradients, ground textures, and celestial bodies to offscreen canvas buffers once, optimizing draw calls per frame.
- **Error-Isolated EventBus**: Custom publish-subscribe architecture isolating subscriber exceptions during emission.
- **100% Automated Test Suite**: 41 comprehensive unit tests covering physics math, pipe spawning intervals, collision corner cases, particle pooling, and parallax scrolling.

---

## 🕹️ Controls

| Input | Action |
| :--- | :--- |
| `Space` / `Click` / `Tap` | Flap Impulse (Upward Velocity) |
| `P` | Pause / Resume Game |
| `R` | Restart After Game Over |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/Prompt-0/flappy_bird.git
cd flappy_bird

# Install dependencies
npm install

# Run complete engine test suite (23 tests)
npm run test:unit

# Run visual & particle engine tests (18 tests)
npm run test:visuals

# Start local server
npm start
```

---

## 🧪 Testing Verification

```bash
# Run all unit and visual tests
npm test
npm run test:visuals
```

All 41 tests execute in headless Node.js / JSDOM without external test runner bloat.

---

## 📄 License
Licensed under the MIT License.
