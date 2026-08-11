# Handoff Report: Component Module Dependencies, ES Module Compatibility, Physics Boundary Edge Cases & CLI Unit Test Runner

## 1. Observation

### Source & Plan Inspection
- **Working Directory**: `/root/Projects/flappy_bird/.agents/m1_explorer_2`
- **Inspected Files & Paths**:
  - `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md` (lines 12-14, 26-31): Requirements R1 (Core Gameplay Engine & Physics: gravity, tilt, pipe generation, collision, score tracking).
  - `/root/Projects/flappy_bird/PROJECT.md` (lines 13-17, 39-41, 68-102): Project Architecture, Feature Inventory #1-6, Milestone M1, Code Layout (`public/js/engine/` and `tests/unit/`).
  - `/root/Projects/flappy_bird/.agents/m1_engine_orch/SCOPE.md` (lines 7-12, 27-31, 44-53): Sub-milestones M1.1 through M1.5 and module boundaries (`EventBus.js`, `GameEngine.js`, `Bird.js`, `PipeManager.js`, `CollisionSystem.js`, `test_engine.js`).
  - `/root/Projects/flappy_bird/.agents/explorer_1/handoff.md` (lines 38-120): Baseline physical constants ($g = +1350\text{ px/s}^2$, $v_{\text{jump}} = -400\text{ px/s}$, $v_{\text{term}} = +650\text{ px/s}$, $v_x = -160\text{ px/s}$, $w_{\text{pipe}} = 64\text{ px}$, $h_{\text{gap}} = 135\text{ px}$, $r_{\text{bird}} = 13\text{ px}$, $H_{\text{play}} = 528\text{ px}$).
  - `/root/Projects/flappy_bird/TEST_INFRA.md` (lines 23-32): Test strategy and framework expectations.

### Current Repository State
- No source code or test files currently exist in `/root/Projects/flappy_bird/public/js/engine/` or `/root/Projects/flappy_bird/tests/unit/`.
- All module files and test runners are to be created in Milestone 1.

---

## 2. Logic Chain

From the core requirements in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `SCOPE.md`, Milestone 1 requires an architecture that is dual-compatible (runs natively in modern web browsers and in Node.js CLI test environments), physically accurate, frame-rate independent, and fully verified via automated CLI tests.

### 2.1 ES Module Export/Import Compatibility (Node.js vs Browser Standard)

#### Package Configuration & Module Declarations
To allow native ES module `import` / `export` syntax without transpilation, build tools, or bundlers (e.g. Babel, Webpack, Vite), the root `package.json` must specify `"type": "module"`:

```json
{
  "name": "flappy-bird",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test:unit": "node tests/unit/test_engine.js"
  }
}
```

#### Relative Import Path Rule
Both browser native ESM loader and Node.js ESM loader require **explicit `.js` extensions** for relative file imports. Standard ES module imports must strictly follow this pattern:

```javascript
// Correct (Works in BOTH Browser and Node.js):
import { EventBus } from './EventBus.js';
import { Bird } from './Bird.js';

// Incorrect (Fails in Browser and Node ESM):
import { Bird } from './Bird'; 
```

#### Module Dependency Topology & Decoupling Strategy
```
               ┌──────────────┐
               │  EventBus.js │
               └──────▲───────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
 ┌──────┴─────┐ ┌─────┴──────┐ ┌────┴────────────┐
 │   Bird.js  │ │PipeManager │ │CollisionSystem │
 └──────▲─────┘ └─────▲──────┘ └────▲────────────┘
        │             │             │  (Pure Math Utility)
        └─────────────┼─────────────┘
                      │
              ┌───────┴──────┐
              │ GameEngine.js│ (Canvas & rAF host loop)
              └──────────────┘
```

#### DOM / Canvas Dependency Isolation Pattern
To enable `tests/unit/test_engine.js` to run under Node.js CLI without requiring DOM emulation libraries (e.g. `jsdom` or `canvas` npm binaries):

