# Explorer 3 Survey Report: Responsive UI, Port Allocation & Game State Machine (R4)

## 1. Observation

### 1.1 Repository State & Scope Verification
- **Repository Path**: `/root/Projects/flappy_bird`
- **File System Inspection**: Directory listing confirms the repository is greenfield, containing only `.agents/` metadata directory (`ORIGINAL_REQUEST.md`, `explorer_1/`, `explorer_2/`, `explorer_3/`, `orchestrator_1/`, `sentinel_1/`).
- **Requirement Source**: `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`
  - *R4 Specification (Lines 21-22)*: "Design a mobile-friendly, touch and keyboard responsive UI with start screen, pause menu, skin selector, game over modal, and settings. Serve the web application locally on an allowed port (between 3000-3010) using host `0.0.0.0`."
  - *Acceptance Criteria (Lines 40-41)*: "Responsive canvas scaling maintains crisp visuals on desktop and mobile viewports. The web app launches cleanly on an allowed port (3000-3010) and responds to HTTP requests without errors."
- **User Environment Rules**: Web servers and background tools MUST bind strictly within port range `3000-3010` and host `0.0.0.0`.

### 1.2 Teamwork Explorer Division of Work
- **Explorer 1**: Core Gameplay Engine & Physics (R1) - Canvas setup, delta time, bird physics, pipe generation, collision algorithms.
- **Explorer 2**: Visuals & Polish (R2) & Audio, Persistence & Customization (R3) - Parallax layers, day/night cycle, particle engine, procedural Web Audio, localStorage schema, bird skins.
- **Explorer 3 (This Report)**: Responsive UI, Port Allocation, Game State Machine, and E2E Testability Hooks (R4).

---

## 2. Logic Chain

1. **Greenfield Architecture Needs Clear Module Separation**: Since no legacy code exists, we must establish a modular architecture where the **Game State Machine** acts as the central coordinator between UI views, user inputs, canvas physics loops (R1), and visual/audio renderers (R2/R3).
2. **State Machine Controls Input & Execution Lifecycle**: A 6-state machine (`START`, `PLAYING`, `PAUSED`, `GAME_OVER`, `SKIN_SELECT`, `SETTINGS`) guarantees that gameplay physics update only when in `PLAYING` state, UI overlays show/hide predictably, and user input (`Space`, `P`, `Esc`, `Enter`, Touch Taps) maps contextually to valid actions.
3. **Responsive Scaling Requires Aspect-Ratio Locking**: Mobile and desktop screens vary wildly in aspect ratio. Locking internal game logical coordinates to `360 x 640` (portrait 9:16) while scaling the canvas wrapper via CSS flexbox and dynamic JS scaling algorithm ensures 100% crisp visuals, zero distortion, and resolution-independent physics across all devices.
4. **Touch & Keyboard Unified Input Abstraction**: Mobile devices require `touch-action: none` / `touch-action: manipulation` to eliminate 300ms tap delays, double-tap zoom, and scroll gestures. Tap targets and keypresses must pass through a unified input layer (`InputManager`) with debounce guards on game over transitions to prevent accidental instant restarts.
5. **Zero-Dependency Node.js Server with Dynamic Port Probing**: To satisfy environment rules without heavy external dependencies like express, a native Node.js static HTTP server (`server.js`) can probe ports starting from `3000` up to `3010`. If `3000` is busy (`EADDRINUSE`), it falls back gracefully to `3001`, `3002`, ..., `3010`, listening on host `0.0.0.0`.
6. **E2E Testability Hooks Enable Automated QA**: Automated testing (Playwright/Puppeteer/Cypress/Jest) requires deterministic DOM `data-testid` attributes on overlay elements and a global state bridge (`window.__FLAPPY_GAME__`) to inspect active game state, bird coordinates, pipe arrays, score metrics, and send synthetic input triggers.

---

## 3. Caveats

