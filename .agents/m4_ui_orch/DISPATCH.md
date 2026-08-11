## 2026-08-10T17:00:51Z

You are the Sub-Orchestrator for Milestone 4 (Responsive UI, Controls & State Machine) of the Flappy Bird project.

Your working directory is `/root/Projects/flappy_bird/.agents/m4_ui_orch`.
Read:
- `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`
- `/root/Projects/flappy_bird/PROJECT.md`

Execute Milestone 4:
1. Initialize `/root/Projects/flappy_bird/.agents/m4_ui_orch/DISPATCH.md`, `BRIEFING.md`, `progress.md`, `SCOPE.md`.
2. Dispatch a Worker (`teamwork_preview_worker`) to implement:
   - `public/js/state/StateMachine.js`: 6-state Game State Machine (`START`, `PLAYING`, `PAUSED`, `GAME_OVER`, `SKIN_SELECT`, `SETTINGS`) with lifecycle hooks and EventBus integration.
   - `public/js/ui/ResponsiveScaler.js`: 9:16 aspect ratio canvas scaling algorithm with flexbox pillarboxing/letterboxing & `100dvh` viewport height.
   - `public/js/input/InputManager.js`: Unified touch (`touch-action: none`), mouse click, and keyboard (`Space`, `P`, `Esc`, `Enter`) dispatcher with touch debouncing.
   - `public/js/ui/UIManager.js`, `public/index.html`, `public/css/style.css`, `public/css/animations.css`, `public/js/main.js`: HTML DOM overlays featuring all 14 `data-testid` attributes and global `window.__FLAPPY_GAME__` inspection/automation API (`getState()`, `getScore()`, `getHighScore()`, `getBird()`, `getPipes()`, `triggerFlap()`, `triggerPause()`, `restartGame()`).
   - Unit test suite: `tests/unit/test_ui_state.js` verifying state transitions, window.__FLAPPY_GAME__ global API, and ResponsiveScaler calculations.
   Mandatory integrity prompt: DO NOT CHEAT. All implementations must be genuine.
3. Run `node tests/unit/test_ui_state.js` via Worker.
4. Dispatch 2 Reviewers (`teamwork_preview_reviewer`), 2 Challengers (`teamwork_preview_challenger`), and 1 Forensic Auditor (`teamwork_preview_auditor`).
5. Evaluate gate check in `/root/Projects/flappy_bird/.agents/m4_ui_orch/GATE_STATUS.md`. When passed, mark M4 done in `PROJECT.md` and report completion back to parent orchestrator.
