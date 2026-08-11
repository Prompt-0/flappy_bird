# E2E Test Infra: Flappy Bird Web Game

## Test Philosophy
- Opaque-box, requirement-driven testing. No internal unit coupling.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing across 4 tiers.

## Feature Inventory & Test Coverage Goals
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | Core Physics & Flap | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Pipe Spawning & Collision | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Score Increment | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Multi-layer Parallax & Visuals | R2 | 5 | 5 | ✓ | ✓ |
| 5 | Dynamic Day/Night Cycle | R2 | 5 | 5 | ✓ | ✓ |
| 6 | Particle Engine Overlay | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Web Audio Synth & Mute | R3 | 5 | 5 | ✓ | ✓ |
| 8 | localStorage Persistence | R3 | 5 | 5 | ✓ | ✓ |
| 9 | Bird Skin Customization | R3 | 5 | 5 | ✓ | ✓ |
| 10 | Game State Machine & UI Overlays | R4 | 5 | 5 | ✓ | ✓ |
| 11 | Responsive Canvas Scaling | R4 | 5 | 5 | ✓ | ✓ |
| 12 | Node.js HTTP Server & Ports (3000-3010) | R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: Native Node.js test script / test runner using DOM `data-testid` attributes and `window.__FLAPPY_GAME__` inspection API.
- HTTP target: `http://localhost:3000` (or auto-allocated port in 3000-3010).

## Minimum Thresholds
- Tier 1 (Feature Coverage): 60 tests (5 per feature)
- Tier 2 (Boundary & Edge Cases): 60 tests (5 per feature)
- Tier 3 (Cross-Feature Pairwise): 12 tests
- Tier 4 (Real-World Application Scenarios): 6 tests
- **Total Minimum**: 138 test cases
