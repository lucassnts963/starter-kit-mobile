---
name: record-troubleshooting
description: >-
  Append a distilled error-and-fix entry to .specs/memory/troubleshooting.md after resolving a
  non-trivial problem, so the fix is not re-derived later. Use when the user says "record
  troubleshooting", "registrar troubleshooting", "log this fix", "registrar solução" or
  "salvar troubleshooting", or right after debugging something that cost real investigation
  (a tricky bug, a build/CI failure, an environment gotcha). Compiles the durable lesson out of
  the incident; does not replace the per-incident bugfix-spec.
metadata:
  version: 1.0.0
---

# Record Troubleshooting

## Purpose

Turn a hard-won debugging session into persistent project memory. Following Karpathy's LLM-Wiki
principle — *compile durable knowledge out of transient incidents* — this skill appends one
well-formed `TRB-NN` entry to `.specs/memory/troubleshooting.md` so the next agent searches instead
of re-debugging. It is the failure-mode counterpart of adding a `component-catalog.md` entry after
the Green phase.

## Prerequisites

- `.specs/memory/troubleshooting.md` — the target file (entry format + required fields live there)
- `.specs/config.md` — project constants
- The resolved problem's context: the symptom, what the root cause turned out to be, what fixed it,
  and (if applicable) the related `FIX-NN` spec, commit hash, or PR number

## Instructions

### Step 1: Decide whether it is worth recording

Record only **non-trivial** problems — anything that cost real investigation, surprised you, or could
recur. Skip typos, one-line obvious mistakes, and anything fully covered by a passing test. When in
doubt, record it: a cheap entry beats a re-run of the same debugging.

### Step 2: Pick the next id

Open `.specs/memory/troubleshooting.md` and find the highest existing `## TRB-<n>` heading. The new
entry is the next sequential number, project-wide (`TRB-001` if the file has no entries yet). Ids are
never reused, even if an entry is later removed.

### Step 3: Compile the entry (don't dump the transcript)

Write the *distilled* lesson, not the raw debugging log. Fill the entry format from the target file:

- **Symptom** *(required)* — exact error message / stack excerpt / wrong behavior, greppable.
- **Context** — stack, environment, version, config, or data shape where it appears.
- **Root cause** *(required)* — the underlying reason, once understood.
- **Fix strategy** *(required)* — what worked, **and what did not** (dead ends save future time).
- **Prevention** — how to avoid it, or the early signal it is recurring.
- Metadata line — `Date`, `Related` (`FIX-NN` / commit / PR), `Status`.

Write field labels in the **project's language** (English or Portuguese — `Sintoma`/`Causa`/`Solução`
are accepted). For a large file, group entries under `## <Area>` headers with `### TRB-NNN` beneath;
ids stay global and sequential. The checker validates either layout.

### Step 4: Append and link

Append the block under `## Entries` (bottom-append is the default, mirroring `log.md`). If the
problem came from a `bugfix-spec.md`, cross-link both ways: put the `FIX-NN` id in this entry, and
this `TRB-NN` id in the spec's notes. Keep the source one hop away.

### Step 5: Validate

Run `node scripts/check-consistency.mjs` (`"verificar consistência"`). The checker validates that
every `TRB-NN` entry carries the required fields. Fix any `FAIL` and re-run until it exits `0`.

## Output

Report the `TRB-NN` id assigned, a one-line summary of the entry, the links recorded
(`FIX-NN`/commit/PR), and the consistency-check result.

## Examples

### Example 1: CI failure with a misleading error

**User says:** "registrar troubleshooting: o CI quebrou com ENOSPC mas o disco tinha espaço"

**Agent should:** read `troubleshooting.md` → next id is `TRB-003` → compile the entry (Symptom:
`ENOSPC` in CI; Root cause: inotify watch limit, not disk; Fix strategy: raise watch limit / run
tests in single-run mode; what failed: bumping disk size) → append under `## Entries` → run
`check-consistency` → report `TRB-003` recorded and checks green.

### Example 2: Lesson compiled from an archived bugfix

**User says:** "record troubleshooting for the off-by-one we just fixed in FIX-012"

**Agent should:** create `TRB-004` summarizing the paginator off-by-one — symptom, root cause, the
fix, and prevention — with `Related: FIX-012`, add the `TRB-004` backlink to the spec, validate, and
report.

## References

- `.specs/memory/troubleshooting.md` — target file, entry format, and usage rules
- `.specs/memory/log.md` — chronological journal (this skill writes the topical memory)
- `.specs/templates/bugfix-spec.md` — the per-incident spec an entry is compiled from
- `.claude/skills/run-tdd/SKILL.md` — invoke this skill after a bugfix's Green phase
- `scripts/check-consistency.mjs` — validates the required-field schema
- `.specs/config.md` — project constants
