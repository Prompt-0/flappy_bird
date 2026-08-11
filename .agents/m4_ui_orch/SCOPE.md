# Scope: Milestone 4 (Responsive UI, Controls & State Machine)

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 18 | Game State Machine | 6-state machine (`START`, `PLAYING`, `PAUSED`, `GAME_OVER`, `SKIN_SELECT`, `SETTINGS`) with lifecycle hooks and EventBus | M4 | IN_PROGRESS |
| 19 | Responsive UI & Aspect Ratio Lock | 9:16 aspect ratio canvas scaling algorithm with flexbox pillarboxing/letterboxing & `100dvh` viewport height | M4 | IN_PROGRESS |
| 20 | Unified Input Manager | Touch (`touch-action: none`), mouse click, and keyboard (`Space`, `P`, `Esc`, `Enter`) dispatcher with touch debouncing | M4 | IN_PROGRESS |
| 21 | DOM Overlays & data-testid Hooks | HTML overlay modals featuring all 14 `data-testid` attributes and global `window.__FLAPPY_GAME__` inspection API | M4 | IN_PROGRESS |

## Required Deliverables & Files
- `public/js/state/StateMachine.js`
- `public/js/ui/ResponsiveScaler.js`
- `public/js/input/InputManager.js`
- `public/js/ui/UIManager.js`
- `public/index.html`
- `public/css/style.css`
- `public/css/animations.css`
- `public/js/main.js`
- `tests/unit/test_ui_state.js`

## Interface Contracts & Requirements
- State Machine States: `START`, `PLAYING`, `PAUSED`, `GAME_OVER`, `SKIN_SELECT`, `SETTINGS`
- Keybindings: `Space` (flap/start), `P` (pause toggle), `Esc` (pause/back), `Enter` (start/restart)
- 14 `data-testid` attributes on DOM elements:
  - `start-screen`, `start-button`, `skin-select-button`, `settings-button`
  - `pause-screen`, `resume-button`, `restart-button`
  - `game-over-screen`, `retry-button`
  - `skin-select-screen`, `skin-option`
  - `settings-screen`, `sound-toggle`, `close-settings-button`
- `window.__FLAPPY_GAME__` global API:
  - `getState()`
  - `getScore()`
  - `getHighScore()`
  - `getBird()`
  - `getPipes()`
  - `triggerFlap()`
  - `triggerPause()`
  - `restartGame()`
