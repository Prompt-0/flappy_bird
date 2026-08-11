# Project: Flappy Bird Web Game

## Architecture
- **Tech Stack**: HTML5 Canvas, Modern ES6+ JavaScript, CSS3 flexbox (`100dvh`), Node.js static HTTP server.
- **Design Pattern**: Decoupled Event-Driven Architecture (`EventBus`) with 6-state Game State Machine (`START`, `PLAYING`, `PAUSED`, `GAME_OVER`, `SKIN_SELECT`, `SETTINGS`).
- **Render Pipeline**: High-DPI canvas scaling, 5-layer parallax background with offscreen pre-rendering, dynamic day/night palette lerp, 200-capacity particle object pool.
- **Audio Engine**: 100% procedural Web Audio API synthesizer (`AudioContext`) with oscillator pitch sweeps, noise bursts, master gain, and gesture unlocking.
- **Persistence Engine**: Resilient JSON `localStorage` key `flappy_bird_data_v1` with in-memory fallback, high scores, statistics, skin unlocks, and achievement system.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | High-DPI Canvas & Game Loop | 360x640 logical resolution with DPR scaling & clamped requestAnimationFrame delta loop | M1 | R1 Survey |
| 2 | Bird Physics Engine | Gravity (+1350px/s²), flap impulse (-400px/s), terminal velocity (+650px/s), velocity-based rotational tilt | M1 | R1 Survey |
| 3 | Pipe Generation & Motion | Distance-based spawning (200px scroll), random gap vertical placement, 135px gap height, 160px/s scroll | M1 | R1 Survey |
| 4 | Collision Detection | Circle vs AABB collision math, floor crash, ceiling boundary clamping | M1 | R1 Survey |
| 5 | Score Tracking | Score increment on pipe pair clearance, event emission | M1 | R1 Survey |
| 6 | Decoupled EventBus | Pub/sub event hub for engine, audio, visual, and UI decoupling | M1 | R1 Survey |
| 7 | 5-Layer Parallax Background | Continuous parallax scrolling (Sky, Mountains, Hills, Bushes, Ground) with speed ratios (0.15x, 0.40x, 0.75x, 1.0x) | M2 | R2 Survey |
| 8 | Modulo Seamless Layer Wrapping | Modulo wrap calculation for infinite horizontal scrolling without visual seams | M2 | R2 Survey |
| 9 | Dynamic Day/Night Weather Cycle | 4-phase sky gradient & tint transitions (Day, Sunset, Night, Dawn) with celestial orbital arc (Sun/Moon) & starfield | M2 | R2 Survey |
| 10 | Particle Engine & Object Pool | 200-capacity pre-allocated particle pool for flap trails, collision bursts, and score sparkles | M2 | R2 Survey |
| 11 | Offscreen Sprite Caching | Offscreen canvas pre-rendering for pipes, ground tiles, and parallax layers for 60 FPS performance | M2 | R2 Survey |
| 12 | Procedural Web Audio Synth | Oscillator sweeps for flap (220-580Hz), score chime (C6/E6), hit crash (square + lowpass noise), UI click (800Hz) | M3 | R3 Survey |
| 13 | Audio Autoplay Gesture Unlocker | First-touch/click listener to call AudioContext.resume() per browser security policies | M3 | R3 Survey |
| 14 | Mute & Volume State Manager | Master gain control & mute toggle persisted in storage | M3 | R3 Survey |
| 15 | localStorage Persistence Engine | Robust JSON read/write driver targeting key `flappy_bird_data_v1` with try/catch memory fallback | M3 | R3 Survey |
| 16 | High Score & Stats Tracking | Lifetime stats (best score, total games, total pipes) & achievement tracking | M3 | R3 Survey |
| 17 | Procedural Skin Customization | 5 bird skins (Classic Yellow, Crimson Phoenix, Neon Cyber, Golden Eagle, Midnight Raven) with unlock conditions | M3 | R3 Survey |
| 18 | Game State Machine | 6-state machine (START, PLAYING, PAUSED, GAME_OVER, SKIN_SELECT, SETTINGS) with lifecycle handlers | M4 | R4 Survey |
| 19 | Responsive UI & Aspect Ratio Lock | 9:16 aspect ratio canvas scaling algorithm with flexbox pillarboxing/letterboxing & 100dvh height | M4 | R4 Survey |
| 20 | Unified Input Manager | Touch (`touch-action: none`), mouse click, and keyboard (`Space`, `P`, `Esc`, `Enter`) with touch debounce | M4 | R4 Survey |
| 21 | DOM Overlays & data-testid Hooks | HTML overlay modals with all 14 data-testid attributes and window.__FLAPPY_GAME__ inspection interface | M4 | R4 Survey |
| 22 | Native Node.js Static Server | Zero-dependency HTTP server (server.js) bound to 0.0.0.0 with automatic port scanner (range 3000-3010) | M5 | R4 Survey |
| 23 | E2E Test Suite Pass | 100% pass on Tier 1-4 opaque-box test suite from E2E Testing Track | M5 | Integration |
| 24 | Adversarial Coverage Hardening | Tier 5 white-box test case generation and bug fixes | M5 | Integration |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Gameplay Engine & Physics | HTML5 Canvas setup, game loop, physics, pipe spawning, collision, score, EventBus | none | DONE |
| M2 | Visual Effects & Polish | 5-layer parallax, day/night cycles, celestial arc, particle pool, offscreen caching | M1 | DONE |
| M3 | Audio, Persistence & Customization | Web Audio synthesizer, sound toggle, localStorage engine, skin customization & stats | M1 | IN_PROGRESS |
| M4 | Responsive UI, Controls & State Machine | 6-state StateMachine, ResponsiveScaler, InputManager, DOM overlays with data-testid & window.__FLAPPY_GAME__ | M1 | IN_PROGRESS |
| M5 | Web Server & E2E Test Suite Pass | Zero-dep server.js on 0.0.0.0:3000-3010, Tier 1-4 E2E test suite pass, Tier 5 hardening | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### EventBus Events
- `ENGINE_STATE_CHANGE`: `{ oldState, newState }`
- `BIRD_FLAP`: `{ x, y, vy }`
- `PIPE_SPAWN`: `{ pipeId, x, topHeight, bottomY, gapHeight }`
- `PIPE_PASS`: `{ score, pipeId }`
- `BIRD_HIT`: `{ x, y, cause }`
- `GAME_OVER`: `{ finalScore, isHighScore }`

