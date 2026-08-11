# Handoff Report: Milestone 1 Specification Mining (Core Gameplay Engine & Physics)

## 1. Observation

### Source Material Audited
1. `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`: Lines 12-14 (R1 specification) and Lines 26-30 (Acceptance Criteria for Core Mechanics & Physics).
2. `/root/Projects/flappy_bird/PROJECT.md`: Lines 13-18 (Features 1-6), Lines 49-66 (Interface Contracts for EventBus and `window.__FLAPPY_GAME__`), Lines 68-102 (Code Layout).
3. `/root/Projects/flappy_bird/.agents/m1_engine_orch/SCOPE.md`: Lines 3-13 (Architecture & Modules), Lines 14-23 (M1 Feature Inventory), Lines 33-42 (EventBus specifications).
4. `/root/Projects/flappy_bird/.agents/explorer_1/handoff.md`: Lines 30-117 (Canvas setup, bird physics math, pipe spawning formulas, Circle vs AABB collision math).
5. `/root/Projects/flappy_bird/TEST_INFRA.md`: Lines 8-12 (Feature Coverage Goals for Tier 1-4 testing).

### Verbatim Requirements & Specifications Extracted
- **Logical Canvas Resolution**: 360px width $\times$ 640px height (9:16 aspect ratio portrait canvas).
- **Physics Constants**:
  - Gravity ($g$): $+1350\text{ px/s}^2$ downward acceleration.
  - Flap Impulse ($v_{\text{jump}}$): $-400\text{ px/s}$ upward velocity replacement.
  - Terminal Velocity ($v_{\text{term}}$): $+650\text{ px/s}$ downward maximum speed clamp.
  - Tilt Math Range: $-20^\circ$ ($-0.349\text{ rad}$) up to $+90^\circ$ ($+1.571\text{ rad}$) full nose-down dive.
- **Pipe Generation & Spawning**:
  - Horizontal Scroll Velocity ($v_x$): $-160\text{ px/s}$.
  - Spawning Distance Interval: Every $200\text{ px}$ of horizontal scroll.
  - Pipe Width ($w_{\text{pipe}}$): $64\text{ px}$.
  - Gap Height ($h_{\text{gap}}$): $135\text{ px}$.
  - Ground Height ($h_{\text{ground}}$): $112\text{ px}$ (Playable canvas height $H_{\text{play}} = 640 - 112 = 528\text{ px}$).
  - Safety Margins ($y_{\text{margin}}$): $45\text{ px}$ (Top and bottom gap placement bounds).
- **Collision Detection & Hitboxes**:
  - Bird Hitbox: Bounding circle with radius $r_{\text{bird}} = 13\text{ px}$ centered at $(x_{\text{bird}}, y_{\text{bird}})$.
  - Fixed Bird Horizontal Center: $x_{\text{bird}} = 100\text{ px}$.
  - Ground Line Y-Level: $y = 528\text{ px}$.
  - Collision Math: Circle vs Axis-Aligned Bounding Box (AABB) distance check ($d^2 < r_{\text{bird}}^2$).
