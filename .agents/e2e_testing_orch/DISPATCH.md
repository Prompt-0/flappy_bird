# Dispatch Instructions

## 2026-08-10T15:58:34Z
You are the E2E Testing Orchestrator for the Flappy Bird project.
Your working directory is `/root/Projects/flappy_bird/.agents/e2e_testing_orch`.
Read requirements in `/root/Projects/flappy_bird/.agents/ORIGINAL_REQUEST.md`, project roadmap in `/root/Projects/flappy_bird/PROJECT.md`, and test specs in `/root/Projects/flappy_bird/TEST_INFRA.md`.

Task:
1. Create `SCOPE.md` in `/root/Projects/flappy_bird/.agents/e2e_testing_orch/SCOPE.md`.
2. Build the complete E2E opaque-box test suite for Flappy Bird under `tests/`:
   - Tier 1: Feature Coverage (≥5 tests per feature, minimum 60 tests)
   - Tier 2: Boundary & Corner Cases (≥5 tests per feature, minimum 60 tests)
   - Tier 3: Cross-Feature Pairwise Combinations (minimum 12 tests)
   - Tier 4: Real-World Scenarios (minimum 6 tests)
   - Total minimum: 138 test cases.
3. Create a test runner script `tests/run_e2e_tests.js` (or similar native Node.js test harness) that loads HTML/JS files, exercises `window.__FLAPPY_GAME__` and DOM `data-testid` endpoints, or mocks DOM environment via jsdom/custom harness, returning exit code 0 when all tests pass.
4. Dispatch specialist subagents (e.g. `teamwork_preview_test_writer` or `teamwork_preview_worker`) as needed to author and verify test suites.
5. When the test suite is 100% complete and passing, publish `/root/Projects/flappy_bird/TEST_READY.md` summarizing all test tiers, counts, and run commands.
6. Report completion back to parent orchestrator via send_message.

## 2026-08-10T16:50:16Z
Complete Milestone 5 of E2E Testing Track:
1. Dispatch a test writer subagent (`teamwork_preview_test_writer`) if needed to finalize any remaining test files in `tests/` (`tests/tier1_feature_coverage.js`, `tests/tier2_boundary_cases.js`, `tests/tier3_pairwise.js`, `tests/tier4_realworld.js`).
2. Run `node tests/run_e2e_tests.js` via worker to verify all 138+ E2E test cases pass cleanly with exit code 0.
3. Publish `/root/Projects/flappy_bird/TEST_READY.md` at project root with:
   - Test Runner invocation command (`node tests/run_e2e_tests.js`)
   - Coverage Summary table breakdown (Tier 1-4 counts and descriptions)
   - Feature Checklist table (Feature x Tier 1-4 coverage breakdown)
4. Update `progress.md` in `/root/Projects/flappy_bird/.agents/e2e_testing_orch/progress.md` and send completion message to parent orchestrator.
