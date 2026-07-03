---
name: cut-release
description: >-
  Prepare a versioned release of this project: validate version consistency, roll CHANGELOG
  [Unreleased] into a dated version section, and print the remaining manual tag/publish steps. Use
  when the user says "cut release", "cortar release", "preparar release", "fazer release" or "lançar
  versão". Runs scripts/cut-release.mjs (deterministic); it does NOT tag, push, merge, or publish —
  those outward-facing steps require explicit confirmation.
metadata:
  version: 1.0.0
---

# Cut Release

## Purpose

Prepare a release deterministically and safely. The script validates that the release version is
consistent across sources, rolls the accumulated `## [Unreleased]` changelog entries into a dated
`## [<version>]` section, and opens a fresh empty `[Unreleased]`. It deliberately stops before any
outward-facing action (tag, push, merge, GitHub Release) — those are irreversible and need a human's
explicit go-ahead.

## Prerequisites

- `scripts/cut-release.mjs` — the deterministic preparer this skill runs
- `package.json` — holds the release version (single source)
- `.specs/config.md## Methodology Version` — must equal the package version (the kit's release
  version tracks the methodology structure version)
- `CHANGELOG.md` — must have a `## [Unreleased]` section with entries to release

## Instructions

### Step 1: Confirm Version Alignment

The release version is `package.json`'s `version`, and it **must** equal the methodology version in
`.specs/config.md`. If they differ, align them first (decide the target version with the user, set
both). The script refuses to run on a mismatch.

### Step 2: Check Readiness

Run the read-only check:

```bash
node scripts/cut-release.mjs --check
```

It passes only if the version is consistent and `[Unreleased]` has real entries. Fix anything it
reports before cutting.

### Step 3: Cut the Release

Run the consistency check (`node scripts/check-consistency.mjs`) and the CI checks
(`update-changelog.mjs --check`, `update-skills-index.mjs --check`) first — all must be green. Then
cut, passing today's date (scripts have no clock, so the date is an argument):

```bash
node scripts/cut-release.mjs <YYYY-MM-DD>
```

This rewrites `CHANGELOG.md`: `[Unreleased]` becomes `[<version>] - <date>`, and a new empty
`[Unreleased]` is opened above it. Review the diff.

### Step 4: Hand Off the Outward-Facing Steps (do NOT auto-run)

The script prints the remaining steps. **Do not execute them without the user's explicit
confirmation** — they are irreversible and public:

1. Commit the release prep.
2. Merge the release branch into the default branch.
3. `git tag v<version> && git push origin v<version>`.
4. Create the GitHub Release from the `[<version>]` changelog notes.

Present these to the user and ask whether to proceed, or let them run them.

## Output

Report: the release version, the readiness-check result, confirmation that the CHANGELOG was cut
(`[Unreleased]` → `[<version>] - <date>`), and the list of remaining manual tag/publish steps awaiting
the user's go-ahead.

## Examples

### Example 1: Cutting v1.1.0

**User says:** "preparar release"

**Agent should:** confirm `package.json` 1.1.0 == methodology 1.1.0 → run `cut-release.mjs --check`
(ready) → run the three CI checks (green) → `node scripts/cut-release.mjs 2026-06-26` → show the diff
→ list the tag/merge/GitHub-Release steps and ask before doing any of them.

### Example 2: Blocked on a version mismatch

**User says:** "cut release"

**Agent should:** run `--check` → it reports `package.json 1.2.0 != methodology 1.1.0` → tell the
user the versions are out of sync and ask which is correct before proceeding. Do not cut.

## References

- `scripts/cut-release.mjs` — the deterministic release preparer
- `.specs/config.md## Methodology Version` — version the release must match
- `CHANGELOG.md` — the file being cut (Keep a Changelog format)
- `.claude/skills/update-changelog/SKILL.md` — fills `[Unreleased]` from archived specs
- `METHODOLOGY.md## Methodology Versions` — the structure changelog the release version tracks