- **Event Contracts**: `ENGINE_STATE_CHANGE`, `BIRD_FLAP`, `PIPE_SPAWN`, `PIPE_PASS`, `BIRD_HIT`, `GAME_OVER`.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Engine / Render Loop | High-DPI Canvas & Clamped Game Loop | Manages 360x640 logical canvas with DPR scale and `requestAnimationFrame` delta loop clamped to 100ms max. | Browser frame timestamps, DPR | Rendered frame, clamped $\Delta t$ | Delta time spikes >100ms clamped to 0.1s to prevent physics glitch | PROJECT.md, SCOPE.md, explorer_1/handoff.md |
| 2 | Physics Engine | Bird Physics & Rotational Tilt | Integrates gravity (+1350 px/s²), jump impulse (-400 px/s), terminal velocity (+650 px/s), and velocity-based tilt (-20° to +90°). | User input trigger (flap), frame delta $\Delta t$ | Updated position $(x=100, y)$, velocity $v_y$, rotation angle $\theta$ | Velocity clamped to terminal velocity +650 px/s; ceiling hit clamps $y \ge 13$ | PROJECT.md, SCOPE.md, explorer_1/handoff.md |
| 3 | Pipe System | Distance-Based Pipe Spawning & Scroll | Scrolls pipe pairs left at 160 px/s, spawning a new pipe pair every 200 px of scroll distance with gap height 135 px and safety margin 45 px. | Scroll distance accumulator, frame delta $\Delta t$, random generator | Array of active Pipe objects with top/bottom AABB bounds | Despawns and recycles pipes when offscreen ($x + 64 < 0$) | PROJECT.md, SCOPE.md, explorer_1/handoff.md |
| 4 | Collision System | Circle vs AABB & Ground/Ceiling Boundary | Calculates exact distance squared between bird circle ($r=13\text{px}$) and pipe rectangle AABBs or ground line ($y=528\text{px}$). | Bird circle $(100, y, 13)$, Pipe AABBs, Ground level (528) | Boolean collision result, collision cause | Emits `BIRD_HIT` and transitions to `GAME_OVER` immediately on collision | PROJECT.md, SCOPE.md, explorer_1/handoff.md |
| 5 | Gameplay / Rules | Score Increment & Tracking | Monitors bird position relative to pipe X coordinates; increments score by 1 when trailing edge passes pipe right edge. | Bird center X (100), bird radius (13), Pipe X + width | Updated score count, `PIPE_PASS` event | Guarantees single increment per pipe pair using `scored` boolean flag | PROJECT.md, SCOPE.md, explorer_1/handoff.md |
| 6 | Architecture | Decoupled EventBus Hub | Centralized pub/sub message hub for emitting engine events to audio, visual, and UI listeners. | Event name string, payload object | Invocation of registered callback functions | Silently catches/logs subscriber callback errors to prevent game loop crash | PROJECT.md, SCOPE.md |
| 7 | Automation / Testing | Test Inspection API (`window.__FLAPPY_GAME__`) | Exposes global inspection interface on `window` object for E2E tests and debugging. | Method calls (`getState`, `getScore`, `getBird`, `getPipes`, `triggerFlap`) | Engine state representation objects | Throws descriptive Error if called before engine initialization | PROJECT.md, TEST_INFRA.md |

---

## 3. Parameter, Unit & Math Matrix

### 3.1 Constants & Coordinates

| Parameter Name | Symbol | Value | Units | Description / Formula |
|----------------|--------|-------|-------|-----------------------|
| Canvas Logical Width | $W_{\text{logical}}$ | 360 | pixels | Logical coordinate space width |
| Canvas Logical Height | $H_{\text{logical}}$ | 640 | pixels | Logical coordinate space height |
| Ground Height | $h_{\text{ground}}$ | 112 | pixels | Visual ground obstacle height |
| Playable Area Height | $H_{\text{play}}$ | 528 | pixels | $H_{\text{logical}} - h_{\text{ground}} = 640 - 112$ |
| Gravity | $g$ | $+1350$ | px/s² | Downward acceleration rate ($+0.375\text{ px/frame}^2$ at 60 FPS) |
| Flap Jump Impulse | $v_{\text{jump}}$ | $-400$ | px/s | Instantaneous upward velocity replacement ($v_y \leftarrow -400$) |
| Terminal Velocity | $v_{\text{term}}$ | $+650$ | px/s | Maximum downward fall speed limit |
| Bird Center X | $x_{\text{bird}}$ | 100 | pixels | Fixed horizontal center position of bird circle |
| Bird Initial Y | $y_{\text{bird, init}}$ | 250 | pixels | Default starting height |
| Bird Hitbox Radius | $r_{\text{bird}}$ | 13 | pixels | Bounding circle radius for collision check |
| Pipe Width | $w_{\text{pipe}}$ | 64 | pixels | Horizontal width of pipe rectangle |
| Pipe Gap Height | $h_{\text{gap}}$ | 135 | pixels | Vertical opening distance between top and bottom pipe |
| Pipe Scroll Speed | $v_x$ | 160 | px/s | Horizontal leftward movement rate |
| Pipe Spawn Interval | $\Delta x_{\text{spawn}}$ | 200 | pixels | Horizontal scroll distance between consecutive pipe spawns |
| Pipe Vertical Margin | $y_{\text{margin}}$ | 45 | pixels | Safety buffer from canvas top and ground level for gap |
| Minimum Gap Top Y | $y_{\text{gap\_top, min}}$ | 45 | pixels | Equals $y_{\text{margin}}$ |
| Maximum Gap Top Y | $y_{\text{gap\_top, max}}$ | 348 | pixels | $H_{\text{play}} - h_{\text{gap}} - y_{\text{margin}} = 528 - 135 - 45 = 348$ |
| Maximum Delta Time | $\Delta t_{\text{max}}$ | 0.100 | seconds | Maximum clamped frame time step (100 ms) |
| Min Rotational Tilt | $\theta_{\text{min}}$ | $-20^\circ$ | degrees | Rotational angle immediately upon flap ($-0.349\text{ rad}$) |
| Max Rotational Tilt | $\theta_{\text{max}}$ | $+90^\circ$ | degrees | Nose-down diving rotation limit ($+1.571\text{ rad}$) |
| Falling Angle Threshold | $v_{\text{fall\_thresh}}$ | $+150$ | px/s | Downward velocity threshold where rotation starts tilting down |
| Tilt Lerp Speed | $k_{\text{tilt}}$ | 10.0 | s⁻¹ | Rotation interpolation multiplier ($\Delta t \times 10$) |

