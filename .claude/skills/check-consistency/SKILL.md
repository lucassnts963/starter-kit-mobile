---
name: check-consistency
description: >-
  Validate that all skills and project conventions are structurally consistent by running the
  deterministic checker script. Use when the user says "check consistency", "verificar consistência",
  "validate skills" or "validar skills", and before committing any skill or config change. Runs
  scripts/check-consistency.mjs (frontmatter, sections, naming, hardcoded URLs, orphan refs,
  changelog coverage, troubleshooting schema, requirements↔spec traceability, alignment gate)
  rather than eyeballing the rules.
metadata:
  version: 2.0.0
---

# Check Consistency

## Purpose

Validate that every skill in `.claude/skills/` and the project's conventions hold, using a real
script so the result is deterministic (not a best-effort prose scan). Run before commits or after
any skill/config change.

## Prerequisites

- Node.js available in PATH (the checker is `scripts/check-consistency.mjs`)
- `.specs/config.md` — source of truth for constants and the canonical Skill Format

## Instructions

### Step 1: Run the Checker

From the project root, run:

```bash
node scripts/check-consistency.mjs
```

The script validates, deterministically:
1. **Skill structure** — each `.claude/skills/<name>/SKILL.md` exists, has valid frontmatter
   (`name` matching its folder, specific `description`), a verb-substantive name, and all 6 canonical
   body sections.
2. **Hardcoded values** — the repo URL literal must not appear outside `.specs/config.md`.
3. **Orphaned references** — no references to old flat skill paths (`.opencode/skills/*.md`) or
   renamed files (`tdd-workflow`, `requirements-gathering`).
4. **Changelog integrity** — every archived spec ID appears in `CHANGELOG.md` and vice-versa
   (skipped when the archive is empty).
5. **Troubleshooting schema** — every live `TRB-NN` entry in `.specs/memory/troubleshooting.md`
   carries the required fields (Symptom, Root cause, Fix strategy), in English **or** Portuguese
   (`Sintoma`/`Causa`/`Solução`). Entries may be flat (`## TRB-NN`) or grouped by area
   (`## <Area>` + `### TRB-NN`). Commented examples are ignored; skipped when there are no entries yet.
6. **Requirements↔spec traceability** — for each requirements doc paired with a same-numbered spec,
   the spec has a `## Requirements Traceability` section linking back to the requirements doc, and
   every `REQ-NN` the spec cites exists there (no dangling ids). Skipped until a pair exists.
7. **Alignment gate** *(blocking on archive)* — an archived, requirements-backed spec must carry an
   `alignment-review.md` (from the `review-alignment` skill) that covers every defined `REQ-NN` and
   reads `Verdict: aligned`. This is the structural enforcement of the semantic review; the script
   checks *that the review ran and passed*, not the meaning itself.

> **Forward-only baseline.** Checks 6–7 never apply retroactively: archive dirs listed in
> `.specs/baseline.json` (`grandfatheredArchive`, written by `upgrade`/`upgrade-methodology` when a
> repo first crosses into 1.1.0) are **exempt**. Specs archived after the baseline must comply. This
> mirrors the kit's forward-only TDD baseline — upgrading a mature repo never breaks CI on legacy specs.

> Tiers 6–7 are the structural half of the two-tier consistency model (`METHODOLOGY.md`). Semantic
> judgment — whether a spec truly covers a requirement — is the `review-alignment` skill's job, which
> this gate makes non-skippable.

### Step 2: Interpret the Result

- Exit code `0` → all checks passed.
- Exit code `1` → the script prints each `FAIL <message>` with the file path. Fix each one and
  re-run until it exits `0`.

### Step 3: Fix and Re-run

For each violation, apply the suggested fix (move a flat file into a skill folder, add missing
frontmatter/section, replace a hardcoded URL with a `.specs/config.md` reference, etc.), then
re-run Step 1.

## Output

Report the script's pass/fail summary. On failure, list each violation with its file path and the
fix applied. On success: `All checks passed`.

## Examples

### Example 1: All clean

**User says:** "verificar consistência"

**Agent should:** run `node scripts/check-consistency.mjs` → exit 0 → report "All checks passed".

### Example 2: Violation found

**User says:** "check consistency"

**Agent should:** run the script → it reports a skill missing the `## Output` section and a hardcoded
URL → fix both → re-run → exit 0 → report what was fixed.

## References

- `scripts/check-consistency.mjs` — the deterministic checker this skill runs
- `.specs/config.md` — constants and canonical Skill Format
- `.claude/skills/create-skill/SKILL.md` — how skills must be structured
- `.specs/memory/component-catalog.md` — reusable code inventory
