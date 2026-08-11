# Empirical Challenge Handoff Report — Milestone 1 (Core Gameplay Engine & Physics)

**Author**: Challenger 2 (`m1_challenger_2`)  
**Working Directory**: `/root/Projects/flappy_bird/.agents/m1_challenger_2`  
**Target Milestone**: M1 (Core Gameplay Engine & Physics)  
**Date**: 2026-08-10  
**Verdict**: `REJECT`

---

## 1. Observation

Empirical verification of the 5 requested challenge dimensions was performed using the project unit test suite (`node tests/unit/test_engine.js`) and a custom empirical stress harness (`verify_m1.js`).

### Unit Test Execution Command & Output:
Command: `node tests/unit/test_engine.js`
```
▶ Suite: A) EventBus Pub/Sub & Error Isolation
  ✔ PASS: EventBus should subscribe and receive emitted payload
  ✔ PASS: EventBus should unsubscribe listener via off() and return unbind function
  ✔ PASS: EventBus clear() should remove all registered listeners
[EventBus] Error handling event "FAIL_EVENT": Error: Simulated subscriber crash
  ✔ PASS: EventBus should protect subscriber iterations against exceptions during emit

▶ Suite: B) Bird Physics Engine
  ✔ PASS: Bird initial position (100, 250) and bounding radius 13
  ✔ PASS: Bird gravity integration (+1350 px/s²)
  ✔ PASS: Bird flap impulse replaces vy instantly with -400 px/s and sets instant -20° tilt
  ✔ PASS: Bird terminal velocity clamping at +650 px/s
  ✔ PASS: Bird rotational tilt interpolation toward +90° as falling speed increases past 150 px/s

▶ Suite: C) PipeManager Spawning & Motion
  ✔ PASS: PipeManager scroll speed 160 px/s leftward movement
  ✔ PASS: PipeManager spawning interval every 200px scroll displacement
  ✔ PASS: Pipe gap height 135px and random gap top range [45, 348]
  ✔ PASS: Score clearance tracking emits PIPE_PASS once when bird passes right edge of pipe

▶ Suite: D) CollisionSystem Circle vs AABB & Bounds
  ✔ PASS: Circle vs AABB: direct hit, near miss, and clear passage
  ✔ PASS: Circle vs AABB: corner vertex distance threshold (avoids false AABB corner hits)
  ✔ PASS: Ceiling boundary clamping: clamps y = 13 and zeroes upward velocity
  ✔ PASS: Ground collision detection at y + radius >= 528

▶ Suite: E) Fixed Timestep Determinism & Integrated Loop
  ✔ PASS: Identical trajectory across 60Hz and 120Hz frame step updates
  ✔ PASS: GameEngine state machine lifecycle (START -> PLAYING -> PAUSED -> GAME_OVER -> START)

Total Tests: 19 | Passed: 19 | Failed: 0
```

### Verbatim Code Inspection of `public/js/engine/PipeManager.js` (Lines 92–103):
```javascript
    // 2. Check distance-based spawning
    if (this.pipes.length === 0 && this.distanceScrolled >= this.spawnInterval) {
      this.spawnPipePair(360);
      this.lastSpawnDistance = this.distanceScrolled;
    } else if (this.pipes.length > 0) {
      const lastPipe = this.pipes[this.pipes.length - 1];
      if ((360 + this.pipeWidth) - lastPipe.x >= this.spawnInterval ||
          (this.distanceScrolled - this.lastSpawnDistance >= this.spawnInterval)) {
        this.spawnPipePair(360);
        this.lastSpawnDistance = this.distanceScrolled;
      }
    }
```