1. **Browser Audio Auto-Play Policy**: Modern browsers block Web Audio API playback until a user gesture occurs. Transitioning from `START` to `PLAYING` state via user tap/keypress serves as the explicit gesture to initialize or resume the `AudioContext`.
2. **Dynamic Mobile Viewport Height (`100dvh`)**: Mobile Safari and Chrome dynamically collapse URL bars during scroll/touch interactions. Using CSS `100dvh` (Dynamic Viewport Height) instead of fixed `100vh` prevents layout shifting on mobile browsers.
3. **High-DPI / Retina Canvas Rendering**: Scaling logical canvas size (`360x640`) to crisp physical pixels requires scaling canvas internal resolution by `window.devicePixelRatio` while maintaining logical coordinate math in render methods.
4. **Touch Event Debouncing on Game Over**: When a player loses, their rapid tapping/jumping can trigger an instant game restart. A brief cooldown (e.g., 300ms) on `GAME_OVER` entry prevents accidental restarts.

---

## 4. Conclusion & Detailed Design Specifications

### 4.1 Game State Machine Architecture

#### 4.1.1 State Definitions
| State Name | Purpose & Overlay UI | Gameplay Engine Action | Audio State |
|---|---|---|---|
| `START` | Title screen, "TAP TO FLY", Start / Skins / Settings buttons | Ground background parallax scrolling slowly; bird hovering in sinus wave animation; physics paused | Background menu ambiance / mute check |
| `PLAYING` | Minimall HUD (current score on top, pause button top-right) | Full physics loop active (bird gravity, pipe movement, collision detection) | Gameplay audio active |
| `PAUSED` | Pause modal overlay (Resume, Restart, Settings, Audio Toggle) | Physics loop frozen (delta time = 0); visual scene frozen under semi-transparent overlay | Audio paused / muted |
| `GAME_OVER` | Game Over modal (Current Score, High Score, New Record badge, Restart, Skins, Home) | Physics stopped; flash / shake effect triggered; score high score logic saved | Hit crash sound -> game over chime |
| `SKIN_SELECT` | Skin Carousel / Grid modal (Avatar list, unlock badges, select/equip button) | Background frozen in main menu state | Button click sounds |
| `SETTINGS` | Settings modal (Sound toggle/slider, Day/Night theme override, Clear High Scores) | Background frozen | UI click sounds |

#### 4.1.2 State Transition Diagram & Event Matrix
```
               ┌────────────────────────┐
               │         START          │
               └───┬────────┬───────┬───┘
                   │        │       │
       Play / Space│   Skins│       │Settings
                   ▼        │       ▼
           ┌───────────┐    │   ┌───────────┐
           │  PLAYING  │    │   │ SETTINGS  │
           └─┬───────┬─┘    │   └─────┬─────┘
             │       │      │         │
      Pause/P│       │Crash │         │Back / Esc
             ▼       ▼      │         │
    ┌───────────┐  ┌────────┴───┐     │
    │  PAUSED   │  │ SKIN_SELECT│◄────┘ (from Pause or Start)
    └─────┬─────┘  └────────┬───┘
          │                 │
          └─────────────────┘
```

