---
name: update-changelog
description: >-
  Generate CHANGELOG.md entries from archived specs by running the changelog script. Use when the
  user says "update changelog", "atualizar changelog", "generate changelog" or "gerar changelog",
  typically right after a spec is moved to .specs/archive/. Runs scripts/update-changelog.mjs, which
  is idempotent (skips specs already in the changelog) — no manual writing.
metadata:
  version: 2.0.0
---

# Update Changelog

## Purpose

Generate changelog entries from archived specs using a real script. It extracts the ID, derives a
readable title, maps it to the correct section, and inserts it under `## [Unreleased]` in
`CHANGELOG.md`. Idempotent — running it twice does not duplicate entries.

## Prerequisites

- Node.js available in PATH (the generator is `scripts/update-changelog.mjs`)
- `.specs/archive/` — archived specs (the source of truth)
- `CHANGELOG.md` — must contain a `## [Unreleased]` section

## Instructions

### Step 1: Run the Generator

From the project root:

```bash
node scripts/update-changelog.mjs
```

The script scans `.specs/archive/*/spec.md`, and for each spec ID not already in the changelog:
- Maps the section: `CHG-` → Added (or Changed if the title mentions refactor/improve/change),
  `FIX-` → Fixed, `MIG-` → Changed.
- Derives the title from the spec's `## Context` first line, or from the folder slug.
- Inserts `- <title> (<ID>)` under the matching `### <Section>` within `## [Unreleased]`.

### Step 2: Preview Mode (optional)

To see what would change without writing (useful in CI or before committing):

```bash
node scripts/update-changelog.mjs --check
```

Exits `1` and lists missing entries if the changelog is out of date; exits `0` if up to date.

### Step 3: Verify

Confirm each new entry landed in the correct section (Added / Changed / Fixed). Then run
`check-consistency` to confirm 100% archive↔changelog coverage.

## Output

1. Updated `CHANGELOG.md`
2. A report of which specs were added (with their section) and how many were skipped as already
   present

## Examples

### Example 1: Single spec archived

**User says:** "atualizar changelog"

**Agent should:** run `node scripts/update-changelog.mjs` → it finds `005-stripe/spec.md` (CHG-005),
inserts `- Stripe payment integration (CHG-005)` under `### Added` → report "1 entry added".

### Example 2: Multiple specs, some already present

**User says:** "generate changelog"

**Agent should:** run the script → CHG-004 already present (skipped), FIX-002 and CHG-005 inserted →
report "2 added, 1 skipped".

## References

- `scripts/update-changelog.mjs` — the generator this skill runs
- `CHANGELOG.md` — changelog file (root)
- `.specs/archive/` — archived specs (source of truth)
- `.claude/skills/run-tdd/SKILL.md` — calls this skill after archiving a spec
- `.claude/skills/check-consistency/SKILL.md` — validates changelog coverage
