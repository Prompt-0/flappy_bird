# Feature Specification Survey & Architecture Handoff Report — Explorer 2

**Target Scope**: Requirements R2 (Visuals & Polish) and R3 (Audio, Persistence & Customization)
**Author**: Explorer 2 (teamwork_preview_spec_miner)
**Date**: 2026-08-10

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Visual Parallax | 5-Layer Parallax Scrolling Background | Continuous multi-layered parallax background (Sky, Far Mountains, Mid Hills, Near Bushes, Ground) with distance-scaled speed ratios. | Game speed (`vx`), Delta time (`dt`) | 5 distinct scrolling visual layers blitted to Canvas | Offscreen canvas tile reset if scroll offset NaN | R2 Requirement Specs |
| 2 | Visual Parallax | Seamless Layer Wrapping Algorithm | Modulo wrap calculation (`offset = (offset + speed * dt) % tileWidth`) for continuous infinite horizontal scrolling without visual seams. | `offset`, `speed`, `dt`, `tileWidth` | 2 contiguous `drawImage` draw calls per layer | Fallback to `tileWidth` clamp if calculation overflows | Parallax Architecture Investigation |
| 3 | Day/Night Weather | Dynamic Day/Night/Sunset Palette Cycle | Smooth transition of sky gradients and background tints based on time elapsed or score progression (Day, Sunset, Night, Dawn). | Elapsed time or current score | Interpolated hex/RGB color strings for sky & background | Clamp interpolation factor `t` between `[0, 1]` | R2 Requirement Specs |
| 4 | Day/Night Weather | Celestial Body Trajectory & Starfield | Sun and Moon follow an orbital arc across the sky while twinkling star points render during Night phase. | Cycle progress `t` | Rendered Sun/Moon shapes and animated star alpha dots | Fallback to stationary celestial body if math invalid | R2 Dynamic Lighting Specs |
| 5 | Particle Engine | Bird Flap Trail Particles | Emits feather or cloud puff particles at bird position upon flap input with backward velocity, drag, and fade. | Bird position `(x, y)`, Jump trigger | Spawned trail particles in particle pool | Ignore emission if particle pool is at max capacity | R2 Particle System Specs |
| 6 | Particle Engine | Pipe Collision Burst Particles | Radial explosion burst of debris and feather particles upon collision with pipes or ground. | Collision position `(x, y)` | 15-25 bursting particles with gravity physics | Gracefully skip burst if pool saturated | R2 Collision Specs |
| 7 | Particle Engine | Score Sparkle Particles | Celebratory star/sparkle particle burst around score display when clearing a pipe pair. | Score increment trigger, pipe center `x` | Golden sparkle particles with scaling alpha | Ignore if particle quality setting is `low` | R2 Polish Specs |
| 8 | Particle Engine | Object Pool Management | Fixed pre-allocated array of particle objects (200 capacity) recycled continuously to prevent Garbage Collection pauses. | Particle spawn request | Re-initialized dead particle object index | Recycle oldest active particle if pool full | Performance & Memory Profiling Specs |
| 9 | Procedural Audio | Jump/Flap Frequency Sweep Synthesizer | Web Audio API sine oscillator frequency sweep (220Hz -> 580Hz) with exponential gain envelope decay. | User flap action | AudioContext output node sound wave | Silent fail if AudioContext is suspended or blocked | R3 Web Audio Specs |
| 10 | Procedural Audio | Point Score Chime Synthesizer | Two-stage sine wave arpeggio (C6 1046.5Hz -> E6 1318.5Hz) simulating a bright coin chime. | Score increment event | Dual-tone audio playback via Web Audio API | Skip audio node creation if muted | R3 Audio Specs |
| 11 | Procedural Audio | Pipe Hit / Ground Crash Sound Generator | Square/triangle wave pitch drop (150Hz -> 30Hz) layered with lowpass-filtered white noise burst. | Collision trigger event | Impact crunch audio output | Graceful fallback if AudioBuffer allocation fails | R3 Audio Specs |
| 12 | Procedural Audio | UI Button Click Synthesizer | Crisp 30ms high-frequency triangle wave tick (800Hz) for button taps and skin selections. | UI click / key interaction | Short click feedback tone | Skip sound if audio disabled | R3 UI Audio Specs |
| 13 | Procedural Audio | Achievement Unlock Fanfare Generator | 4-note ascending major triad arpeggio (C5-E5-G5-C6) played on skin unlock or high score beat. | Achievement unlocked event | Melodic fanfare chime | Skip playback if audio muted | R3 Persistence & Reward Specs |
| 14 | Procedural Audio | Web Audio Autoplay Gesture Listener | First user interaction listener (`touchstart`, `mousedown`, `keydown`) that calls `AudioContext.resume()`. | First user touch/click/press | Active AudioContext state (`'running'`) | Catch and retry on subsequent gesture if promise rejects | Browser Audio Policy Specification |
| 15 | Procedural Audio | Sound Volume & Mute State Manager | Master Gain Node handling global volume level and mute toggle state persisted in localStorage. | Volume slider / mute toggle UI | Master gain value set to `0` or `volume` | Default to `muted = false` if storage corrupted | R3 Audio UI Specs |
| 16 | Persistence | localStorage Data Storage Engine | Robust JSON read/write driver targeting key `flappy_bird_data_v1` with schema validation and fallback defaults. | Save state object | Serialized string in browser localStorage | Fallback to in-memory JS object if access denied | R3 Persistence Specs |
| 17 | Persistence | High Score & Lifetime Statistics | Tracks best personal score, total games played, total pipes cleared, and timestamp. | Game Over state update | Saved high score & updated stat counters | Reset stats to 0 if schema validation fails | R3 High Score Specs |
| 18 | Skin Customization | Avatar Unlock Logic Engine | Checks unlock requirements (High score milestones, Total games played) and unlocks new avatars. | Current score / lifetime stats | Updated `unlockedSkins` array and UI notification | Retain default "yellow" skin if unlock check errors | R3 Skin Selection Specs |
| 19 | Skin Customization | Procedural Skin Render Engine | Draws 5 unique bird skins (Yellow, Phoenix, Cyber, Gold, Raven) using dynamic fill colors and accessories. | Selected skin ID, bird angle/anim frame | Procedurally styled Canvas bird artwork | Fallback to "yellow" skin palette if skin ID unknown | R3 Customization Specs |
| 20 | Render Pipeline | Offscreen Canvas Sprite Caching | Pre-renders complex static assets (pipe textures, parallax tiles, skin frames) into offscreen canvases. | Procedural drawing routines | Cached `HTMLCanvasElement` references | Fallback to direct rendering if offscreen context fails | 60 FPS Performance Optimization Specs |

