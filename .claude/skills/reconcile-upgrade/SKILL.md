---
name: reconcile-upgrade
description: >-
  Guide the user through the judgment steps after a methodology upgrade copied in new files: merge new
  doc sections into AGENTS.md, reconcile overwritten tooling, and adapt existing project artifacts to
  new/changed conventions (e.g. give a troubleshooting.md TRB ids, add traceability links). Use when
  the user says "reconcile upgrade", "ajustar upgrade", "ajustar arquivos da metodologia", "finalizar
  upgrade", "adaptar metodologia" or right after running `spec-kit upgrade` / the upgrade-methodology
  skill. Drives interactive edits, never git/outward-facing steps, and ends on a green check.
metadata:
  version: 1.0.0
---

# Reconcile Upgrade

## Purpose

Finish a methodology upgrade. The deterministic step (`spec-kit upgrade` CLI, or the copy phase of
`upgrade-methodology`) brings in new/refreshed files but cannot make judgment calls. This skill is
that judgment phase: it reads which methodology version(s) were just applied, then walks the user
through merging new documentation, reconciling anything the refresh overwrote, and **adapting the
project's existing files to conventions the new version introduced** — proposing each edit and
confirming before writing, until `check-consistency` is green.

## Prerequisites

- An upgrade just ran: the working tree has its changes and `.specs/config.md## Methodology Version`
  is stamped to the new version.
- `METHODOLOGY.md## Methodology Versions` — the per-version changelog that says *what* each version
  introduced (this drives what to reconcile).
- `git` (to diff what the upgrade changed) and the project's `AGENTS.md`.
- `.specs/config.md` — project constants and the stamped version.

## Instructions

### Step 1: Establish the delta

Read the new version from `.specs/config.md`. From the upgrade output (or `git diff .specs/config.md`)
determine the `from → to` range. Read the matching rows of `METHODOLOGY.md## Methodology Versions` to
list the conventions/artifacts each applied version introduced. Run `git status` / `git diff --stat`
to see exactly what the upgrade added, refreshed, and stamped. Present a short plan of what will be
reconciled before touching anything.

### Step 2: Reconcile AGENTS.md ↔ methodology split (project-owned)

The upgrade never edits `AGENTS.md`; the methodology rules are kit-owned in `.specs/methodology.md`
(refreshed wholesale). Reconcile the boundary:

- **Migrating a pre-split project (1.2.0):** if the project's `AGENTS.md` still has the methodology
  sections inline (`## Key Rules`, `## Choosing the Change Path`, `## Skills`, the LLM-Wiki/memory
  bullets), they now duplicate `.specs/methodology.md`. **Remove those sections** from `AGENTS.md`,
  keeping all project content (stack, commands, architecture, conventions, testing values), and add a
  `## Methodology` section that imports the file: a one-line `@.specs/methodology.md` plus the
  "read and follow them" sentence. Confirm the diff before writing — the goal is that future upgrades
  never touch `AGENTS.md` again.
- **Already split:** nothing to do here. Never hand-maintain a skills table — the catalog is generated
  in `.claude/skills/INDEX.md`.
- Any genuinely **project-relevant** new section a version introduces (rare) is appended to
  `AGENTS.md`, preserving existing content.

### Step 3: Reconcile overwritten tooling

The upgrade overwrites kit-owned tooling (`scripts/*.mjs`, the CI workflow). `git diff` them: if the
project had customized any, that change is now gone. Surface each, and help the user decide — re-apply
the customization on top, or accept the kit version. Flag, never silently discard.

### Step 4: Adapt existing artifacts to new conventions

For each convention the applied version introduced, scan the project for existing files that don't yet
conform and offer to migrate them. Known adaptations (extend this list as the methodology grows —
read the Methodology Versions notes):

- **Troubleshooting schema (1.1.0):** if `.specs/memory/troubleshooting.md` has entries that aren't
  `TRB-NN` headings, or are missing a required field, offer to convert: assign sequential `TRB-NN` ids
  preserving the existing order/area grouping, and ensure each entry has Symptom / Root cause / Fix
  strategy **in the project's language** (fill any gap from the title/context — propose the wording,
  don't translate). Re-run the check to confirm.
- **Requirements↔spec traceability (1.1.0):** active specs in `.specs/changes/` must have a
  `## Requirements Traceability` section linking their requirements doc with a relative link; offer to
  add it. Legacy archived specs are grandfathered by `.specs/baseline.json` — confirm it exists.
- **Forward-only baseline (1.1.0):** if the project had pre-existing archived specs and
  `.specs/baseline.json` is missing, create it (snapshot the current `.specs/archive/*` dirs) so legacy
  specs are exempt. The baseline is a one-time snapshot — it does not grow.
- **AGENTS.md ↔ methodology split (1.2.0):** handled in Step 2 — extract inline methodology sections
  from `AGENTS.md` into the `@.specs/methodology.md` import.

For anything the version introduced that isn't listed here, infer the adaptation from the Methodology
Versions notes and the new files, and propose it.

### Step 5: Validate

Run `node scripts/check-consistency.mjs` (or `spec-kit check`). Resolve each violation with the user,
re-running until it exits `0`. New checks stay dormant until their artifacts exist, so a green result
means the adaptations are complete.

### Step 6: Record the Upgrade in the Working Log

Append a dated entry to `.specs/memory/log.md` recording the upgrade as provenance: **Did** "methodology
upgrade `<from> → <to>`", **Learned** the delta summary (what conventions changed), **Next** any
follow-up, **Refs** the new version. This is the per-project audit trail of when and what was upgraded —
the reproducible apply lives in `spec-kit upgrade`, this is the record that it ran.

### Step 7: Hand Off the Commit

Summarize everything reconciled. Remind the user to commit (this skill edits files; it never runs git,
push, tag, or any outward-facing step).

## Output

A report: the `from → to` version range, what was merged into `AGENTS.md`, any overwritten tooling
flagged, the artifacts migrated (e.g. "troubleshooting.md: 11 entries given TRB ids, 3 missing fields
filled"), the final `check` result, and a reminder to commit.

## Examples

### Example 1: After `spec-kit upgrade` 1.0.0 → 1.1.0 on a pt-BR repo

**User says:** "ajustar os arquivos da metodologia"

**Agent should:** read delta 1.0.0→1.1.0 → append Key Rules 8–9 (and the LLM-Wiki/two-tier notes) to
`AGENTS.md` after confirmation → convert `.specs/memory/troubleshooting.md` to `TRB-NN` ids (keeping
its Portuguese fields and area grouping), filling the missing `Sintoma`/`Causa` → confirm
`.specs/baseline.json` grandfathers the legacy archive → `check-consistency` green → remind to commit.

### Example 2: Nothing to adapt

**User says:** "finalizar upgrade"

**Agent should:** read the delta, find `AGENTS.md` already current and no non-conforming artifacts →
run the check (green) → report there was nothing to reconcile.

## References

- `.claude/skills/upgrade-methodology/SKILL.md` — the upgrade whose judgment phase this completes
- `bin/spec-kit.mjs` — the `spec-kit upgrade` CLI that hands off to this skill
- `METHODOLOGY.md## Methodology Versions` — what each version introduced (drives the reconciliation)
- `.claude/skills/record-troubleshooting/SKILL.md` — the troubleshooting schema adapted in Step 4
- `.claude/skills/check-consistency/SKILL.md` — the validation gate this ends on
- `.specs/config.md` — project constants and the stamped methodology version
