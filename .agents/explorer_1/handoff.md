# Handoff Report: R1 Core Gameplay Engine & Physics Survey & Design

## 1. Observation

### Repository State & Directory Structure
- **Path**: `/root/Projects/flappy_bird`
- **Observed Contents**:
  - `list_dir` on `/root/Projects/flappy_bird` revealed: `.agents/` (1 directory, 0 source files).
  - `list_dir` on `/root/Projects/flappy_bird/.agents` revealed: `ORIGINAL_REQUEST.md`, `explorer_1/`, `explorer_2/`, `explorer_3/`, `orchestrator_1/`, `sentinel_1/`.
- **Verdict**: The repository currently contains zero source code files. Development starts from a clean slate.

### Verbatim Requirements for R1 (from `ORIGINAL_REQUEST.md`)
> **R1. Core Gameplay Engine & Physics**
> Build a responsive, bug-free Flappy Bird game engine using HTML5 Canvas & modern JavaScript. Mechanics must include accurate gravity physics, smooth bird velocity/tilt math, pipe generation with varied gap heights, precise collision detection, and score tracking.

Acceptance Criteria:
- Bird jumps responsively on Space key, mouse click, or touch tap with natural acceleration and rotational tilt.
- Pipes spawn at consistent, playable intervals with randomized gap positions.
- Precise collision detection triggers game over state immediately upon collision with pipe, ground, or ceiling.
- Score increases by 1 each time the bird passes through a pipe pair.

---

## 2. Logic Chain

From the observations of an empty codebase and the detailed acceptance criteria in `ORIGINAL_REQUEST.md`, the design of R1 must establish a modular, frame-rate independent engine that underpins all subsequent visual (R2), audio/customization (R3), and UI (R4) features.

Below is the step-by-step mathematical and architectural specification derived for R1:

### 2.1 HTML5 Canvas Setup & Game Loop Design
- **Virtual Resolution**: $360 \times 640$ pixels (standard 9:16 portrait canvas).
- **Device Pixel Ratio (DPR) Handling**:
  $$\text{canvas.width} = \text{cssWidth} \times \text{window.devicePixelRatio}$$
  $$\text{canvas.height} = \text{cssHeight} \times \text{window.devicePixelRatio}$$
  $$\text{ctx.scale}(\text{dpr}, \text{dpr})$$
  Ensures crisp rendering on high-DPI (Retina) displays while maintaining internal $360 \times 640$ logical coordinate space.

- **Game Loop & Delta Time ($\Delta t$) Handling**:
  - Use `requestAnimationFrame(gameLoop)`.
  - Calculate frame delta: $\Delta t = \min((t_{\text{current}} - t_{\text{last}}) / 1000, 0.1)$.
  - Clamping $\Delta t \le 0.1\text{ s}$ (100ms) mitigates delta spikes when changing browser tabs or resuming from pause.
  - Timestep scale factor: $dt_{\text{factor}} = \Delta t \times 60$.

- **State Machine**:
  - `INIT`: Engine initialized, assets loading.
  - `READY`: Bird hovering in idle sine-wave motion, waiting for first input.
  - `PLAYING`: Active physics, pipe spawning, collision checks.
  - `PAUSED`: Game loop paused, state preserved.
  - `GAME_OVER`: Bird falls to ground (if in air), controls disabled, score finalized.

---

### 2.2 Bird Physics & Rotational Math
- **State Variables**:
  - Position: $(x_{\text{bird}}, y_{\text{bird}})$, fixed $x_{\text{bird}} = 100\text{ px}$.
  - Velocity: $v_y$ (pixels/second).
  - Rotation: $\theta$ (radians).

- **Physics Constants**:
  - Gravity ($g$): $+1350\text{ px/s}^2$ ($+0.375\text{ px/frame}^2$ at 60 FPS).
  - Flap Impulse ($v_{\text{jump}}$): $-400\text{ px/s}$ (instantaneous vertical velocity replacement).
  - Terminal Velocity ($v_{\text{term}}$): $+650\text{ px/s}$.

- **Velocity Integration**:
  $$v_y(t + \Delta t) = \min(v_y(t) + g \cdot \Delta t, v_{\text{term}})$$
  $$y_{\text{bird}}(t + \Delta t) = y_{\text{bird}}(t) + v_y(t + \Delta t) \cdot \Delta t$$

- **Rotational Tilt Math**:
  - Flap angle: When flapped, $\theta \leftarrow -20^\circ$ ($-0.349\text{ rad}$) instantly.
  - Falling angle calculation:
    When $v_y > 150\text{ px/s}$ (bird descending):
    $$\theta_{\text{target}} = \min\left(+90^\circ, -20^\circ + \frac{v_y - 150}{v_{\text{term}} - 150} \times 110^\circ\right)$$
  - Interpolation (Lerp):
    $$\theta(t + \Delta t) = \text{Lerp}(\theta(t), \theta_{\text{target}}, 10 \cdot \Delta t)$$

---

### 2.3 Pipe Generation & Motion Math
- **Constants & Layout**:
  - Pipe Width ($w_{\text{pipe}}$): $64\text{ px}$.
  - Gap Height ($h_{\text{gap}}$): $135\text{ px}$ (default; scalable to $115\text{ px}$ for difficulty).
  - Ground Clearance ($h_{\text{ground}}$): $112\text{ px}$ (playable vertical space $H_{\text{play}} = 640 - 112 = 528\text{ px}$).
  - Top & Bottom Safety Margins ($y_{\text{margin}}$): $45\text{ px}$.
  - Horizontal Scroll Speed ($v_x$): $-160\text{ px/s}$.

