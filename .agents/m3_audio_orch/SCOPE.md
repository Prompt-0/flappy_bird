# Scope: Milestone 3 (Audio, Persistence & Customization)

## Scope Summary
Milestone 3 delivers procedural Web Audio API audio synthesis, volume management with autoplay unlock, resilient JSON `localStorage` state persistence with in-memory fallback, procedural bird skin definitions with unlock rules, and comprehensive unit tests.

## Target Components & Files
1. `public/js/audio/AudioSynthesizer.js`:
   - 100% procedural Web Audio API synthesizer using `AudioContext`
   - Flap sound: Oscillator pitch sweep (220Hz to 580Hz)
   - Score sound: Two-tone chime (C6 ~ 1046.5Hz, E6 ~ 1318.5Hz)
   - Hit sound: Square wave + lowpass filtered noise crash
   - Click sound: Quick 800Hz sine burst
   - Graceful fallback when AudioContext is unavailable or restricted.

2. `public/js/audio/AudioManager.js`:
   - Autoplay gesture unlocker (`AudioContext.resume()` on user interaction)
   - Master gain node controlling output volume
   - Volume state manager and mute toggle
   - Integration with StorageEngine to persist mute state (`muted`) and volume preferences.

3. `public/js/storage/StorageEngine.js`:
   - Robust JSON `localStorage` driver targeting key `flappy_bird_data_v1`
   - In-memory fallback object when `localStorage` is disabled or throws SecurityError/QuotaExceededError
   - Schema fields: `highScore` (number), `stats` ({ totalGames, totalFlaps, totalPipes, totalTime }), `unlockedSkins` (array of strings), `selectedSkin` (string), `audio` ({ muted: boolean, volume: number })
   - Safe getter/setter API with default fallback values.

4. `public/js/storage/SkinManager.js`:
   - 5 procedural bird skin definitions:
     1. Classic Yellow (`classic_yellow`): Default unlocked
     2. Crimson Phoenix (`crimson_phoenix`): Unlocks at score >= 20
     3. Neon Cyber (`neon_cyber`): Unlocks at score >= 50
     4. Golden Eagle (`golden_eagle`): Unlocks at score >= 100
     5. Midnight Raven (`midnight_raven`): Unlocks at totalGames >= 50
   - Methods to check unlock conditions based on current stats/scores, select skin, and render skin preview/color palettes.

5. Unit Test Suite `tests/unit/test_audio_storage.js`:
   - Node.js runnable test suite (using mock/jsdom or pure JS assertions) verifying:
     - StorageEngine in-memory fallback when localStorage is unavailable
     - High score and statistics persistence and retrieval
     - Skin unlock condition evaluation and skin selection
     - AudioSynthesizer fallback semantics when Web Audio API is uninitialized/unsupported.

## Interface Contracts & Integration
- AudioSynthesizer exports clean methods: `playFlap()`, `playScore()`, `playHit()`, `playClick()`.
- AudioManager wraps AudioSynthesizer, listens to EventBus events (`BIRD_FLAP`, `PIPE_PASS`, `BIRD_HIT`, `ENGINE_STATE_CHANGE`), handles gesture unlock (`initOnUserGesture()`), and exposes `toggleMute()`, `isMuted()`, `setVolume(v)`.
- StorageEngine exposes `load()`, `save(data)`, `getHighScore()`, `setHighScore(score)`, `getStats()`, `updateStats(delta)`, `getAudioPrefs()`, `setAudioPrefs(prefs)`.
- SkinManager exposes `getSkins()`, `unlockCheck(stats)`, `selectSkin(skinId)`, `getSelectedSkin()`.
