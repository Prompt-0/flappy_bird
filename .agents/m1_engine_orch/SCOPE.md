# Scope: Milestone 1 (Core Gameplay Engine & Physics)

## Architecture
- **Tech Stack**: HTML5 Canvas, Modern ES6+ JavaScript, Canvas 2D API
- **Design Pattern**: Decoupled Event-Driven Architecture (`EventBus`)
- **Modules**:
  - `public/js/engine/EventBus.js`: Decoupled pub/sub event hub
  - `public/js/engine/GameEngine.js`: Canvas context, high-DPI scaling (DPR), clamped requestAnimationFrame delta loop (360x640 logical res)
  - `public/js/engine/Bird.js`: Bird physics entity (gravity +1350, jump flap -400, terminal velocity +650, rotational tilt math)
  - `public/js/engine/PipeManager.js`: Pipe spawning (200px scroll interval), gap height (135px), random vertical offset, scroll velocity (160px/s)
  - `public/js/engine/CollisionSystem.js`: Circle vs AABB collision math, floor/ceiling boundary handling
  - `tests/unit/test_engine.js`: Comprehensive unit verification test suite for physics and collision math.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | High-DPI Canvas & Game Loop | 360x640 logical resolution with DPR scaling & clamped requestAnimationFrame delta loop | M1 | R1 Survey |
| 2 | Bird Physics Engine | Gravity (+1350px/s²), flap impulse (-400px/s), terminal velocity (+650px/s), velocity-based rotational tilt | M1 | R1 Survey |
| 3 | Pipe Generation & Motion | Distance-based spawning (200px scroll), random gap vertical placement, 135px gap height, 160px/s scroll | M1 | R1 Survey |
| 4 | Collision Detection | Circle vs AABB collision math, floor crash, ceiling boundary clamping | M1 | R1 Survey |
| 5 | Score Tracking | Score increment on pipe pair clearance, event emission | M1 | R1 Survey |
| 6 | Decoupled EventBus | Pub/sub event hub for engine, audio, visual, and UI decoupling | M1 | R1 Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1.1 | EventBus & GameEngine | Decoupled EventBus pub/sub system and GameEngine loop with high-DPI scaling & delta clamping | none | DONE |
| M1.2 | Bird Entity Physics | Bird physics integration (gravity +1350, flap -400, terminal +650, tilt math) | M1.1 | DONE |
| M1.3 | PipeManager & Spawning | Distance-based pipe pair spawning (200px scroll interval), random gap position, 160px/s horizontal scroll | M1.1 | DONE |
| M1.4 | CollisionSystem & Bounds | Circle vs AABB collision math algorithm, ground/ceiling bounds checks | M1.2, M1.3 | DONE |
| M1.5 | Unit Test Verification Suite | Unit verification script tests/unit/test_engine.js testing physics, spawning, and collision math | M1.1 - M1.4 | DONE |

## Interface Contracts

### EventBus Events
- `ENGINE_STATE_CHANGE`: `{ oldState, newState }`
- `BIRD_FLAP`: `{ x, y, vy }`
- `PIPE_SPAWN`: `{ pipeId, x, topHeight, bottomY, gapHeight }`
- `PIPE_PASS`: `{ score, pipeId }`
- `BIRD_HIT`: `{ x, y, cause }`
- `GAME_OVER`: `{ finalScore, isHighScore }`

## Code Layout
```
public/js/engine/
├── EventBus.js
├── GameEngine.js
├── Bird.js
├── PipeManager.js
└── CollisionSystem.js
tests/unit/
└── test_engine.js
```
