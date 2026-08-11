# DISPATCH — Worker 2 (Milestone 3 Remediations)

## Task Description
Remediate StorageEngine input validation bugs discovered during Challenger 1 adversarial testing:
1. `public/js/storage/StorageEngine.js`:
   - In `load()` sanitization: ensure `highScore` is non-negative and finite (e.g. `Math.max(0, Number.isFinite(parsed.highScore) ? Math.floor(parsed.highScore) : 0)`).
   - In `setHighScore(score)`: strictly validate `typeof score === 'number' && Number.isFinite(score) && score >= 0 && score > this.data.highScore`. Reject `Infinity`, `-Infinity`, `NaN`, non-numbers, or negative numbers.
   - In `updateStats(deltas)`: validate each delta with `typeof value === 'number' && Number.isFinite(value) && !isNaN(value)` and ensure stats remain non-negative finite numbers. Ignore `NaN`, `Infinity`, or invalid stat deltas.

2. `tests/unit/test_audio_storage.js`:
   - Add unit tests for negative high score rejection/sanitization, `Infinity` rejection in `setHighScore`, and `NaN` delta rejection in `updateStats`.

3. Run verification test suites using `run_command`:
   - `node tests/unit/test_audio_storage.js`
   - `node tests/unit/test_challenger_3_adversarial.js`
   - `node tests/unit/test_m3_empirical_challenger.js`
   - `node tests/unit/test_engine.js`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context Files to Read
- `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`
- `/root/Projects/flappy_bird/PROJECT.md`
- `/root/Projects/flappy_bird/.agents/m3_audio_orch/SCOPE.md`
- `/root/Projects/flappy_bird/.agents/challenger_m3_1/handoff.md`

## Output Requirements
- Target files written in `/root/Projects/flappy_bird/`
- Report execution results and test output in `/root/Projects/flappy_bird/.agents/worker_m3_2/handoff.md`
