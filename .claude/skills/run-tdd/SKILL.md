---
name: run-tdd
description: >-
  Drive the Red → Green → Refactor TDD cycle for an active spec, ensuring tests are written before
  implementation. Use when the user says "run TDD cycle", "executar TDD", "TDD", "write tests" or
  "escrever testes", or when implementing a spec from .specs/changes/. Reads the spec's Tests
  section, writes failing tests, implements, refactors against clean-code standards, and updates the
  spec checklist + component catalog.
metadata:
  version: 1.1.0
---

# TDD Workflow

## Purpose

Guide agents through the Test-Driven Development cycle integrated with the spec-driven methodology.
Ensures tests are always written before implementation code.

## Prerequisites

- `AGENTS.md` — project conventions and test commands
- `.specs/memory/conventions.md` — testing conventions
- `.specs/memory/architecture.md` — ADR-002 (TDD)
- `.specs/memory/clean-code.md` — clean code standards (SOLID, metrics, anti-patterns)
- `.specs/memory/component-catalog.md` — reusable components (check before creating)
- The active spec in `.specs/changes/<nnn>-<slug>/spec.md`
- For specs that have a requirements doc: an `aligned` verdict from the `review-alignment` skill
  (`alignment-review.md`) before starting — implementing a misaligned spec just bakes the drift in

## Instructions

### Step 1: Read the Spec

Read the active spec's `## Tests` section (or `## Regression Test` for bugfixes). Extract test case
IDs (TEST-01, …), types (unit/integration/e2e), expected behaviors, and test file locations.

### Step 2: Set Up Test Infrastructure

Check if test files exist at the spec's paths. If they exist, append new cases; otherwise create the
file using the project's test-file convention from `conventions.md`.

### Step 3: Write Tests (RED Phase)

Write exactly the test cases defined in the spec:
1. Descriptive names: `should <expected behavior> when <condition>`
2. Tests must be independent (no shared mutable state)
3. For bugfixes: the regression test must faithfully reproduce the bug
4. Reuse existing test utilities, mocks, and fixtures

**CRITICAL:** Do NOT write any implementation code yet. Only tests.

### Step 4: Verify Tests Fail (RED)

Run `<TEST_COMMAND>`. All new tests must FAIL. If any pass without implementation, the test may be
wrong or the feature may already exist (re-evaluate the spec). Report: "X tests written, all failing
as expected (Red phase)."

### Step 5: Implement (GREEN Phase)

Write the minimum implementation to make all tests pass. Follow the spec's `## Design` and
`## Requirements`, the conventions in `AGENTS.md`/`conventions.md`, handle all states (loading,
empty, error, success), and do not over-engineer.

### Step 6: Verify Tests Pass (GREEN)

Run `<TEST_COMMAND>`. All tests must PASS. If any fail, fix the implementation (not the test) and
re-run. Report: "All tests passing (Green phase)."

### Step 7: Refactor

Clean up following `.specs/memory/clean-code.md`. Run the refactor checklist:

```
[ ] Functions under 20 lines
[ ] No more than 3 parameters per function
[ ] Dependencies injected — no new in constructors
[ ] No magic numbers or strings
[ ] No deep nesting (>3 levels)
[ ] Names explain intent (function, variable, parameter)
[ ] One responsibility per class/function
[ ] Dead code removed (not commented out)
[ ] No duplicated logic — if it appears twice, extract it
[ ] All tests still pass after refactoring
```

Then check `.specs/memory/component-catalog.md`: if you created or extracted reusable code, add it.
Report: "Refactored. All tests still passing. [N] new catalog entries."

### Step 8: Run Full Test Suite

Run `<TEST_COVERAGE_COMMAND>`. Verify no regressions and that coverage meets `{COVERAGE_THRESHOLD}%`.

### Step 9: Update Spec Checklist

Mark complete: tests written first (Red), all passing (Green), refactored without breaking tests,
coverage meets threshold.

### Step 10: Gate, Archive, Update Changelog

Before moving a spec to `.specs/archive/`: if it has a requirements doc, re-run the `review-alignment`
skill so its `alignment-review.md` reflects the final spec and reads `Verdict: aligned`. The
`check-consistency` gate **blocks** archiving a requirements-backed spec without a complete, aligned
review. Then move the spec to `archive/` and run `node scripts/check-consistency.mjs` to confirm the
gate is green. Finally, run the `update-changelog` skill ("atualizar changelog" / "update
changelog"). If the spec is still in `changes/`, skip the archive/changelog steps.

### Step 11: Append a Working-Log Entry

Close the loop on the memory: append one dated block to `.specs/memory/log.md` — **Did** (the spec id
and what shipped), **Learned** (any non-obvious gotcha → also record a `TRB-` entry), **Next** (the
immediate next step), **Refs** (spec id, commits). This is what `resume-session` reads next time; the
journal is only useful if it is fed. A non-trivial debug during the cycle also earns a
`record-troubleshooting` entry.

## Output

After completing the cycle, report: tests written, tests passing, coverage %, files created/modified,
and any edge cases discovered that should be added to the spec.

## Examples

### Example 1: Feature Implementation

**User says:** "Implement the spec at .specs/changes/001-search-fields/"

**Agent should:** read 5 test cases → create test files → run (all fail, Red) → implement → run (all
pass, Green) → refactor (extract helper) → full suite (coverage 85% ≥ 80%) → update checklist.

### Example 2: Bugfix

**User says:** "Fix the encoding bug from FIX-002"

**Agent should:** read `## Regression Test` → write reproducing test (fails, Red) → fix affected
files → test passes (Green) → full suite (no regressions) → update checklist.

## References

- `AGENTS.md` — project overview, test commands, conventions
- `.specs/memory/conventions.md` — testing standards and patterns
- `.specs/memory/architecture.md` — ADR-002 (TDD)
- `.specs/memory/clean-code.md` — SOLID, metrics, anti-patterns
- `.specs/templates/feature-spec.md`, `.specs/templates/bugfix-spec.md`, `.specs/templates/test-spec.md`
- `.claude/skills/review-alignment/SKILL.md` — alignment gate required before archiving a spec
- `.claude/skills/update-changelog/SKILL.md` — run after archiving a spec
