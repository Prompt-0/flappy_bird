# Scope: E2E Testing Track

## Architecture
- **Testing Approach**: Opaque-box E2E validation against standard web/DOM interfaces.
- **Endpoints Exercised**: `window.__FLAPPY_GAME__` global inspection API & DOM `data-testid` elements.
- **Runner Environment**: Native Node.js test runner harness (`tests/run_e2e_tests.js`) with DOM / JSDOM environment or custom browser-like DOM context.

## Feature Inventory & Test Mapping
| # | Feature | Target Tier 1 | Target Tier 2 | Target Tier 3 | Target Tier 4 | Milestone |
|---|---------|---------------|---------------|---------------|---------------|-----------|
| 1 | Core Physics & Flap | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 2 | Pipe Spawning & Collision | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 3 | Score Increment | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 4 | Multi-layer Parallax & Visuals | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 5 | Dynamic Day/Night Cycle | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 6 | Particle Engine Overlay | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 7 | Web Audio Synth & Mute | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 8 | localStorage Persistence | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 9 | Bird Skin Customization | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 10 | Game State Machine & UI Overlays | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 11 | Responsive Canvas Scaling | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |
| 12 | Node.js HTTP Server & Ports (3000-3010) | 5 | 5 | Pairwise | Real-World | M2 / M3 / M4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Harness & Runner Setup | Create `tests/run_e2e_tests.js`, harness helpers, and DOM/JSDOM mock environment | none | DONE |
| M2 | Tier 1 Feature Coverage Suite | Author ≥60 Tier 1 tests (≥5 per feature across all 12 features) | M1 | DONE |
| M3 | Tier 2 Boundary & Edge Case Suite | Author ≥60 Tier 2 tests (≥5 per feature across all 12 features) | M1 | DONE |
| M4 | Tier 3 & 4 Pairwise and Real-World Suite | Author ≥12 Tier 3 tests & ≥6 Tier 4 tests | M1 | DONE |
| M5 | Test Suite Verification & Publication | Execute all 138+ E2E tests, verify 100% pass, publish `TEST_READY.md` | M2, M3, M4 | DONE |

## Interface Contracts
- Tests invoke `window.__FLAPPY_GAME__` functions: `getState()`, `getScore()`, `getHighScore()`, `getBird()`, `getPipes()`, `triggerFlap()`, `triggerPause()`, `restartGame()`.
- Tests query DOM elements using `[data-testid="..."]` (e.g. `start-screen`, `pause-screen`, `game-over-screen`, `skin-select-screen`, `settings-screen`, `score-display`, `high-score-display`, `mute-btn`, `skin-option-*`, etc.).