#### 4.1.3 Transition Event Handlers Table
| From State | Trigger / Event | To State | Action / Side Effects |
|---|---|---|---|
| `START` | Space, Enter, Click Play, Tap Canvas | `PLAYING` | Reset bird position, clear pipes, start score at 0, apply initial jump impulse, unlock AudioContext |
| `START` | Click Skins | `SKIN_SELECT` | Show Skins modal overlay, populate skin unlock statuses |
| `START` | Click Settings | `SETTINGS` | Show Settings modal overlay |
| `PLAYING` | Key `P`, Key `Esc`, Click Pause Button | `PAUSED` | Freeze engine delta time, show Pause modal |
| `PLAYING` | Collision Event (Pipe / Ground / Ceiling) | `GAME_OVER` | Trigger screen flash / camera shake, play hit sound, evaluate high score & persistence, show Game Over modal after 300ms delay |
| `PAUSED` | Key `P`, Key `Esc`, Click Resume | `PLAYING` | Unfreeze engine delta time, hide Pause modal |
| `PAUSED` | Click Restart | `PLAYING` | Reset engine state, hide Pause modal |
| `PAUSED` | Click Main Menu | `START` | Reset engine state, show Start screen overlay |
| `GAME_OVER` | Space, Enter, Click Restart, Tap Canvas (after cooldown) | `PLAYING` | Reset bird, clear pipes, start score at 0, jump bird |
| `GAME_OVER` | Click Main Menu / Home | `START` | Hide Game Over modal, show Start screen overlay |
| `GAME_OVER` | Click Skins | `SKIN_SELECT` | Show Skins modal overlay |
| `SKIN_SELECT` | Key `Esc`, Click Back | `START` (or `PAUSED`) | Save equipped skin to `localStorage`, close modal overlay |
| `SETTINGS` | Key `Esc`, Click Back | `START` (or `PAUSED`) | Save settings to `localStorage`, close modal overlay |

#### 4.1.4 State Machine Implementation Pattern
```javascript
// js/state/StateMachine.js
export class StateMachine {
  constructor(initialState = 'START') {
    this.currentState = initialState;
    this.handlers = new Map();
    this.listeners = [];
  }

  addState(stateName, { onEnter, onExit, update, render }) {
    this.handlers.set(stateName, { onEnter, onExit, update, render });
  }

  transitionTo(newState, payload = {}) {
    if (!this.handlers.has(newState)) {
      console.error(`Invalid state transition target: ${newState}`);
      return;
    }
    
    const currentHandler = this.handlers.get(this.currentState);
    if (currentHandler && currentHandler.onExit) {
      currentHandler.onExit(newState);
    }

    const previousState = this.currentState;
    this.currentState = newState;

    const newHandler = this.handlers.get(newState);
    if (newHandler && newHandler.onEnter) {
      newHandler.onEnter(previousState, payload);
    }

    // Notify listeners / update UI visibility
    this.listeners.forEach(cb => cb(this.currentState, previousState));
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  update(dt) {
    const handler = this.handlers.get(this.currentState);
    if (handler && handler.update) handler.update(dt);
  }

  render(ctx) {
    const handler = this.handlers.get(this.currentState);
    if (handler && handler.render) handler.render(ctx);
  }
}
```

---

### 4.2 Responsive UI & Canvas Aspect Ratio Scaling

#### 4.2.1 Aspect Ratio Lock & Logical Coordinate System
- **Logical Canvas Size**: `360px` (Width) x `640px` (Height) - Aspect Ratio `9:16`.
- **Strategy**: The game canvas internal resolution is fixed to `360 x 640`. The visual presentation container scales dynamically via CSS flexbox and JavaScript resize listener to fit any screen resolution (Desktop 4K, Ultra-wide, Tablet, Mobile portrait/landscape) while maintaining pillarboxing/letterboxing.

#### 4.2.2 CSS Layout Architecture
```css
/* css/style.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
  -webkit-user-select: none;
}

html, body {
  width: 100%;
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  background-color: #0f172a; /* Dark background for pillarboxes */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  touch-action: none; /* Disables default pinch-zoom & double-tap gestures */
}

#app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  position: relative;
}

#game-wrapper {
  position: relative;
  width: 360px;
  height: 640px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  border-radius: 12px;
}

canvas#game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* UI Overlays stacked directly over canvas */
.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Transparent to touch unless button target */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
}

.ui-overlay button, .ui-modal button {
  pointer-events: auto;
  cursor: pointer;
  touch-action: manipulation;
}
```

