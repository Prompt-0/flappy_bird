## 2026-08-10T16:00:29Z

You are a test writer agent. Your working directory is `/root/Projects/flappy_bird/.agents/test_writer_m4`.

Read specification files before starting work:
- `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`
- `/root/Projects/flappy_bird/PROJECT.md`
- `/root/Projects/flappy_bird/TEST_INFRA.md`
- `/root/Projects/flappy_bird/.agents/e2e_testing_orch/SCOPE.md`
- `/root/Projects/flappy_bird/tests/harness.js`

Objective:
Create the Tier 3 Cross-Feature Pairwise test suite in `/root/Projects/flappy_bird/tests/tier3_pairwise.js` and Tier 4 Real-World Scenarios test suite in `/root/Projects/flappy_bird/tests/tier4_realworld.js`.

Requirements:
1. `tests/tier3_pairwise.js`:
   - Set tier context: `setTierContext(3, "Tier 3 - Cross-Feature Pairwise");`
   - Implement at least 12 cross-feature interaction test cases (e.g. Physics + Particle trail, State Machine + Audio toggle, Skin Customization + localStorage persistence, Day/Night cycle + Parallax background, Responsive scaling + DOM overlays, Score increment + Achievement unlock, Pipe spawning + Dynamic gap height, Flap input + Audio synth sweep, Pause menu + Physics freeze, Collision burst + Particle recycling, High score + LocalStorage update, Server HTTP serve + DOM loading).
2. `tests/tier4_realworld.js`:
   - Set tier context: `setTierContext(4, "Tier 4 - Real-World Scenarios");`
   - Implement at least 6 real-world end-to-end user workflow test cases:
     1. New Player Journey (Start -> Flap -> Score -> Crash -> High Score modal)
     2. Customization & Gameplay Workflow (Skin selection -> Game start -> Active avatar -> Persistence)
     3. Pause/Resume & Mute Workflow (Audio toggle -> Mute check -> Pause game -> Physics freeze -> Resume game)
     4. Long Play Session Simulation (Multiple game rounds -> High score progression -> Achievement unlocks -> Weather transitions)
     5. Mobile Touch Gameplay Workflow (Mobile viewport -> Touch tap inputs -> Responsive scaling -> Touch button interaction)
     6. Full Server & Game Lifecycle (Server port launch -> HTTP page fetch -> Full game run -> Page refresh -> LocalStorage persistence reload)
3. Use `describe(...)` and `it(...)` with assertions using `expect(...)` or `assert(...)`.
4. Run `node tests/run_e2e_tests.js` and verify Tier 3 and Tier 4 tests execute and pass cleanly with 0 exit code.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work.

Write your handoff report to `/root/Projects/flappy_bird/.agents/test_writer_m4/handoff.md` and report completion back.
