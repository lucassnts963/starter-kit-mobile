---
name: gather-requirements
description: >-
  Guide requirements elicitation from a raw idea to a structured requirements document. Use when the
  user says "gather requirements", "levantar requisitos", "elicit requirements" or "elicitar
  requisitos", or before writing a spec for a non-trivial feature. Supports User Stories, Use Cases,
  Job Stories and BDD, and writes to .specs/requirements/<nnn>-<slug>/. For trivial changes (typo,
  refactor, dependency bump, simple bugfix) skip this and use the run-change fast-path instead.
metadata:
  version: 1.1.0
---

# Requirements Gathering

## Purpose

Guide the requirements elicitation process — from a raw idea or problem statement to a structured
requirements document. Supports multiple methodologies (User Stories, Use Cases, Job Stories, BDD)
and lets the engineer choose the best fit.

## Prerequisites

- `METHODOLOGY.md` — full methodology reference
- `.specs/templates/requirements-spec.md` — the requirements template
- `AGENTS.md` — project context and conventions

## Instructions

### Step 1: Determine Starting Point

Ask the user whether they have a concrete problem ("I have a problem to solve" → Step 2A) or are
exploring/brainstorming ("I'm exploring" → Step 2B).

### Step 2A: Elicitation from a Problem

Ask sequentially:
1. **"Describe the problem or need in 2-3 sentences."** → `## 1. Problem Statement` (verbatim).
2. **"What happens if we do nothing? What is the cost of inaction?"** → `### Why This Matters`.
3. **"How would you measure success? What metrics should change?"** → `### Success Definition`.
4. **"Who is affected by this problem or its solution?"** → `## 2. Stakeholder Map` (name, role,
   interest, influence, key concern).

### Step 2B: Exploration / Brainstorming

1. "What domain or area are we working in?"
2. "Who are the potential users? What do they do today?"
3. "What frustrates them about the current process?"
4. "What competitors or alternatives exist? What do they do well / poorly?"
5. "If you could wave a magic wand, what would the ideal solution do?"
6. Synthesize a problem statement, present it back for confirmation, then fill
   `## 1. Problem Statement`.

### Step 3: Choose Methodology

Present and let the engineer choose: User Stories, Use Cases, Job Stories, BDD/Gherkin, or Hybrid.
Mark the choice in `## 3. Methodology` and guide the matching section (4.1–4.4).

### Step 4: Elicit Functional Requirements

- **User Stories:** per role, what they need + acceptance criteria → `### 4.1`.
- **Use Cases:** actor, pre-condition, main flow, alternatives, exceptions → `### 4.2`.
- **Job Stories:** situation, motivation, expected outcome → `### 4.3`.
- **BDD:** feature + Given/When/Then scenarios + edge cases → `### 4.4`.

### Step 5: Functional Requirements Table

Extract formal `REQ-XX` items, link each to its source (US-01, UC-01, …), mark preliminary priority.
→ `## 5. Functional Requirements`.

### Step 6: Non-Functional Requirements

Ask about Performance, Security, Accessibility, Usability, Compliance → `## 6.`.

### Step 7: Constraints, Assumptions, Scope

Constraints → `## 7.`; Assumptions → `## 8.`; Out of Scope → `## 9.`.

### Step 8: MoSCoW Prioritization

Classify each REQ as Must / Should / Could / Won't → `## 10.`.

### Step 9: Dependencies, Glossary, Risks

Dependencies → `## 11.`; Domain Glossary → `## 12.`; Risks & Mitigations → `## 13.`.

### Step 10: Traceability Matrix

Link REQ-XX → source → priority → (spec TBD) → (test TBD) in `## 14.`. The last two columns stay
empty until the spec and tests are created.

### Step 11: Assign ID and Save

1. Determine the next sequential number from `.specs/requirements/`.
2. Ask for a short kebab-case slug.
3. Create `.specs/requirements/<nnn>-<slug>/requirements.md`.
4. Flag any open questions in `## 15. Appendix`.

### Step 12: Next Steps

Report the file path, a summary (stakeholders, methodology, REQ counts by priority, dependencies,
risks), and the next step: create `.specs/changes/<nnn>-<slug>/spec.md` with the same `<nnn>`, then
run the `review-alignment` skill to verify the spec covers every `REQ-NN` before `run-tdd`. Each
`REQ-NN` defined here is a contract the spec must trace back to and honor.

## Output

After completing the process, report:
1. Requirements document path
2. Summary of key decisions and chosen methodology
3. Count by priority (Must/Should/Could/Won't)
4. Next step: transitioning to spec

## Examples

### Example 1: User Stories

**User says:** "levantar requisitos para um sistema de login"

**Agent should:** elicit problem → stakeholders → choose User Stories → write stories + acceptance
criteria → extract REQ-01/02 → MoSCoW → save to `.specs/requirements/001-login/requirements.md` →
report.

### Example 2: Use Cases + BDD (Hybrid)

**User says:** "gather requirements for payment processing"

**Agent should:** elicit problem → stakeholders → choose Hybrid → UC-01 with flows + BDD scenarios
(happy path, declined card, timeout) → extract REQs/NFRs (PCI, response < 2s) → save and report.

## References

- `METHODOLOGY.md` — Requirements Engineering section
- `.specs/templates/requirements-spec.md` — template to fill
- `.claude/skills/review-alignment/SKILL.md` — verifies the resulting spec honors these requirements
- `AGENTS.md` — project conventions and context
- `.specs/memory/glossary.md` — domain terms