#### 4.2.3 Dynamic Canvas Scaling Algorithm
```javascript
// js/ui/ResponsiveScaler.js
export class ResponsiveScaler {
  constructor(containerEl, wrapperEl, canvasEl, targetWidth = 360, targetHeight = 640) {
    this.container = containerEl;
    this.wrapper = wrapperEl;
    this.canvas = canvasEl;
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
    this.aspectRatio = targetWidth / targetHeight;

    this.init();
  }

  init() {
    window.addEventListener('resize', () => this.scale());
    window.addEventListener('orientationchange', () => setTimeout(() => this.scale(), 100));
    this.scale();
  }

  scale() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const windowAspect = windowW / windowH;

    let displayW, displayH;

    if (windowAspect < this.aspectRatio) {
      // Viewport is narrower than 9:16 (Tall portrait) -> Fit width
      displayW = windowW * 0.96; // 96% width with small padding
      displayH = displayW / this.aspectRatio;
    } else {
      // Viewport is wider than 9:16 (Landscape / Desktop) -> Fit height
      displayH = windowH * 0.94; // 94% height with small padding
      displayW = displayH * this.aspectRatio;
    }

    // Apply pixel scaling to wrapper container
    this.wrapper.style.width = `${Math.floor(displayW)}px`;
    this.wrapper.style.height = `${Math.floor(displayH)}px`;

    // Handle Retina / High-DPI canvas scaling
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.targetWidth * dpr;
    this.canvas.height = this.targetHeight * dpr;

    const ctx = this.canvas.getContext('2d');
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
  }
}
```

#### 4.2.4 Mobile Touch & Keyboard Binding Input Manager
```javascript
// js/input/InputManager.js
export class InputManager {
  constructor(targetElement, stateMachine) {
    this.target = targetElement;
    this.stateMachine = stateMachine;
    this.listeners = new Map();
    this.setupListeners();
  }

  setupListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return; // Prevent key hold spamming
      
      const key = e.code;
      const state = this.stateMachine.currentState;

      if (key === 'Space') {
        e.preventDefault();
        this.emit('flap');
      } else if (key === 'KeyP' || key === 'Escape') {
        e.preventDefault();
        this.emit('toggle_pause');
      } else if (key === 'Enter') {
        e.preventDefault();
        this.emit('confirm');
      }
    });

    // Unified Pointer (Touch + Mouse Click) on Canvas area
    this.target.addEventListener('pointerdown', (e) => {
      // If click/touch was on an interactive UI button, let DOM event take over
      if (e.target.closest('button, input, select, .interactive')) return;
      
      e.preventDefault();
      this.emit('flap');
    });
  }

  emit(action) {
    const handler = this.listeners.get(action);
    if (handler) handler();
  }

  on(action, callback) {
    this.listeners.set(action, callback);
  }
}
```

---

### 4.3 Node.js Static Server Architecture & Port Allocation Strategy

#### 4.3.1 Specification Constraints
- **Host**: `0.0.0.0`
- **Allowed Port Range**: `3000` to `3010` (Strictly enforced)
- **Dependency Policy**: Standard Node.js library (`http`, `fs`, `path`, `url`) - zero external npm package dependency for maximum reliability and instant execution.

#### 4.3.2 Production Ready Server Implementation (`server.js`)
```javascript
// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '0.0.0.0';
const MIN_PORT = 3000;
const MAX_PORT = 3010;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function createServer() {
  return http.createServer((req, res) => {
    // Standard URL sanitization
    let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, safePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>404 Not Found</h1>');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>500 Internal Server Error: ${err.code}</h1>`);
        }
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });
}

