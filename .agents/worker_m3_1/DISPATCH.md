# DISPATCH — Worker (Milestone 3)

## Task Description
Implement Milestone 3 components for Flappy Bird:
1. `public/js/audio/AudioSynthesizer.js`: Procedural Web Audio API sound synthesizer with pitch sweeps, chimes, noise crash, and click. Include safe fallbacks when Web Audio API is uninitialized or unavailable.
2. `public/js/audio/AudioManager.js`: Gesture unlocker, master gain node, volume state manager, and persisted mute toggle.
3. `public/js/storage/StorageEngine.js`: JSON `localStorage` driver for key `flappy_bird_data_v1` with try/catch memory fallback.
4. `public/js/storage/SkinManager.js`: 5 procedural bird skins (Classic Yellow, Crimson Phoenix, Neon Cyber, Golden Eagle, Midnight Raven) with unlock logic and state.
5. `tests/unit/test_audio_storage.js`: Unit test suite verifying StorageEngine fallback, high score persistence, skin unlock conditions, and AudioSynthesizer fallback semantics.
6. Run `node tests/unit/test_audio_storage.js` and verify 100% pass.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context Files to Read
- `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`
- `/root/Projects/flappy_bird/PROJECT.md`
- `/root/Projects/flappy_bird/.agents/m3_audio_orch/SCOPE.md`

## Output Requirements
- Target files written in `/root/Projects/flappy_bird/`
- Report execution results and test output in `/root/Projects/flappy_bird/.agents/worker_m3_1/handoff.md`