### Empirical Stress Harness Output (`node verify_m1.js`):
```
--- Test 1: Pipe Spawning Interval & Determinism ---
Spawn events observed: [
  { "frame": 75,  "distanceScrolled": 202.67, "deltaDist": 202.67, "lastPipeX": 360, "prevPipeX": null },
  { "frame": 126, "distanceScrolled": 338.67, "deltaDist": 136.00, "lastPipeX": 360, "prevPipeX": 224.00 },
  { "frame": 177, "distanceScrolled": 474.67, "deltaDist": 136.00, "lastPipeX": 360, "prevPipeX": 224.00 },
  { "frame": 228, "distanceScrolled": 610.67, "deltaDist": 136.00, "lastPipeX": 360, "prevPipeX": 224.00 }
]
First pipe spawned at distanceScrolled = 202.67px
Second pipe spawned after additional scroll of = 136.00px
❌ FAIL: First pipe should spawn after 200px scroll (actual: 202.67px)
❌ FAIL: Subsequent pipes should spawn every 200px scroll displacement (actual: 136.00px)

--- Test 2: Random Gap Safety Ranges ---
Generated 100,000 gaps. Min observed: 45, Max observed: 348
✓ PASS: Min gap top must be exactly 45 (actual: 45)
✓ PASS: Max gap top must be exactly 348 (actual: 348)
✓ PASS: Zero gaps outside range [45, 348] (actual out of bounds: 0)

--- Test 3: Bird Flap Impulse ---
✓ PASS: Flap impulse must set vy to exactly -400 px/s (actual: -400)
✓ PASS: Flap impulse must set rotation to -20 deg (-0.349066 rad) (actual: -0.34906585)

--- Test 4: Rotational Tilt Interpolation Limits ---
Min observed rotation: -0.2468 rad (-14.14 deg)
Max observed rotation: 1.5708 rad (89.9999 deg)
✓ PASS: Rotation must not go below -20°
✓ PASS: Rotation must not exceed +90°
✓ PASS: Rotation at terminal velocity should converge close to +90°

--- Test 5: EventBus Memory Leak Protection ---
✓ PASS: Should have 2 listeners
✓ PASS: Should have 1 listener after unbind
✓ PASS: Map key should be deleted when set is empty (prevents key leaks)
✓ PASS: Rapid sub/unsub should leave zero lingering entries in Map
✓ PASS: clear() must remove all entries from Map
```

---

## 2. Logic Chain

1. **Observation 1**: `PROJECT.md` (line 15) and `SCOPE.md` (line 10) mandate pipe spawning every 200px of scroll displacement (`Distance-based spawning (200px scroll)`).
2. **Observation 2**: In `PipeManager.js` (line 98), the condition for spawning subsequent pipes is:
   ```javascript
   (360 + this.pipeWidth) - lastPipe.x >= this.spawnInterval || (this.distanceScrolled - this.lastSpawnDistance >= this.spawnInterval)
   ```
3. **Observation 3**: When `lastPipe` is spawned at `x = 360`, `360 + this.pipeWidth` equals $360 + 64 = 424$. As the pipe moves left to `lastPipe.x = 224` (which is only $360 - 224 = 136$px of scroll displacement), the value of $(360 + 64) - 224$ equals $200$.
4. **Observation 4**: Because of the `||` (OR) operator, $(360 + 64) - 224 \ge 200$ evaluates to `true` after only 136px of scroll displacement. A new pipe is spawned prematurely at $x = 360$, while the previous pipe is at $x = 224$. The spacing between consecutive pipes becomes **136px** instead of **200px**.
5. **Observation 5**: In `tests/unit/test_engine.js` (lines 174–186), the worker's unit test only simulated up to 1.25s (the first spawn at 200px) and asserted `pipes.length === 1`. It failed to test subsequent pipe spawns, causing this defect to go undetected in `test_engine.js`.
6. **Observation 6**: Empirical test results for criteria 2, 3, 4, and 5 passed:
   - Random gap range: $[45, 348]$ verified across 100,000 samples.
   - Bird flap impulse: $-400$ px/s and $-20^\circ$ instant tilt verified.
   - Tilt interpolation: strictly bounded within $[-20^\circ, +90^\circ]$.
   - EventBus memory leak protection: empty Map keys are properly cleaned up on unbind and `clear()`.

---

## 3. Caveats

- **No Caveats**: All 5 verification targets were tested empirically via standalone execution and direct code analysis.

---

## 4. Conclusion

**Verdict**: `REJECT`

Milestone 1 **cannot be approved** in its current state due to a major spawning logic bug in `public/js/engine/PipeManager.js`.

### Summary of Failure:
- **Component**: `public/js/engine/PipeManager.js` (line 98)
- **Defect**: Pipe spawning logic uses `(360 + this.pipeWidth) - lastPipe.x >= this.spawnInterval`. This causes pipe pairs to spawn every **136px** of scroll displacement instead of the required **200px**.
- **Required Fix**: Change line 98 in `PipeManager.js` to rely on actual scroll displacement:
  ```javascript
  if (this.distanceScrolled - this.lastSpawnDistance >= this.spawnInterval) {
    this.spawnPipePair(360);
    this.lastSpawnDistance = this.distanceScrolled;
  }
  ```
  And update `tests/unit/test_engine.js` to verify multiple consecutive pipe spawns over $\ge 400$px of scroll displacement.

---

## 5. Verification Method

To independently reproduce this failure and verify the bug:

1. Run the empirical stress harness:
   ```bash
   node verify_m1.js
   ```
2. Observe that Test 1 fails with:
   `Second pipe spawned after additional scroll of = 136.00px`
3. Inspect `public/js/engine/PipeManager.js` lines 96–102 to observe the erroneous `(360 + this.pipeWidth) - lastPipe.x` expression.
