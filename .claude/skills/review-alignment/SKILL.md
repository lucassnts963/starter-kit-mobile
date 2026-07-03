---
name: review-alignment
description: >-
  Semantically check that a spec faithfully covers its requirements document — catching omissions,
  contradictions, and scope drift that the deterministic check-consistency script cannot see. Use
  when the user says "review alignment", "revisar alinhamento", "check spec alignment", "verificar
  spec", "validar spec contra requisitos", or at the requirements→spec transition before run-tdd and
  before archiving. Produces an alignment-review.md verdict that the consistency gate enforces.
metadata:
  version: 1.0.0
---

# Review Alignment

## Purpose

Semantically verify that a spec faithfully covers its requirements document, producing a stamped
`alignment-review.md` verdict per requirement. This is the **semantic tier** of the two-tier
consistency model: the deterministic checker (`check-consistency.mjs`) validates *structure* — that
links and ids exist — but is blind to *meaning*, whether a spec actually addresses what each
requirement says. This adversarial LLM review exists because, in practice, generated specs drift —
silently dropping requirements that were written down. It catches that before it becomes history.

## Prerequisites

- The requirements doc: `.specs/requirements/<nnn>-<slug>/requirements.md`
- The spec under review: `.specs/changes/<nnn>-<slug>/spec.md` (same `<nnn>`)
- `.specs/templates/feature-spec.md` — the `## Requirements Traceability` section being validated
- `scripts/check-consistency.mjs` — the gate that consumes this skill's output

## Instructions

### Step 1: Load both documents in full

Read the entire `requirements.md` and the entire `spec.md`. Do **not** skim. Build the set of
requirement ids defined in the requirements doc: every `REQ-NN` (functional) and any `NFR-NN` the
spec is expected to honor. This set is the checklist — the review must account for **every** id.

### Step 2: Judge each requirement adversarially

For each `REQ-NN`, assign exactly one verdict. **Default to the worse verdict when coverage is not
explicit** — the failure mode this skill exists to catch is rubber-stamping, so the burden of proof
is on the spec to demonstrate coverage, not on you to assume it.

| Verdict | Meaning |
|---|---|
| `Covered` | The spec explicitly and completely addresses the requirement. Cite the spec section/quote. |
| `Partial` | The spec addresses part of it but omits an acceptance criterion or edge case. State what is missing. |
| `Missing` | No section of the spec addresses this requirement. |
| `Contradicted` | The spec specifies behavior that conflicts with the requirement. |

Pull the **evidence** straight from the spec (section heading + short quote). "It's probably handled"
is not evidence — that phrasing means `Partial` or `Missing`.

### Step 3: Check for scope drift (the reverse direction)

List anything the spec does that is **not** traceable to any requirement. Drift is not automatically
wrong (technical tasks exist), but unexplained behavior is a smell — flag it for the author.

### Step 4: Decide the overall verdict

- `aligned` — every requirement is `Covered` (or `Partial`/drift that the author has explicitly
  accepted and annotated as a deliberate scope decision).
- `misaligned` — any requirement is `Missing` or `Contradicted`, or an unaccepted `Partial` remains.

Be honest: a `misaligned` verdict is the skill doing its job. Do not soften it to let a spec pass.

### Step 5: Write the artifact

Write `.specs/changes/<nnn>-<slug>/alignment-review.md` in this exact shape (the gate parses the
metadata line and the REQ ids):

```markdown
# Alignment Review — CHG-<nnn>

- **Reviewed-spec:** CHG-<nnn>
- **Reviewed-requirements:** ../../requirements/<nnn>-<slug>/requirements.md
- **Date:** YYYY-MM-DD
- **Verdict:** aligned        <!-- or: misaligned -->

## Per-Requirement Verdicts

| REQ ID | Verdict | Evidence (spec section · quote) | Gap / Action |
|---|---|---|---|
| REQ-01 | Covered | `## Design` · "renders the empty state when no rows" | — |
| REQ-02 | Missing | — | not addressed anywhere in the spec |

## Scope Drift

- `<spec behavior with no matching requirement>` — <why / flag>

## Summary

<1–2 sentence judgment. If misaligned, name the exact gap to fix.>
```

The artifact must list a verdict row for **every** `REQ-NN` defined in the requirements doc — the
consistency gate fails if any defined requirement is unreviewed.

### Step 6: Act on the verdict

- `misaligned` → do **not** proceed to `run-tdd` or archive. Fix the spec to cover the gap (or, if the
  gap is a deliberate scope cut, update the requirements doc's `## 9. Out of Scope` / MoSCoW so the
  decision is recorded), then re-run this skill.
- `aligned` → proceed. The review is a release gate: `check-consistency.mjs` blocks archiving a spec
  whose `alignment-review.md` is absent, incomplete, or `misaligned`.

### Step 7: Validate

Run `node scripts/check-consistency.mjs`. The traceability and alignment-gate checks must pass.

## Output

Report the overall verdict, the per-`REQ` verdict counts (Covered/Partial/Missing/Contradicted), any
scope drift, the artifact path, and — if `misaligned` — the precise gap to close before proceeding.

## Examples

### Example 1: Dropped requirement caught before TDD

**User says:** "revisar alinhamento do spec 003 contra os requisitos"

**Agent should:** read `requirements/003-*/requirements.md` (REQ-01..05) and `changes/003-*/spec.md`
→ find REQ-04 (audit log) addressed nowhere → write `alignment-review.md` with REQ-04 `Missing` and
**Verdict:** misaligned → tell the user to add the audit-log design before `run-tdd`. Do not proceed.

### Example 2: Clean pass gating the archive

**User says:** "check spec alignment for 001-search before archiving"

**Agent should:** verify every REQ is `Covered` with cited evidence → **Verdict:** aligned → run
`check-consistency` (green) → confirm the spec is clear to archive.

## References

- `scripts/check-consistency.mjs` — deterministic gate that enforces this review on archive
- `.specs/templates/feature-spec.md` — `## Requirements Traceability` section under review
- `.claude/skills/gather-requirements/SKILL.md` — produces the requirements doc this checks against
- `.claude/skills/run-change/SKILL.md` — invokes this at the requirements→spec transition
- `.claude/skills/run-tdd/SKILL.md` — runs only after an `aligned` verdict
- `METHODOLOGY.md` — the two-tier (deterministic + semantic) consistency model
