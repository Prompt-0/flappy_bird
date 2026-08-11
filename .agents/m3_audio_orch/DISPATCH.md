# DISPATCH

## 2026-08-10T17:00:51Z

You are the Sub-Orchestrator for Milestone 3 (Audio, Persistence & Customization) of the Flappy Bird project.

Your working directory is `/root/Projects/flappy_bird/.agents/m3_audio_orch`.
Read:
- `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`
- `/root/Projects/flappy_bird/PROJECT.md`

Execute Milestone 3:
1. Initialize `/root/Projects/flappy_bird/.agents/m3_audio_orch/DISPATCH.md`, `BRIEFING.md`, `progress.md`, `SCOPE.md`.
2. Dispatch a Worker (`teamwork_preview_worker`) to implement:
   - `public/js/audio/AudioSynthesizer.js`: 100% procedural Web Audio API synthesizer (`AudioContext`) with oscillator pitch sweeps (flap 220-580Hz, score C6/E6 chime, hit square+lowpass noise crash, click 800Hz).
   - `public/js/audio/AudioManager.js`: Autoplay gesture unlocker (`AudioContext.resume()`), master gain node, volume state manager, and persisted mute toggle.
   - `public/js/storage/StorageEngine.js`: Robust JSON `localStorage` key `flappy_bird_data_v1` driver with try/catch memory fallback, saving high score, lifetime stats, unlocked skins, and audio preferences.
   - `public/js/storage/SkinManager.js`: 5 procedural bird skin definitions (Classic Yellow, Crimson Phoenix, Neon Cyber, Golden Eagle, Midnight Raven) with unlock logic and selection state.
   - Unit test suite: `tests/unit/test_audio_storage.js` verifying StorageEngine fallback, high score persistence, skin unlock conditions, and AudioSynthesizer fallback semantics.
   Mandatory integrity prompt: DO NOT CHEAT. All implementations must be genuine.
3. Run `node tests/unit/test_audio_storage.js` via Worker.
4. Dispatch 2 Reviewers (`teamwork_preview_reviewer`), 2 Challengers (`teamwork_preview_challenger`), and 1 Forensic Auditor (`teamwork_preview_auditor`).
5. Evaluate gate check in `/root/Projects/flappy_bird/.agents/m3_audio_orch/GATE_STATUS.md`. When passed, mark M3 done in `PROJECT.md` and report completion back to parent orchestrator.