---

### 3.2 Physics & Collision Formulas

#### Velocity Integration
$$v_y(t + \Delta t) = \min(v_y(t) + g \cdot \Delta t, v_{\text{term}})$$

#### Vertical Position Integration
$$y(t + \Delta t) = y(t) + v_y(t + \Delta t) \cdot \Delta t$$

#### Rotational Tilt Math
- **On Flap Action**: $\theta \leftarrow -20^\circ$
- **In Air Update**:
  $$\theta_{\text{target}} = \begin{cases} -20^\circ & \text{if } v_y \le 150\text{ px/s} \\ \min\left(+90^\circ, -20^\circ + \frac{v_y - 150}{650 - 150} \times 110^\circ\right) & \text{if } v_y > 150\text{ px/s} \end{cases}$$
  $$\theta(t + \Delta t) = \theta(t) + (\theta_{\text{target}} - \theta(t)) \cdot \min(1.0, 10 \cdot \Delta t)$$

#### Random Gap Top Calculation
$$y_{\text{gap\_top}} = \text{Math.random}() \times (348 - 45) + 45 = \text{Math.random}() \times 303 + 45$$

#### Top & Bottom Pipe Rectangles
- **Top Pipe AABB**: $[x_{\text{pipe}}, 0, w_{\text{pipe}}, y_{\text{gap\_top}}]$
- **Bottom Pipe AABB**: $[x_{\text{pipe}}, y_{\text{gap\_top}} + h_{\text{gap}}, w_{\text{pipe}}, H_{\text{play}} - (y_{\text{gap\_top}} + h_{\text{gap}})]$

#### Circle vs AABB Collision Algorithm
For circle center $(x_c, y_c)$ with radius $r = 13$ and AABB $[rx, ry, rw, rh]$:
$$\text{closestX} = \text{clamp}(x_c, rx, rx + rw)$$
$$\text{closestY} = \text{clamp}(y_c, ry, ry + rh)$$
$$d^2 = (x_c - \text{closestX})^2 + (y_c - \text{closestY})^2$$
$$\text{IsColliding} \iff d^2 < r^2 \quad (13^2 = 169)$$

---

## 4. Event Bus Payload Specifications

### 1. `ENGINE_STATE_CHANGE`
- **Trigger**: When GameEngine transitions between state machine states (`START`, `PLAYING`, `PAUSED`, `GAME_OVER`).
- **Payload Contract**:
```json
{
  "oldState": "START",
  "newState": "PLAYING"
}
```

### 2. `BIRD_FLAP`
- **Trigger**: When player triggers jump input (Space / Click / Touch) while engine is in `PLAYING` state.
- **Payload Contract**:
```json
{
  "x": 100,
  "y": 245.5,
  "vy": -400
}
```

### 3. `PIPE_SPAWN`
- **Trigger**: Instantiated whenever scroll distance triggers a new pipe pair generation at $x = 360\text{ px}$.
- **Payload Contract**:
```json
{
  "pipeId": "pipe_104",
  "x": 360,
  "topHeight": 180,
  "bottomY": 315,
  "gapHeight": 135
}
```