---

## Edge Cases

| # | Feature | Input / Trigger | Observed & Required Behavior |
|---|---------|-----------------|------------------------------|
| 1 | Web Audio API | Web Audio context initialized before user gesture | Browser blocks audio playback (`AudioContext.state === 'suspended'`). Must attach a one-time gesture listener to `window` for `touchstart`, `mousedown`, `keydown` to execute `audioCtx.resume()`. |
| 2 | localStorage Engine | Browser in private browsing mode or storage full (`QuotaExceededError` / `SecurityError`) | `localStorage.setItem()` throws DOMException. Must wrap all storage calls in `try...catch` and seamlessly fall back to an in-memory JS state object without breaking gameplay. |
| 3 | localStorage Engine | `flappy_bird_data_v1` contains corrupted or invalid JSON string | `JSON.parse()` throws SyntaxError. Engine must catch parse error, log warning, overwrite with clean default schema, and continue safely. |
| 4 | Responsive Canvas | Window resize or High-DPI (Retina) display density change | Canvas resolution degrades or blurs. Render pipeline must calculate `devicePixelRatio`, adjust canvas `width`/`height` attributes, scale `ctx` by DPR, and recalculate parallax layer scroll bounds. |
| 5 | Particle System | Particle pool saturated during continuous rapid collisions (> 200 particles) | Particle array overflow or GC stutter. Particle pool manager must recycle the oldest active particle (`active = true` index) without allocating new objects or growing array length. |
| 6 | Physics & Parallax | Browser tab backgrounded during gameplay (large frame delta time `dt > 1.0s`) | Tunneling through pipes or massive parallax visual jumps on tab refocus. Frame loop must clamp `dt = Math.min(dt, 0.1)` (max 100ms per frame). |
| 7 | Procedural Audio | Rapid flap inputs (10 flaps per second) | Audio node accumulation or distorted gain clipping. Sound synthesizer must stop previous flap oscillator voice or enforce a 60ms min interval between flap sound triggers. |
| 8 | Skin Customization | Saved `selectedSkinId` in localStorage refers to a non-existent or removed skin string | Renderer cannot look up skin palette. Skin engine must validate ID against `BIRD_SKINS` object dictionary and fallback safely to `"yellow"`. |

---

## Visual Layer Architecture & Render Pipeline