function startServer(port) {
  if (port > MAX_PORT) {
    console.error(`[ERROR] No available ports found in range ${MIN_PORT}-${MAX_PORT}. Exiting.`);
    process.exit(1);
  }

  const server = createServer();

  server.listen(port, HOST, () => {
    console.log(`==================================================`);
    console.log(`🚀 Flappy Bird Server is running!`);
    console.log(`🌐 Local URL:   http://localhost:${port}`);
    console.log(`🌐 Network URL: http://${HOST}:${port}`);
    console.log(`==================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[WARN] Port ${port} is occupied. Attempting port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(`[ERROR] Server error:`, err);
      process.exit(1);
    }
  });
}

startServer(MIN_PORT);
```

---

### 4.4 E2E Testing & Testability Hooks Interface

#### 4.4.1 Required DOM `data-testid` Attributes Map
All HTML overlay elements must present explicit `data-testid` attributes to allow automated end-to-end testing (e.g. Playwright / Puppeteer):

```html
<!-- Main Structure in public/index.html -->
<div id="app-container" data-testid="app-container">
  <div id="game-wrapper" data-testid="game-wrapper">
    <canvas id="game-canvas" data-testid="game-canvas"></canvas>

    <!-- Start Overlay -->
    <div id="start-overlay" class="ui-overlay" data-testid="start-overlay">
      <h1 data-testid="game-title">FLAPPY BIRD</h1>
      <button data-testid="play-btn">START GAME</button>
      <button data-testid="skin-select-btn">SKINS</button>
      <button data-testid="settings-btn">SETTINGS</button>
    </div>

    <!-- Gameplay HUD Overlay -->
    <div id="hud-overlay" class="ui-overlay hidden" data-testid="hud-overlay">
      <div id="score-display" data-testid="score-display">0</div>
      <button id="pause-btn" data-testid="pause-btn" aria-label="Pause">⏸</button>
    </div>

    <!-- Pause Modal -->
    <div id="pause-modal" class="ui-modal hidden" data-testid="pause-modal">
      <h2>GAME PAUSED</h2>
      <button data-testid="resume-btn">RESUME</button>
      <button data-testid="restart-btn">RESTART</button>
      <button data-testid="pause-settings-btn">SETTINGS</button>
      <button data-testid="main-menu-btn">MAIN MENU</button>
    </div>

    <!-- Game Over Modal -->
    <div id="game-over-modal" class="ui-modal hidden" data-testid="game-over-modal">
      <h2>GAME OVER</h2>
      <div class="score-card">
        <p>Score: <span data-testid="final-score">0</span></p>
        <p>Best: <span data-testid="high-score">0</span></p>
        <div id="new-record-badge" class="hidden" data-testid="new-record-badge">NEW RECORD!</div>
      </div>
      <button data-testid="game-over-restart-btn">PLAY AGAIN</button>
      <button data-testid="game-over-skins-btn">SKINS</button>
      <button data-testid="game-over-home-btn">HOME</button>
    </div>

    <!-- Skin Selection Modal -->
    <div id="skin-modal" class="ui-modal hidden" data-testid="skin-modal">
      <h2>SELECT BIRD SKIN</h2>
      <div class="skin-grid" data-testid="skin-grid">
        <div class="skin-card" data-testid="skin-card-classic">...</div>
        <div class="skin-card" data-testid="skin-card-cyber">...</div>
        <div class="skin-card" data-testid="skin-card-golden">...</div>
      </div>
      <button data-testid="skin-back-btn">BACK</button>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="ui-modal hidden" data-testid="settings-modal">
      <h2>SETTINGS</h2>
      <label>
        Sound Effects
        <input type="checkbox" data-testid="audio-toggle-checkbox" checked />
      </label>
      <label>
        Theme
        <select data-testid="theme-select">
          <option value="auto">Dynamic Day/Night</option>
          <option value="day">Day</option>
          <option value="night">Night</option>
        </select>
      </label>
      <button data-testid="clear-scores-btn">Reset High Scores</button>
      <button data-testid="settings-back-btn">BACK</button>
    </div>
  </div>
</div>
```

#### 4.4.2 Window Global Test Hook Interface (`window.__FLAPPY_GAME__`)
To enable full inspection of canvas state without OCR or visual diffing during headless tests, the main game instance exposes `window.__FLAPPY_GAME__`:

```javascript
// Exposed test API on window.__FLAPPY_GAME__
window.__FLAPPY_GAME__ = {
  // State Queries
  getState: () => stateMachine.currentState,
  getScore: () => scoreManager.getScore(),
  getHighScore: () => scoreManager.getHighScore(),
  
  // Entity Inspection
  getBird: () => ({
    x: bird.x,
    y: bird.y,
    vy: bird.vy,
    rotation: bird.rotation,
    isDead: bird.isDead
  }),
  
  getPipes: () => pipeManager.pipes.map(p => ({
    x: p.x,
    topHeight: p.topHeight,
    bottomY: p.bottomY,
    scored: p.scored
  })),

  // Synthetic Test Action Triggers
  triggerFlap: () => inputManager.emit('flap'),
  triggerPause: () => inputManager.emit('toggle_pause'),
  restartGame: () => stateMachine.transitionTo('PLAYING'),
  
  // Deterministic Testing Hooks
  setSeed: (seedValue) => pipeManager.setRandomSeed(seedValue),
  setBirdPosition: (x, y) => { bird.x = x; bird.y = y; }
};
```

---

### 4.5 Target Repository Directory & Module Structure

```
/root/Projects/flappy_bird/
├── package.json               # npm scripts ("start": "node server.js")
├── server.js                  # Zero-dependency Node.js HTTP server (ports 3000-3010)
└── public/
    ├── index.html             # UI overlays with data-testid attributes
    ├── css/
    │   ├── style.css          # Responsive flexbox layout & modal styles
    │   └── animations.css     # UI modal fade-in & button bounce transitions
    ├── js/
    │   ├── main.js            # Entry point, initializes scaler & modules
    │   ├── state/
    │   │   └── StateMachine.js # 6-state transition coordinator
    │   ├── input/
    │   │   └── InputManager.js # Touch / mouse / keyboard input dispatcher
    │   ├── ui/
    │   │   ├── ResponsiveScaler.js # 9:16 aspect ratio canvas scaling
    │   │   └── UIManager.js   # DOM modal visibility & data-testid updates
    │   ├── engine/            # (Implemented by R1 - Explorer 1 spec)
    │   │   ├── GameLoop.js
    │   │   ├── Bird.js
    │   │   └── PipeManager.js
    │   ├── visuals/           # (Implemented by R2 - Explorer 2 spec)
    │   │   ├── Parallax.js
    │   │   └── ParticleEngine.js
    │   └── audio/             # (Implemented by R3 - Explorer 2 spec)
    │       └── AudioSynthesizer.js
    └── assets/                # Audio samples / icons (if needed)
```

---

## 5. Verification Method

### 5.1 Static Verification & Inspection
1. Verify presence of `server.js` and `public/index.html` structure once implementation begins.
2. Confirm presence of all 14 `data-testid` attributes listed in Section 4.4.1 in `public/index.html`.
3. Confirm `window.__FLAPPY_GAME__` hook methods exist in `public/js/main.js`.

### 5.2 Dynamic Execution Verification Commands
1. **Server Startup & Port Fallback Verification**:
   ```bash
   node server.js
   ```
   *Expected Output*: Server starts on `http://0.0.0.0:3000` (or `3001` if `3000` is bound).
2. **HTTP Endpoint Health Check**:
   ```bash
   curl -I http://localhost:3000/
   ```
   *Expected Output*: HTTP/1.1 200 OK with `Content-Type: text/html; charset=utf-8`.
3. **Responsive Canvas Inspection**:
   Open browser dev tools, toggle device toolbar (iPhone SE, iPad, Desktop 1920x1080). Canvas aspect ratio (`360:640`) must maintain letterboxing/pillarboxing with no scrollbars or canvas distortion.

### 5.3 Invalidation Conditions
- Server fails or attempts to bind outside port range `3000-3010`.
- Game canvas stretches or distorts non-proportionally when window is resized.
- Flap action triggers while in `PAUSED`, `SETTINGS`, or `SKIN_SELECT` states.
- Rapid tapping after collision bypasses `GAME_OVER` modal without cooldown.