### 4. `PIPE_PASS`
- **Trigger**: When bird center minus radius passes pipe right edge ($100 - 13 = 87 > x_{\text{pipe}} + 64$).
- **Payload Contract**:
```json
{
  "score": 1,
  "pipeId": "pipe_104"
}
```

### 5. `BIRD_HIT`
- **Trigger**: When bird bounding circle intersects pipe AABB, hits ground line ($y \ge 515$), or hits ceiling ($y \le 13$).
- **Payload Contract**:
```json
{
  "x": 100,
  "y": 515,
  "cause": "ground"
}
```
*Note*: `cause` enum values: `"pipe"` | `"ground"` | `"ceiling"`.

### 6. `GAME_OVER`
- **Trigger**: Emitted after hit sequence finishes and score persistence check completes.
- **Payload Contract**:
```json
{
  "finalScore": 12,
  "isHighScore": true
}
```

---

## 5. Inspection API Contract (`window.__FLAPPY_GAME__`)

To satisfy E2E testing infra requirements in `TEST_INFRA.md`, M1 must expose the following global interface on `window.__FLAPPY_GAME__`:

```javascript
window.__FLAPPY_GAME__ = {
  getState: () => string,          // Returns "START" | "PLAYING" | "PAUSED" | "GAME_OVER"
  getScore: () => number,          // Returns current active score integer
  getHighScore: () => number,      // Returns highest recorded score
  getBird: () => ({
    x: number,                     // Fixed at 100
    y: number,                     // Current vertical center position
    vy: number,                    // Current vertical velocity (px/s)
    rotation: number,              // Current tilt angle in degrees (-20 to +90)
    isDead: boolean                // True if bird has collided/died
  }),
  getPipes: () => Array<{
    id: string|number,
    x: number,                     // Current horizontal position (left edge)
    topHeight: number,             // Height of top pipe rectangle
    bottomY: number,               // Y coordinate where bottom pipe starts
    gapHeight: number,             // Fixed at 135
    scored: boolean                // True if bird has already passed this pipe
  }>,
  triggerFlap: () => void,         // Programmatic flap execution (simulates jump input)
  triggerPause: () => void,        // Programmatic pause toggle
  restartGame: () => void          // Programmatic restart to START/PLAYING state
};
```

---

## 6. Edge Cases

| # | Feature | Input / Trigger | Observed / Expected Behavior |
|---|---------|-----------------|------------------------------|
| 1 | Clamped Game Loop | Browser tab backgrounded for >5 seconds and resumed ($\Delta t > 5.0\text{ s}$). | Delta time is clamped to $\Delta t_{\text{max}} = 0.100\text{ s}$ (100 ms). Bird position updates by at most 100 ms of movement, preventing physics explosion or teleporting through pipes. |
| 2 | Bird Physics | Rapid multi-flap (e.g. 5 taps within 100ms). | Each flap instantly resets $v_y \leftarrow -400\text{ px/s}$ and tilt $\theta \leftarrow -20^\circ$. Velocity does NOT stack additively (it is a replacement impulse, not additive force). |
| 3 | Collision System | Bird hits ceiling line ($y - 13 \le 0 \implies y \le 13\text{ px}$). | Bird position is clamped to $y = 13\text{ px}$, vertical velocity is set to $v_y = \max(0, v_y)$ (zeroing upward momentum). Prevents bird from flying off-screen. |
| 4 | Collision System | Bird hits ground line ($y + 13 \ge 528 \implies y \ge 515\text{ px}$). | Physics updating freezes, bird position is clamped to $y = 515\text{ px}$, $v_y \leftarrow 0$. `BIRD_HIT` event emitted with `cause: "ground"`, followed by `GAME_OVER` event. |
| 5 | Collision System | Bird circle grazes the exact corner of a pipe rectangle. | Euclidean distance squared check $d^2 = (x_c - \text{closestX})^2 + (y_c - \text{closestY})^2 < 169$ correctly detects corner intersection without false positives or missed hits. |
| 6 | Pipe Generation | Pipe horizontal position $x + 64 < 0$ (scrolled past left screen boundary). | Pipe pair object is marked inactive and safely spliced/recycled from the active `pipes` array without memory leak or array mutation artifacts during iteration. |
| 7 | Score Tracking | Bird passes pipe pair right edge while dying/colliding with pipe. | Collision detection runs prior to score check. `BIRD_HIT` triggers game over, and score increment is suppressed for that pipe pair. |
| 8 | EventBus | Subscriber throws an unhandled Exception during event handler execution. | EventBus wraps listener callbacks in `try...catch` blocks, logging the error to console while allowing other subscribers to execute cleanly without breaking the core engine loop. |

