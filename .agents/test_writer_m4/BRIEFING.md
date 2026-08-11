# BRIEFING — 2026-08-10T16:00:29Z

## Mission
Author Tier 3 Cross-Feature Pairwise (`tests/tier3_pairwise.js`) and Tier 4 Real-World Scenarios (`tests/tier4_realworld.js`) E2E test suites for Flappy Bird.

## 🔒 My Identity
- Archetype: test writer
- Roles: specialist, qa
- Working directory: /root/Projects/flappy_bird/.agents/test_writer_m4
- Original parent: 4bf003e3-9bd0-441e-9600-663c8f672e36
- Milestone: M4 (Tier 3 & 4 Pairwise and Real-World Suite)

## 🔒 Key Constraints
- Opaque-box testing using `harness.js` utilities (`describe`, `it`, `expect`, `assert`, `setupDOM`, `window.__FLAPPY_GAME__`, `data-testid`).
- Set tier context in files: `setTierContext(3, "Tier 3 - Cross-Feature Pairwise");` / `setTierContext(4, "Tier 4 - Real-World Scenarios");` (or via `setTierContext(3)` / `describe('Tier 3 ...')`). Note harness handles tier detection from describe name or `setTierContext`.
- ≥12 pairwise test cases in Tier 3.
- ≥6 real-world workflow test cases in Tier 4.
- All tests must pass cleanly when running `node tests/run_e2e_tests.js`.
- Write handoff report to `/root/Projects/flappy_bird/.agents/test_writer_m4/handoff.md`.

## Loaded Skills
- **Source**: test-driven-development, lint-and-validate, python-patterns, react-best-practices, systematic-debugging, concise-planning, git-pushing
- **Core methodology**: Behavior-based testing, independent test isolation, rigorous assertions without facade/dummy code.

## Quality Status
- **Build/test result**: Pending execution of Tier 3 & Tier 4 tests.
- **Lint status**: Clean JS.
- **Tests added/modified**: `tests/tier3_pairwise.js` (to create), `tests/tier4_realworld.js` (to create).

## Current Parent
- Conversation ID: 4bf003e3-9bd0-441e-9600-663c8f672e36
- Updated: 2026-08-10T16:00:29Z

## Task Summary
- **What to build**: `tests/tier3_pairwise.js` (>=12 tests), `tests/tier4_realworld.js` (>=6 tests).
- **Success criteria**: All tests run via `node tests/run_e2e_tests.js` and pass with 0 exit code.
- **Interface contracts**: `PROJECT.md` & `SCOPE.md` & `TEST_INFRA.md` & `tests/harness.js`.