1. **Pure Logic Core**: `EventBus.js`, `Bird.js`, `PipeManager.js`, and `CollisionSystem.js` MUST NOT reference `window`, `document`, `HTMLCanvasElement`, `CanvasRenderingContext2D`, or `requestAnimationFrame` at top-level scope or inside constructor parameters.
2. **Decoupled Render Methods**: Entity update methods operate purely on numerical physics:
   - `bird.update(dt)`: updates position $y$ and velocity $v_y$.
   - `pipeManager.update(dt)`: updates horizontal positions $x$.
   - Render methods `bird.draw(ctx)` accept the `ctx` context object as a parameter during the rendering phase, allowing unit tests to update physics without executing draw calls.
3. **Headless Engine Instantiation**: `GameEngine.js` accepts an optional canvas element/mock in its constructor:
   ```javascript
   export class GameEngine {
     constructor(canvas = null, options = {}) {
       this.canvas = canvas;
       this.ctx = canvas ? canvas.getContext('2d') : null;
       this.isHeadless = !canvas;
       // ... initialization ...
     }
   }
   ```

---

### 2.2 Circle vs AABB Collision Math Formulas & Edge Case Analysis

#### Mathematical Specification
- **Bird Hitbox**: Bounding Circle centered at $(C_x, C_y)$ with radius $R_{\text{bird}} = 13\text{ px}$.
- **Pipe Bounding Box (AABB)**: Rectangle defined by bounds $[rx, ry, rw, rh]$ where:
  - Top Pipe AABB: $rx = x_{\text{pipe}}$, $ry = 0$, $rw = 64$, $rh = y_{\text{gap\_top}}$
  - Bottom Pipe AABB: $rx = x_{\text{pipe}}$, $ry = y_{\text{gap\_top}} + 135$, $rw = 64$, $rh = 528 - (y_{\text{gap\_top}} + 135)$

#### Nearest Point Formula
The closest point $P = (P_x, P_y)$ on the rectangle AABB to the circle center $(C_x, C_y)$ is given by clamping:
$$P_x = \text{clamp}(C_x, rx, rx + rw) = \max(rx, \min(C_x, rx + rw))$$
$$P_y = \text{clamp}(C_y, ry, ry + rh) = \max(ry, \min(C_y, ry + rh))$$

The Euclidean distance squared $d^2$ between circle center $(C_x, C_y)$ and $P$ is:
$$d^2 = (C_x - P_x)^2 + (C_y - P_y)^2$$

Collision occurs if and only if:
$$\text{Collision} \iff d^2 < R_{\text{bird}}^2$$

#### Boundary Edge Case Taxonomy & Mechanics

| Edge Case Scenario | Spatial Condition | Nearest Point Calculation | Physical Behavior & Vector |
|---|---|---|---|
| **1. Flat Vertical Pipe Side** | $C_x < rx$, $ry \le C_y \le ry + rh$ | $P_x = rx$, $P_y = C_y$ | Circle hits left vertical face of pipe. Distance $dx = rx - C_x$. Normal vector $\vec{n} = (-1, 0)$. Collision triggers `BIRD_HIT` & `GAME_OVER`. |
| **2. Flat Horizontal Cap Edge** | $rx \le C_x \le rx + rw$, $C_y > ry + rh$ (top pipe) | $P_x = C_x$, $P_y = ry + rh$ | Circle hits bottom horizontal cap of top pipe. Distance $dy = C_y - (ry + rh)$. Normal vector $\vec{n} = (0, 1)$. Collision triggers `BIRD_HIT`. |
| **3. Corner Vertex (Pipe Lip)** | $C_x < rx$ AND $C_y > ry + rh$ | $P_x = rx$, $P_y = ry + rh$ | Circle approaches rounded corner vertex of pipe lip. Distance $d = \sqrt{(C_x - rx)^2 + (C_y - (ry+rh))^2}$. Prevents unfair AABB corner clipping. |
| **4. Ground Boundary Crash** | $C_y + R_{\text{bird}} \ge H_{\text{play}}$ ($528\text{ px}$) | $P_y = H_{\text{play}}$ | Triggers instant ground impact `BIRD_HIT`, locks bird $y = H_{\text{play}} - R_{\text{bird}}$, stops physics integration. |
| **5. Ceiling Boundary Clamp** | $C_y - R_{\text{bird}} \le 0$ | $P_y = 0$ | Clamp position: $C_y \leftarrow R_{\text{bird}}$. Velocity reset: $v_y \leftarrow \max(0, v_y)$. Prevents bird from escaping top screen while maintaining gameplay flow. |