---

## 7. Logic Chain

1. **Requirement Mapping**:
   - `ORIGINAL_REQUEST.md` specifies core physics, pipe generation, collision detection, and score tracking for HTML5 Canvas Flappy Bird.
   - `SCOPE.md` defines 6 modular engine files (`EventBus.js`, `GameEngine.js`, `Bird.js`, `PipeManager.js`, `CollisionSystem.js`, `test_engine.js`).
2. **Mathematical Deduction**:
   - Standard 9:16 portrait mobile layout maps $360\times640$ logical pixels. Ground occupies $112\text{ px}$, leaving $528\text{ px}$ playable height.
   - Bird bounding circle $r=13\text{ px}$ at fixed $x=100\text{ px}$ provides responsive, forgiving controls.
   - Gravity $+1350\text{ px/s}^2$ combined with jump impulse $-400\text{ px/s}$ yields peak jump height $\Delta y_{\text{peak}} = \frac{v^2}{2g} = \frac{160000}{2700} \approx 59.26\text{ px}$, taking $t_{\text{up}} = \frac{400}{1350} \approx 0.296\text{ s}$ to reach apex. This matches authentic classic arcade game feel.
   - Pipe gap height of $135\text{ px}$ allows a comfortable $135 - 26 = 109\text{ px}$ clearance for the $26\text{ px}$ tall bird hitbox.
   - Pipe spawn distance interval of $200\text{ px}$ at $160\text{ px/s}$ scroll speed gives a pipe spawn interval of $t_{\text{spawn}} = \frac{200}{160} = 1.25\text{ seconds}$ between pipes.
3. **Event Architecture**:
   - Decoupling physics, visuals, and audio via `EventBus` guarantees that visual polish (M2) and Web Audio synthesizer (M3) can hook directly into M1 engine events (`BIRD_FLAP`, `PIPE_SPAWN`, `PIPE_PASS`, `BIRD_HIT`, `GAME_OVER`) without modifying core physics code.

---

## 8. Caveats

- **Visual Rendering Simplicity in M1**:
  - In M1, canvas rendering for bird and pipes uses clean primitive geometric shapes (colored circle for bird, rectangles for pipes, solid bar for ground). Complete sprite rendering and parallax backgrounds are owned by Milestone 2.
- **Audio & Storage Independence**:
  - Event listeners for audio FX (M3) and localStorage persistence (M3) are not implemented in M1 source files, but event dispatch calls (`EventBus.emit(...)`) MUST be placed in M1 engine modules.
- **No Implementation in this Step**:
  - As a Specification Miner, no implementation code was written. This document serves as the single source of truth for M1 implementers.

---

## 9. Conclusion

Milestone 1 (Core Gameplay Engine & Physics) feature contracts, parameter definitions, mathematical formulas, event payload signatures, inspection API contracts, and edge cases have been completely mined and documented. The engineering specification is 100% actionable and scoped for immediate implementation in `public/js/engine/` and unit testing in `tests/unit/test_engine.js`.

---

## 10. Verification Method

### How to Independently Verify:
1. **File Path Verification**:
   - Inspect `/root/Projects/flappy_bird/.agents/m1_explorer_3/handoff.md` to confirm complete inclusion of all sections.
2. **Formula Integrity**:
   - Verify Circle vs AABB math: $d^2 < 169$ where $r=13$.
   - Verify jump peak math: $v_{\text{jump}} = -400$, $g = +1350$, $v_{\text{term}} = +650$.
   - Verify pipe spawn bounds: $y_{\text{gap\_top}} \in [45, 348]$.
3. **Unit Test Execution (Post-Implementation)**:
   - Once implementers build `public/js/engine/` and `tests/unit/test_engine.js`, verify execution using:
     `node tests/unit/test_engine.js`
