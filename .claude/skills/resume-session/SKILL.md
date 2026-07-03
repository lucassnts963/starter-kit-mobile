---
name: resume-session
description: >-
  Print a "where you left off" summary of the project's spec-driven state — the latest working-log
  entry, specs in flight (with their alignment-gate status), and requirements without a spec yet. Use
  when the user says "where did I leave off", "onde paramos", "resume session", "retomar sessão",
  "where were we" or at the start of a work session to regain context. Runs
  scripts/session-context.mjs; the same script is auto-injected by the Claude Code SessionStart hook.
metadata:
  version: 1.0.0
---

# Resume Session

## Purpose

Print a "where you left off" summary so a new session regains context without re-reading the whole
project. It surfaces the latest `.specs/memory/log.md` entry (and its `Next:` line), the specs
currently in `.specs/changes/` with their alignment-gate state, and any requirements that have no
spec yet. This is the manual, harness-agnostic entry point to the same summary the Claude Code
SessionStart hook injects automatically — useful in opencode (no hook) or any time mid-session.

## Prerequisites

- `scripts/session-context.mjs` — the generator this skill runs
- `.specs/memory/log.md` — the working journal it reads (newest dated entry)
- `.specs/changes/` and `.specs/requirements/` — active specs and requirements it inspects

## Instructions

### Step 1: Run the Summary

From the project root:

```bash
node scripts/session-context.mjs
```

It prints the resume block to stdout, or nothing if there is no state to resume (empty log, no active
specs). It is bulletproof: any error or missing artifact yields no output and a clean exit — it never
disrupts a session.

### Step 2: Act on It

Use the summary to pick the next move:
- A `Next:` line in the last log entry → continue that thread.
- A spec marked `alignment: PENDING` or `NOT aligned` → run the `review-alignment` skill before
  `run-tdd` or archiving.
- A requirement with no spec → create `.specs/changes/<nnn>-<slug>/spec.md` from `feature-spec.md`.

### Step 3: Close the Loop (end of session)

At the end of a work block, append a new dated entry to `.specs/memory/log.md` (Did / Learned / Next
/ Refs) so the *next* resume has something to show. The journal is only as useful as it is current.

## Output

The resume block printed by the script (latest journal entry, active specs with alignment state,
requirements without a spec), or a note that there is nothing to resume yet.

## Examples

### Example 1: Mid-project resume

**User says:** "onde paramos"

**Agent should:** run `node scripts/session-context.mjs` → report the last log entry's `Next:` line,
list active specs (flagging any with a pending alignment review), and name the immediate next action.

### Example 2: Fresh project

**User says:** "where did I leave off"

**Agent should:** run the script → it prints nothing (empty log, no active specs) → tell the user
there is no prior state yet and suggest starting with `gather-requirements` or `run-change`.

## References

- `scripts/session-context.mjs` — the generator this skill runs
- `.claude/settings.json` — the SessionStart hook that auto-injects the same summary in Claude Code
- `.specs/memory/log.md` — the append-only working journal
- `.claude/skills/review-alignment/SKILL.md` — run when a spec shows a pending/failed alignment gate
- `.claude/skills/run-change/SKILL.md` — next step when starting fresh work