### window.__FLAPPY_GAME__ Global API
- `getState()`: string (`START`, `PLAYING`, `PAUSED`, `GAME_OVER`, `SKIN_SELECT`, `SETTINGS`)
- `getScore()`: number
- `getHighScore()`: number
- `getBird()`: `{ x, y, vy, rotation, isDead }`
- `getPipes()`: array of `{ x, topHeight, bottomY, scored }`
- `triggerFlap()`: void
- `triggerPause()`: void
- `restartGame()`: void

## Code Layout
```
/root/Projects/flappy_bird/
├── server.js                  # Zero-dependency Node.js HTTP server (0.0.0.0:3000-3010)
├── package.json               # npm scripts ("start": "node server.js")
└── public/
    ├── index.html             # UI overlays with data-testid attributes
    ├── css/
    │   ├── style.css          # Flexbox pillarbox layout & modal styles
    │   └── animations.css     # Fade & scale animation effects
    └── js/
        ├── main.js            # Main entry point & initialization
        ├── engine/
        │   ├── GameEngine.js   # Game loop & canvas context
        │   ├── EventBus.js     # Pub/Sub event hub
        │   ├── Bird.js         # Bird entity & physics math
        │   ├── PipeManager.js  # Pipe spawning & scroll logic
        │   └── CollisionSystem.js # Circle vs AABB collision math
        ├── visuals/
        │   ├── Parallax.js     # 5-layer parallax & day/night sky
        │   ├── ParticleEngine.js # 200-capacity particle pool
        │   └── SpriteCache.js  # Offscreen canvas pre-rendering
        ├── audio/
        │   ├── AudioSynthesizer.js # Web Audio API sound synthesizer
        │   └── AudioManager.js # Autoplay gesture & volume control
        ├── storage/
        │   ├── StorageEngine.js # localStorage JSON driver
        │   └── SkinManager.js  # Bird skin definitions & unlock logic
        ├── state/
        │   └── StateMachine.js # 6-state game transition coordinator
        ├── input/
        │   └── InputManager.js # Touch / mouse / keyboard input dispatcher
        └── ui/
            ├── ResponsiveScaler.js # 9:16 aspect ratio canvas scaling
            └── UIManager.js   # DOM modal visibility & data-testid updates
```
