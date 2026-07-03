---
name: run-change
description: >-
  Decide the right ceremony for a change and run the lightweight path for trivial work. Use when the
  user says "run change", "fazer mudança", "quick change" or "mudança rápida", or asks for a small
  edit (typo, refactor, dependency bump, simple bugfix) where full requirements elicitation would be
  overkill. Routes non-trivial work to gather-requirements + the full spec flow instead.
metadata:
  version: 1.0.0
---

# Run Change (fast-path router)

## Purpose

Keep the methodology proportional to the change. Not every edit deserves a 15-section requirements
document. This skill picks between the **lightweight path** (micro-spec, straight to TDD) and the
**full path** (requirements → spec → TDD), then drives the lightweight one end to end.

## Prerequisites

- `AGENTS.md` — conventions and test commands
- `.specs/templates/bugfix-spec.md` / `.specs/templates/feature-spec.md`
- `.claude/skills/run-tdd/SKILL.md` — the TDD cycle both paths use

## Instructions

### Step 1: Classify the Change

Apply this decision rule:

| Signal | Path |
|---|---|
| Typo, comment, docs-only, formatting | **Lightweight** (may skip spec entirely — see Step 2) |
| Refactor with no behavior change | **Lightweight** (micro-spec) |
| Dependency bump / config tweak | **Lightweight** (micro-spec) |
| Bugfix with clear reproduction | **Lightweight** (bugfix micro-spec, regression test first) |
| New feature, new user-facing behavior | **Full** → run `gather-requirements` |
| Multiple stakeholders / unclear scope | **Full** → run `gather-requirements` |
| Schema/data migration | **Full** → use `migration-spec.md` |

When in doubt, ask the user one question to disambiguate, then choose.

### Step 2: Lightweight Path

1. **Docs/typo/formatting only:** make the edit directly; no spec needed. Still run any relevant
   lint/build. Stop here.
2. **Refactor / dep bump / trivial bugfix:** create a **micro-spec** at
   `.specs/changes/<nnn>-<slug>/spec.md` with only:
   - `## Context` — one or two sentences (what and why)
   - `## Tests` (or `## Regression Test` for bugfixes) — the test case(s)
   - `## Validation Checklist` — tests pass, no regressions, conventions followed
   Skip Requirements/Design/Risks/Traceability — they are not needed at this size.
3. Run the `run-tdd` skill against the micro-spec (Red → Green → Refactor).
4. When complete, archive the spec and run `update-changelog`.

### Step 3: Full Path (delegate)

If the change is non-trivial, do not improvise a spec here — run the `gather-requirements` skill to
produce `.specs/requirements/<nnn>-<slug>/`, then create the full `changes/<nnn>-<slug>/spec.md`
from `feature-spec.md`. Before `run-tdd`, run the `review-alignment` skill to confirm the spec
actually covers every `REQ-NN` from the requirements doc — this is the requirements→spec transition
where specs silently drift. Only on an `aligned` verdict proceed to `run-tdd`.

## Output

Report which path was chosen and why, the spec path created (if any), and the result of the TDD
cycle. For docs-only edits, report the change made and confirm no spec was needed.

## Examples

### Example 1: Trivial bugfix

**User says:** "mudança rápida: corrigir off-by-one no paginador"

**Agent should:** classify as Lightweight (bugfix, clear repro) → create
`.specs/changes/012-fix-paginator/spec.md` micro-spec with a regression test → run `run-tdd` (test
fails, fix, passes) → archive + `update-changelog`.

### Example 2: New feature routed to full path

**User says:** "run change: add a CSV export to the reports page"

**Agent should:** classify as Full (new user-facing behavior) → run `gather-requirements` →
create the full spec → `run-tdd`.

## References

- `AGENTS.md` — when to use lightweight vs full (mirrors this rule)
- `METHODOLOGY.md` — "When to Skip" requirements
- `.claude/skills/gather-requirements/SKILL.md` — full path
- `.claude/skills/review-alignment/SKILL.md` — semantic gate at the requirements→spec transition
- `.claude/skills/run-tdd/SKILL.md` — TDD cycle for both paths
- `.specs/templates/bugfix-spec.md`, `.specs/templates/feature-spec.md`