### 1. Parallax Layer Hierarchy & Speed Ratios

The visual engine uses a 5-layer depth stack rendered from back to front in the `requestAnimationFrame` render loop:

```
[Back] Layer 0: Sky Gradient & Celestial Bodies (Sun / Moon / Starfield) — Static / Continuous Color Lerp
[Back] Layer 1: Far Mountains & City Silhouettes         — Speed Ratio: 0.15x
[Mid]  Layer 2: Mid-ground Hills & Tree Canopy          — Speed Ratio: 0.40x
[Mid]  Layer 3: Near Bushes, Fences & Skyline Elements   — Speed Ratio: 0.75x
[Fore] Layer 4: Foreground Pipe Entities                — Speed Ratio: 1.00x (Ground speed)
[Fore] Layer 5: Ground Surface & Soil Tile               — Speed Ratio: 1.00x
[Fore] Layer 6: Particle System Emission Overlay        — Velocity space (Physics-bound)
[Fore] Layer 7: Player Bird Avatar (Current Skin)       — Rotational & Positional transform
[Top]  Layer 8: UI & HUD Overlays (Score, Flash, Modals) — Fixed screen coordinates
```

### 2. Seamless Infinite Horizontal Scroll Math

To achieve silky-smooth 60 FPS scrolling without memory leaks or visible seams:
1. Each parallax layer has a fixed `tileWidth` pre-rendered on an offscreen canvas (`HTMLCanvasElement`).
2. Accumulate layer scroll offset: `offset = (offset + gameSpeed * speedRatio * dt) % tileWidth`.
3. Draw two adjacent copies of the layer tile to cover the entire canvas width:
   ```javascript
   const startX = -Math.floor(offset);
   ctx.drawImage(offscreenLayerCanvas, startX, 0);
   if (startX + tileWidth < canvasWidth) {
     ctx.drawImage(offscreenLayerCanvas, startX + tileWidth, 0);
   }
   ```

### 3. Dynamic Day/Night & Weather Palette Cycle

The background environment dynamically transitions between 4 time-of-day keyframes: **Day**, **Sunset**, **Night**, and **Dawn**.

- **Cycle Driver**: Progression driven either continuously (1 full 60-second cycle) or score-driven (transition every 10 points).
- **Interpolation Factor `t`**: Normalised float `[0.0, 1.0]` mapped to the current cycle phase.
- **Keyframe Color Palettes**:
  - **Day (t = 0.0 - 0.25)**:
    - Sky Top: `#4ec0ca`, Sky Bottom: `#70c5ce`
    - Mountain Tint: `#58979b`, Sun Color: `#ffe066`, Cloud Alpha: `0.85`
  - **Sunset (t = 0.25 - 0.50)**:
    - Sky Top: `#fd746c`, Sky Bottom: `#ff9068`
    - Mountain Tint: `#7c3a4d`, Sun Color: `#ff512f`, Cloud Alpha: `0.70`
  - **Night (t = 0.50 - 0.75)**:
    - Sky Top: `#0f2027`, Sky Bottom: `#203a43`
    - Mountain Tint: `#13222f`, Moon Color: `#e0e6ed` (Silver Glow), Starfield: Active (50 twinkling stars)
  - **Dawn (t = 0.75 - 1.00)**:
    - Sky Top: `#2c3e50`, Sky Bottom: `#16a085`
    - Mountain Tint: `#27ae60`, Sun Color: `#f39c12`, Cloud Alpha: `0.60`
- **Celestial Body Arc Math**:
  - Sun/Moon position along sky arc:
    `sunX = canvasWidth * (t * 2 % 1.0);`
    `sunY = canvasHeight * 0.2 + Math.sin(t * Math.PI * 2) * (canvasHeight * 0.15);`

---

## Audio Synthesizer Implementation Approach

The audio engine utilizes the native **Web Audio API** (`AudioContext`) to generate 100% procedural sound effects, eliminating external `.mp3` or `.wav` asset downloads.

### 1. Web Audio Engine Architecture

```
[AudioContext]
      │
[Master Gain Node] ──► [Destination (Speaker)]
      ▲
      ├── [Flap Voice] ── Oscillator (Sine) ──► Gain Envelope
      ├── [Score Voice] ── Dual Oscillators (Sine C6/E6) ──► BiquadFilter (Highpass) ──► Gain
      ├── [Hit Voice] ── Square Oscillator + Noise Buffer Source ──► Lowpass Filter ──► Gain
      └── [UI Voice] ── Triangle Oscillator ──► Gain
```