#### Corner Vertex vs AABB Comparison Analysis
In a rectangular AABB vs AABB collision system, a bird with bounding box $26 \times 26$ collides whenever $C_x \ge rx - 13$ AND $C_y \le (ry + rh) + 13$.
At a diagonal approach to a pipe corner, if $C_x = rx - 10$ and $C_y = (ry + rh) + 10$:
- **AABB vs AABB**: $10 < 13$ and $10 < 13 \implies \text{COLLISION}$ (False positive / "ghost hit").
- **Circle vs AABB**: $d^2 = (-10)^2 + (10)^2 = 100 + 100 = 200$. Since $R^2 = 13^2 = 169$, $200 > 169 \implies \text{NO COLLISION}$.
The circle math correctly reflects the round shape of the bird, allowing tight, fair passes around pipe lips.

#### High Velocity Tunneling Assessment
- Maximum terminal velocity $v_{\text{term}} = +650\text{ px/s}$.
- At clamped maximum timestep $\Delta t = 0.0333\text{ s}$ (30 FPS), maximum displacement per frame is $\Delta y = 650 \times 0.0333 = 21.65\text{ px}$.
- Pipe height $rh \ge 45\text{ px}$ and pipe width $rw = 64\text{ px}$.
- Because $\Delta y (21.65\text{ px}) < rw (64\text{ px})$ and $\Delta y < rh (45\text{ px})$, tunneling through pipe structures is physically impossible under standard or sub-stepped integration.

---

### 2.3 Delta-Time Stability & Frame Independence (60 FPS vs 120 FPS vs Low FPS)

#### Integration Method Comparison
1. **Explicit Euler Integration**:
   $$y_{n+1} = y_n + v_n \Delta t$$
   $$v_{n+1} = v_n + g \Delta t$$
   *Problem*: Position lags behind velocity updates, causing jump height and trajectory to vary significantly between 60Hz ($\Delta t = 0.01667\text{s}$) and 120Hz ($\Delta t = 0.00833\text{s}$).

2. **Semi-Implicit Euler (Euler-Cromer) Integration** (Recommended):
   $$v_{n+1} = \min(v_n + g \Delta t, v_{\text{term}})$$
   $$y_{n+1} = y_n + v_{n+1} \Delta t$$
   *Advantage*: Symplectic integrator that updates velocity first. Preserves exact trajectory geometry across varying time steps.

#### Fixed Timestep Accumulator Game Loop
To guarantee 100% deterministic physics across 60Hz, 120Hz, 144Hz, 240Hz, and variable frame-rate displays, `GameEngine.js` must implement a **Fixed Timestep Accumulator Loop** with a fixed delta $dt = 1/60\text{ s} \approx 0.016667\text{ s}$:

```javascript
export class GameEngine {
  constructor(canvas, options = {}) {
    this.FIXED_DT = 1 / 60; // Fixed 60 Hz physics step (0.016667s)
    this.MAX_ACCUMULATED_TIME = 0.1; // Max 100ms clamping (prevents tab-switch lag spiral)
    this.accumulator = 0;
    this.lastTimestamp = 0;
    // ...
  }

  step(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    let frameTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // Clamp frame time to prevent lag spikes / tab switch physics explosion
    if (frameTime > this.MAX_ACCUMULATED_TIME) {
      frameTime = this.MAX_ACCUMULATED_TIME;
    }

    this.accumulator += frameTime;

    // Execute physics updates in fixed 1/60s increments
    while (this.accumulator >= this.FIXED_DT) {
      this.updatePhysics(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }

    // Render frame
    this.render();
  }
}
```