- **Spawn Logic**:
  - Distance-based interval: Spawn new pipe pair every $200\text{ px}$ of horizontal scroll.
  - Gap Vertical Position ($y_{\text{gap\_top}}$):
    $$y_{\text{gap\_top}} = \text{random}(y_{\text{margin}}, H_{\text{play}} - h_{\text{gap}} - y_{\text{margin}})$$
  - Top Pipe AABB: $[x_{\text{pipe}}, 0, w_{\text{pipe}}, y_{\text{gap\_top}}]$
  - Bottom Pipe AABB: $[x_{\text{pipe}}, y_{\text{gap\_top}} + h_{\text{gap}}, w_{\text{pipe}}, H_{\text{play}} - (y_{\text{gap\_top}} + h_{\text{gap}})]$

---

### 2.4 Collision Detection Algorithms
- **Bird Hitbox**: Bounding Circle $(x_c, y_c)$ centered at bird midpoint, with radius $r_{\text{bird}} = 13\text{ px}$ (forgiving inner circle).
- **Circle vs Axis-Aligned Bounding Box (AABB) Algorithm**:
  For each pipe rectangle $R = [rx, ry, rw, rh]$:
  1. Find closest point $(cx, cy)$ on rectangle to circle center $(x_c, y_c)$:
     $$cx = \text{clamp}(x_c, rx, rx + rw)$$
     $$cy = \text{clamp}(y_c, ry, ry + rh)$$
  2. Compute distance squared:
     $$d^2 = (x_c - cx)^2 + (y_c - cy)^2$$
  3. Collision Condition:
     $$\text{Collided} \iff d^2 < r_{\text{bird}}^2$$

- **Ceiling & Ground Collision**:
  - Ground: $y_c + r_{\text{bird}} \ge H_{\text{play}}$ (Triggers immediate crash & `GAME_OVER`).
  - Ceiling: $y_c - r_{\text{bird}} \le 0$ (Hard clamp $y_c = r_{\text{bird}}$ and reset $v_y = 0$, or trigger crash per config).

---

### 2.5 Score Tracking Logic
- Each Pipe Pair object maintains `passed: false`.
- On update:
  $$\text{if } (\neg \text{pipe.passed} \land (x_c - r_{\text{bird}} > x_{\text{pipe}} + w_{\text{pipe}})) \implies \text{score}++, \text{pipe.passed} \leftarrow \text{true}$$
- Emit `EVENT_SCORE_INCREASE` with updated score value.

---

### 2.6 Recommended Architecture & Data Structures
```
src/
├── engine/
│   ├── GameEngine.js       # Core game loop, canvas context, state machine
│   ├── EventBus.js         # Decoupled pub/sub event dispatcher
│   └── InputManager.js     # Touch, mouse, keyboard input normalization
├── entities/
│   ├── Bird.js             # Physics, jump impulse, tilt math, render bounding
│   └── PipeManager.js      # Spawning, recycling, scroll movement, gap math
└── physics/
    └── CollisionSystem.js  # Pure math collision algorithms (Circle vs AABB, bounds)
```

**Key Event Definitions (EventBus)**:
| Event Name | Payload | Primary Subscribers |
|---|---|---|
| `ENGINE_STATE_CHANGE` | `{ oldState, newState }` | UI Overlay Manager, Audio Engine |
| `BIRD_FLAP` | `{ x, y, vy }` | Visual FX (Particle Engine), Audio FX |
| `PIPE_SPAWN` | `{ pipeId, x, gapTop, gapHeight }` | Visual FX |
| `PIPE_PASS` | `{ score, pipeId }` | Audio FX, UI Score Display, Achievement System |
| `BIRD_HIT` | `{ x, y, cause }` | Audio FX (Hit sound), Visual FX (Screen shake, burst particles) |
| `GAME_OVER` | `{ finalScore, isHighScore }` | UI Game Over Modal, Persistence Storage |

---

## 3. Caveats

- **No Existing Code**: As there are currently no source files in `/root/Projects/flappy_bird`, initial module creation must establish clean ES module imports/exports.
- **Physics Tuning**: Constants ($g = 1350$, $v_{\text{jump}} = -400$, $h_{\text{gap}} = 135$) are tuned for classic Flappy Bird feel, but should be defined in a centralized `Config.js` object for easy fine-tuning.
- **Rendering Separation**: R1 focuses strictly on math, logic, collision, and basic canvas drawing. Visual polish (sprites, parallax, day/night cycles) in R2 will hook directly into entity render methods without altering core physics logic.

---

## 4. Conclusion

R1 Core Gameplay Engine & Physics design is fully specified with exact mathematical models for:
1. Delta-time clamped fixed/variable game loop with responsive high-DPI HTML5 canvas setup.
2. Accurate bird gravity, jump impulse, terminal velocity, and smooth velocity-based rotational tilt.
3. Frame-rate independent distance-based pipe spawning and gap height calculation.
4. Circle vs AABB collision detection ensuring tight, fair, bug-free gameplay.
5. Event-driven architecture allowing clean integration with R2 (Visuals), R3 (Audio/Storage), and R4 (UI).

---

## 5. Verification Method

### How to Independently Verify:
1. **File Inspection**:
   - Inspect `/root/Projects/flappy_bird/.agents/explorer_1/handoff.md` to verify all 5 components (Observation, Logic Chain, Caveats, Conclusion, Verification Method) and specific R1 technical designs.
2. **Mathematical Correctness**:
   - Confirm Circle vs AABB collision logic ($d^2 < r^2$) against standard geometry algorithms.
   - Confirm Delta time clamping ($\Delta t \le 0.1\text{ s}$) prevents tab-switch physics explosions.
3. **Execution Readiness**:
   - Once implementation begins, verify using unit tests (e.g. Vitest/Jest or standalone test runner) targeting `CollisionSystem.js` and `Bird.js` physics updates.