### 2. Sound Synthesis Algorithms & Code Specs

#### A. Jump / Flap Sound
- **Timbre**: Soft upward pitch sweep simulating wing swoop.
- **Oscillator Type**: `'sine'`
- **Frequency Sweep**: Ramps exponentially from `220 Hz` up to `580 Hz` over `0.10s`.
- **Gain Envelope**:
  - Start time `t0`: Gain = `0.35`
  - End time `t0 + 0.10s`: Exponential decay down to `0.001`

#### B. Point Score Chime
- **Timbre**: Bright dual-tone arpeggio bell.
- **Tone 1**: Sine wave at `1046.50 Hz` (C6) for `0.08s`.
- **Tone 2**: Sine wave at `1318.51 Hz` (E6) triggered at `t0 + 0.05s` for `0.10s`.
- **Filter**: BiquadFilter highpass at `800 Hz` for crystalline clarity.

#### C. Hit / Crash Sound
- **Timbre**: Heavy low-end impact with metallic noise crunch.
- **Tone Component**: Square wave sweeping rapidly from `160 Hz` down to `30 Hz` in `0.15s`.
- **Noise Component**: 0.12-second white noise buffer generated via `AudioBuffer`:
  ```javascript
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  ```
- **Filter**: BiquadFilter lowpass sweeping cutoff from `3000 Hz` down to `200 Hz`.

#### D. UI Button Click
- **Timbre**: Subtle tactile tick.
- **Oscillator Type**: `'triangle'` at `800 Hz`.
- **Gain Envelope**: Attack `0.001s`, decay to zero in `0.03s`.

#### E. Mute Toggle & Volume Controls
- Global Mute state controls `masterGainNode.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime)`.
- Mute state persisted in localStorage and restored on application load.

---

## Data Schemas & Persistence

### 1. `localStorage` Schema (`flappy_bird_data_v1`)

All game persistence data is stored under a single JSON key: `flappy_bird_data_v1`.

```json
{
  "version": 1,
  "highScore": 42,
  "totalGamesPlayed": 128,
  "totalPipesCleared": 350,
  "selectedSkinId": "phoenix",
  "unlockedSkins": ["yellow", "phoenix", "cyber"],
  "audio": {
    "muted": false,
    "sfxVolume": 0.8
  },
  "achievements": {
    "first_flap": { "unlocked": true, "timestamp": 1723300000000 },
    "bronze_flapper": { "unlocked": true, "timestamp": 1723300500000 },
    "score_25": { "unlocked": true, "timestamp": 1723301000000 }
  },
  "settings": {
    "dayNightMode": "auto",
    "particleQuality": "high"
  }
}
```

### 2. Skin Selection & Unlock Schema

The game features 5 distinct bird avatars with procedural rendering configurations:

```javascript
const BIRD_SKINS = {
  yellow: {
    id: "yellow",
    name: "Classic Flapper",
    description: "The classic yellow feathered hero.",
    unlockedByDefault: true,
    palette: {
      body: "#f4d03f",
      belly: "#ffffff",
      wing: "#f39c12",
      beak: "#e67e22",
      eye: "#2c3e50",
      trailParticle: "#f39c12"
    },
    accessory: "none"
  },
  phoenix: {
    id: "phoenix",
    name: "Crimson Phoenix",
    description: "Reach a score of 10 to unlock.",
    unlockCondition: { type: "highScore", target: 10 },
    palette: {
      body: "#e74c3c",
      belly: "#f1c40f",
      wing: "#c0392b",
      beak: "#d35400",
      eye: "#ffffff",
      trailParticle: "#ff512f"
    },
    accessory: "flame_crown"
  },
  cyber: {
    id: "cyber",
    name: "Neon Cyber-Bird",
    description: "Reach a score of 25 to unlock.",
    unlockCondition: { type: "highScore", target: 25 },
    palette: {
      body: "#00f3ff",
      belly: "#ff00ff",
      wing: "#00a8ff",
      beak: "#ffff00",
      eye: "#00f3ff",
      trailParticle: "#00f3ff"
    },
    accessory: "cyber_visor"
  },
  gold: {
    id: "gold",
    name: "Golden Eagle",
    description: "Reach a score of 50 to unlock.",
    unlockCondition: { type: "highScore", target: 50 },
    palette: {
      body: "#f1c40f",
      belly: "#fff8dc",
      wing: "#d4ac0d",
      beak: "#b7950b",
      eye: "#2c3e50",
      trailParticle: "#f1c40f"
    },
    accessory: "golden_crown"
  },
  raven: {
    id: "raven",
    name: "Midnight Raven",
    description: "Play 20 total games to unlock.",
    unlockCondition: { type: "totalGamesPlayed", target: 20 },
    palette: {
      body: "#2c3e50",
      belly: "#34495e",
      wing: "#1a252f",
      beak: "#7f8c8d",
      eye: "#e74c3c",
      trailParticle: "#95a5a6"
    },
    accessory: "shadow_aura"
  }
};
```