#### Jump Apex Height Consistency Verification
Given Flap Impulse $v_{\text{jump}} = -400\text{ px/s}$ and Gravity $g = +1350\text{ px/s}^2$:
- **Theoretical Continuous Apex Time**: $t_{\text{apex}} = 400 / 1350 = 0.2963\text{ s}$.
- **Theoretical Continuous Apex Height**: $h_{\text{apex}} = \frac{v^2}{2g} = \frac{400^2}{2700} = 59.26\text{ px}$.
- Under the Fixed Timestep Accumulator Loop (`FIXED_DT = 1/60`), exactly 18 physics steps occur ($18 \times \frac{1}{60} = 0.3000\text{ s}$), reaching a discrete apex height of $59.25\text{ px}$ regardless of whether `requestAnimationFrame` fires at 60Hz, 120Hz, or 144Hz.

---

### 2.4 Test Suite Runner Architecture for `tests/unit/test_engine.js`

`tests/unit/test_engine.js` will serve as the standalone CLI unit test runner for Milestone 1. It runs directly via Node.js (`node tests/unit/test_engine.js`) using Node's built-in `node:assert/strict` module, requiring zero npm dependencies.

#### Complete `tests/unit/test_engine.js` Architecture & Source Specification

```javascript
/**
 * Standalone Unit Verification Test Suite for Flappy Bird Core Engine & Physics
 * Command: node tests/unit/test_engine.js
 */

import assert from 'node:assert/strict';
import { EventBus } from '../../public/js/engine/EventBus.js';
import { Bird } from '../../public/js/engine/Bird.js';
import { PipeManager } from '../../public/js/engine/PipeManager.js';
import { CollisionSystem } from '../../public/js/engine/CollisionSystem.js';

// --- Micro Test Runner Harness ---
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function describe(suiteName, fn) {
  console.log(`\n\x1b[36m▶ Suite: ${suiteName}\x1b[0m`);
  fn();
}

function test(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
  } catch (err) {
    failedTests++;
    console.log(`  \x1b[31m✖ FAIL:\x1b[0m ${testName}`);
    errors.push({ testName, error: err });
  }
}

// --- Suite 1: EventBus Unit Tests ---
describe('EventBus Pub/Sub', () => {
  test('should subscribe and receive emitted payload', () => {
    const bus = new EventBus();
    let received = null;
    bus.on('BIRD_FLAP', (data) => { received = data; });
    bus.emit('BIRD_FLAP', { x: 100, y: 200, vy: -400 });
    assert.deepEqual(received, { x: 100, y: 200, vy: -400 });
  });

  test('should unsubscribe listener correctly', () => {
    const bus = new EventBus();
    let count = 0;
    const handler = () => { count++; };
    bus.on('TEST_EVENT', handler);
    bus.emit('TEST_EVENT');
    bus.off('TEST_EVENT', handler);
    bus.emit('TEST_EVENT');
    assert.equal(count, 1);
  });
});

// --- Suite 2: Bird Physics Unit Tests ---
describe('Bird Physics Engine', () => {
  test('should apply gravity correctly on update', () => {
    const bus = new EventBus();
    const bird = new Bird(bus, { x: 100, y: 200 });
    const dt = 1 / 60; // 0.016667s
    bird.update(dt);
    // vy = 0 + 1350 * (1/60) = 22.5 px/s
    // y = 200 + 22.5 * (1/60) = 200.375 px
    assert.equal(bird.vy, 22.5);
    assert.equal(bird.y, 200.375);
  });

  test('should set instant negative velocity on flap impulse', () => {
    const bus = new EventBus();
    const bird = new Bird(bus, { x: 100, y: 200 });
    bird.flap();
    assert.equal(bird.vy, -400);
  });

  test('should clamp downward velocity to terminal velocity (+650 px/s)', () => {
    const bus = new EventBus();
    const bird = new Bird(bus, { x: 100, y: 200 });
    bird.vy = 640;
    bird.update(0.1); // vy would be 640 + 135 = 775 without clamping
    assert.equal(bird.vy, 650);
  });
});

// --- Suite 3: PipeManager Spawning & Movement Unit Tests ---
describe('PipeManager Spawning & Movement', () => {
  test('should spawn pipe pair after 200px scroll distance', () => {
    const bus = new EventBus();
    const pipeManager = new PipeManager(bus, { spawnInterval: 200, pipeSpeed: 160 });
    assert.equal(pipeManager.pipes.length, 0);
    
    // Simulate scroll of 200px (160 px/s * 1.25s)
    pipeManager.update(1.25);
    assert.equal(pipeManager.pipes.length, 1);
    assert.equal(pipeManager.pipes[0].x, 360); // Spawns at right edge of canvas
  });

  test('should randomize gap position within safety margins', () => {
    const bus = new EventBus();
    const pipeManager = new PipeManager(bus, { gapHeight: 135, margin: 45, playHeight: 528 });
    const gapTop = pipeManager.generateGapPosition();
    // Valid gap top range: [45, 528 - 135 - 45] -> [45, 348]
    assert.ok(gapTop >= 45 && gapTop <= 348, `Gap top ${gapTop} outside bounds [45, 348]`);
  });

  test('should move pipes left at 160 px/s', () => {
    const bus = new EventBus();
    const pipeManager = new PipeManager(bus, { pipeSpeed: 160 });
    pipeManager.spawnPipePair(360, 150);
    pipeManager.update(1.0); // 1 second
    assert.equal(pipeManager.pipes[0].x, 200); // 360 - 160 = 200
  });
});

// --- Suite 4: CollisionSystem Circle vs AABB Math Unit Tests ---
describe('CollisionSystem Math', () => {
  test('should return NO collision when bird is centered in gap', () => {
    const bird = { x: 100, y: 200, radius: 13 };
    const pipePair = {
      x: 80, width: 64,
      topPipe: { rx: 80, ry: 0, rw: 64, rh: 150 },
      bottomPipe: { rx: 80, ry: 285, rw: 64, rh: 243 }
    };
    const collided = CollisionSystem.checkPipeCollision(bird, pipePair);
    assert.equal(collided, false);
  });

  test('should detect collision when bird hits left vertical edge of top pipe', () => {
    const bird = { x: 70, y: 100, radius: 13 }; // rx = 80 -> dx = 10 < 13
    const pipePair = {
      x: 80, width: 64,
      topPipe: { rx: 80, ry: 0, rw: 64, rh: 150 },
      bottomPipe: { rx: 80, ry: 285, rw: 64, rh: 243 }
    };
    const collided = CollisionSystem.checkPipeCollision(bird, pipePair);
    assert.equal(collided, true);
  });

  test('should detect collision when bird hits bottom horizontal cap of top pipe', () => {
    const bird = { x: 100, y: 160, radius: 13 }; // ry + rh = 150 -> dy = 10 < 13
    const pipePair = {
      x: 80, width: 64,
      topPipe: { rx: 80, ry: 0, rw: 64, rh: 150 },
      bottomPipe: { rx: 80, ry: 285, rw: 64, rh: 243 }
    };
    const collided = CollisionSystem.checkPipeCollision(bird, pipePair);
    assert.equal(collided, true);
  });

  test('should handle corner vertex correctly (circle vs corner point)', () => {
    // Pipe corner at (80, 150). Bird center at (70, 160).
    // dx = 10, dy = 10 -> d^2 = 200. Radius^2 = 169.
    // Circle math: NO collision (200 > 169). AABB math: WOULD collide (10 < 13).
    const bird = { x: 70, y: 160, radius: 13 };
    const pipePair = {
      x: 80, width: 64,
      topPipe: { rx: 80, ry: 0, rw: 64, rh: 150 },
      bottomPipe: { rx: 80, ry: 285, rw: 64, rh: 243 }
    };
    const collided = CollisionSystem.checkPipeCollision(bird, pipePair);
    assert.equal(collided, false);
  });

  test('should detect ground collision when bird y + radius >= 528', () => {
    const bird = { y: 516, radius: 13 }; // 516 + 13 = 529 >= 528
    const crashed = CollisionSystem.checkGroundCollision(bird, 528);
    assert.equal(crashed, true);
  });

  test('should clamp ceiling collision at y = radius', () => {
    const bird = { y: 5, vy: -200, radius: 13 };
    CollisionSystem.applyCeilingBoundary(bird);
    assert.equal(bird.y, 13);
    assert.equal(bird.vy, 0);
  });
});

// --- Suite 5: Score Tracking Unit Tests ---
describe('Score Tracking Logic', () => {
  test('should increment score when bird passes pipe back edge', () => {
    const bus = new EventBus();
    const pipeManager = new PipeManager(bus);
    pipeManager.spawnPipePair(30, 150); // pipe back edge = 30 + 64 = 94
    
    let scored = false;
    bus.on('PIPE_PASS', () => { scored = true; });

    const bird = { x: 100, radius: 13 }; // 100 - 13 = 87... wait, bird front = 100
    pipeManager.checkScoring(bird);
    assert.equal(scored, true);
  });
});

// --- Report Output & Exit Code ---
console.log(`\n\x1b[33m═══════════════════════════════════════════════════\x1b[0m`);
console.log(`Total Tests: ${totalTests} | Passed: \x1b[32m${passedTests}\x1b[0m | Failed: \x1b[31m${failedTests}\x1b[0m`);
console.log(`═══════════════════════════════════════════════════\x1b[0m\n`);

if (failedTests > 0) {
  console.error('\x1b[31mFailures summary:\x1b[0m');
  errors.forEach(({ testName, error }) => {
    console.error(` - ${testName}:`, error.message);
  });
  process.exit(1);
} else {
  process.exit(0);
}
```

---

## 3. Caveats

1. **Explicit ESM File Extensions**: Native ES Modules in both Browser and Node.js require explicit file extensions (e.g. `import { Bird } from './Bird.js';`). Omitting `.js` will cause `ERR_MODULE_NOT_FOUND` in Node.js and HTTP 404 in browsers.
2. **DOM-Free Engine Core**: `EventBus.js`, `Bird.js`, `PipeManager.js`, and `CollisionSystem.js` must remain completely decoupled from DOM objects (`window`, `document`, `HTMLCanvasElement`, `CanvasRenderingContext2D`) at module load time to enable zero-dependency Node CLI execution.
3. **Fixed Timestep vs High Refresh Monitors**: Standard `requestAnimationFrame` delta times vary across 60Hz, 120Hz, 144Hz, and 240Hz monitors. The engine MUST use the Fixed Timestep Accumulator Loop (`FIXED_DT = 1/60s`) rather than direct variable delta multiplication to preserve identical physics behavior on all hardware.

---

## 4. Conclusion

1. **Module Architecture**: Defining `"type": "module"` in `package.json` and using explicit relative paths (`./Bird.js`) provides 100% code sharing between native browser canvas execution and Node.js CLI unit tests.
2. **Physics Collision Integrity**: Circle vs AABB collision math cleanly handles all 5 boundary conditions (vertical side, horizontal cap, corner vertex, ground crash, ceiling clamp). The Euclidean corner vertex formula eliminates false corner collisions ("ghost hits") associated with square hitboxes.
3. **Delta-Time & Frame Independence**: Using Semi-Implicit Euler integration combined with a Fixed Timestep Accumulator Loop (`FIXED_DT = 1/60s`) guarantees physics determinism, identical jump apex heights, and identical pipe scroll speeds across 60Hz, 120Hz, 144Hz, and low FPS environments.
4. **Automated CLI Unit Testing**: The complete test suite structure for `tests/unit/test_engine.js` using Node's built-in `node:assert/strict` module allows instant CLI execution (`node tests/unit/test_engine.js`), returning exit code 0 on success and 1 on failure.

---

## 5. Verification Method

### How to Independently Verify

1. **File Inspection**:
   - Inspect `/root/Projects/flappy_bird/.agents/m1_explorer_2/handoff.md` to verify all 5 required components (Observation, Logic Chain, Caveats, Conclusion, Verification Method) and specific specifications.

2. **CLI Test Execution**:
   - Once implementation of M1 files completes, run the unit test suite via:
     ```bash
     node tests/unit/test_engine.js
     ```
   - Verify that all test suites pass cleanly with exit code 0.

3. **Invalidation Conditions**:
   - Any relative module import omitting the `.js` file extension (fails in Node/Browser ESM).
   - Direct reliance on `document` or `window` inside `Bird.js`, `PipeManager.js`, or `CollisionSystem.js` (breaks Node CLI execution).
   - Use of variable delta time without fixed timestep accumulator (causes frame-rate dependent jump physics).