---

## Asset Recommendations & Performance Strategy

### 1. Asset Strategy Comparison

| Metric | Procedural Canvas Rendering (RECOMMENDED) | SVG / PNG Image Sprites |
|--------|-------------------------------------------|-------------------------|
| **HTTP Requests / Loading** | 0 requests (100% embedded code) | Multiple image file downloads required |
| **Resolution Scaling** | Crisp at any DPI / Retina resolution | Pixelation or scaling blur unless multi-resolution |
| **Color Customization** | Instant dynamic color swap in JS | Requires creating separate sprite sheets per skin/theme |
| **Bundle Size** | Minimal (a few KB of JS drawing code) | Hundreds of KB in image assets |
| **Rendering Performance** | Fast when combined with offscreen caching | Fast for standard blitting |

**Recommendation**: Use **Procedural Canvas API Drawing** for all background elements, pipes, particle shapes, and bird avatars, coupled with **Offscreen Canvas Caching** for repetitive background layers.

### 2. Performance & Memory Management Guidelines

1. **Offscreen Pre-Rendering**: Pre-render pipes, ground tiles, and parallax backgrounds onto hidden offscreen canvases (`document.createElement('canvas')`) during game initialization. Render loop simply executes `ctx.drawImage(offscreenCanvas, ...)` for maximum blitting performance.
2. **Particle Memory Allocation**: Pre-allocate an array of 200 `Particle` objects during initialization. Never `new` or `push` particle objects during runtime frames; mutate and mark `active = true` / `active = false` to guarantee 0 Garbage Collection spikes.
3. **Delta-time Frame Clamping**: Always compute frame delta `dt = (now - lastTime) / 1000` and clamp `dt = Math.min(dt, 0.1)` to prevent physics tunneling or visual glitches when switching browser tabs.

---

## Handoff Report

### 1. Observation
- Inspected requirements in `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md` for R2 (Visuals & Polish) and R3 (Audio, Persistence & Customization).
- Found that no external assets (images or audio files) currently exist in the repository, making 100% procedural Canvas vectors and procedural Web Audio API synthesis the optimal, bulletproof choice.
- Observed browser audio policies requiring explicit user gesture handling to initialize `AudioContext` without console warnings or silent audio failures.

### 2. Logic Chain
- Procedural rendering guarantees 0 network dependencies, instant load times, resolution-independent scaling across mobile and desktop displays, and dynamic palette swapping for Day/Night and Skins.
- Web Audio API procedural synthesis guarantees crisp, customizable sound effects without loading audio files or running into CORS issues.
- Using an Object Pool for particles and Offscreen Canvas pre-rendering ensures smooth 60 FPS performance even on low-powered mobile devices.
- Storing all player preferences, high scores, unlocked skins, and achievement state under a versioned localStorage key (`flappy_bird_data_v1`) provides data isolation and clean schema migration.

### 3. Caveats
- Browser privacy modes or restricted storage settings can block `localStorage`. Implementation MUST use a `try...catch` wrapper with an in-memory storage fallback.
- Modern browsers suspend `AudioContext` until a user gesture occurs. The game engine MUST attach a one-time gesture listener (`touchstart`, `mousedown`, `keydown`) to unlock audio seamlessly.

### 4. Conclusion
The specification for R2 and R3 provides a robust, self-contained, highly performant architecture. The game will feature multi-layer parallax scrolling, dynamic day/night cycles, particle pool management, Web Audio API sound synthesis, procedural bird skin customization, and resilient localStorage persistence.

### 5. Verification Method
- **Parallax & Render Loop Verification**: Inspect canvas rendering in browser dev tools; verify 60 FPS performance and seamless layer wrapping without visual seams.
- **Audio Verification**: Trigger jump, score, hit, and click sounds in browser; check dev console for active `AudioContext` state (`running`) after user interaction.
- **Persistence & Skin Verification**: Execute `localStorage.getItem('flappy_bird_data_v1')` in browser console to verify JSON structure, score saving, skin unlocks, and audio toggle states.
