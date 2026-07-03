# Methodology — Operational Rules for Agents

> **Kit-owned file.** These are the spec-driven + TDD methodology rules, identical across every project
> that uses the kit. `AGENTS.md` imports this file; a methodology **upgrade replaces it wholesale**, so
> nothing project-specific may live here — keep stack, commands, architecture, and conventions in
> `AGENTS.md`. Full reference guide: `METHODOLOGY.md`.

## Key Rules

1. **All changes go through `.specs/`** — write the spec first, implement second.
2. **TDD is mandatory** — Red → Green → Refactor. Tests are written **before** implementation; never
   write code first.
3. **Every bugfix requires a regression test** that reproduces the bug and passes after the fix.
4. **Keep `AGENTS.md` updated** as the project evolves — it is the project-owned instruction source
   (this methodology file is kit-owned; don't edit it in a project).
5. **Maintain consistency** — run `node scripts/check-consistency.mjs` (or `"verificar consistência"`)
   before committing skill/config changes; never hardcode config values (reference `.specs/config.md`).
   **After adding or editing a skill, run `node scripts/update-skills-index.mjs`** — CI runs both
   `check-consistency` and `update-skills-index --check`, so a stale index fails the build.
6. **Feed the memory** — at session start run `resume-session` (`"onde paramos"`); search
   `memory/troubleshooting.md` before debugging; after a non-trivial fix record a `TRB-` entry; at the
   end of a work session append a block to `memory/log.md`; **record a methodology upgrade there too**
   (`from → to`, date, what changed). Memory that isn't written is re-derived.
7. **Two-tier consistency** — `check-consistency.mjs` validates *structure* (links, ids, schema)
   deterministically; the `review-alignment` skill validates *semantics* (does the spec cover its
   requirements?). A requirements-backed spec cannot be archived until its `alignment-review.md` is
   complete and `aligned`. The **forward-only baseline** (`.specs/baseline.json`) grandfathers specs
   archived before these rules existed — it is a **one-time snapshot taken at upgrade and never grows**;
   every spec archived afterward must comply (no grandfathering past the baseline).

## Memory as an LLM-Wiki

`.specs/memory/` is a persistent, compounding knowledge base the agent maintains (inspired by
[Karpathy's LLM-Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)): curated
pages (ADRs, conventions, catalog), an append-only journal (`log.md`), and a topical error memory
(`troubleshooting.md`). Compile durable knowledge; don't re-derive it.

- **Reusable code:** catalog in `memory/component-catalog.md` — check before creating, add after.
- **Troubleshooting:** record the lesson via the `record-troubleshooting` skill after a non-trivial debug.
- **Working log:** append Did / Learned / Next to `memory/log.md` at the end of a session and on a
  methodology upgrade — it is the resume (`resume-session`) source and the per-project upgrade record.
- **Changelog:** generated from `.specs/archive/` via `update-changelog`, validated by `check-consistency`.

## Skills

Skills live in `.claude/skills/<name>/SKILL.md` (auto-discovered by both opencode and Claude Code). The
full catalog — every skill with its purpose — is **generated** at `.claude/skills/INDEX.md`
(`node scripts/update-skills-index.mjs`) and enforced by `check-consistency`. Read the index for the
current list. Skill format rules: `.specs/config.md## Skill Format`.

## Choosing the Change Path

Match ceremony to the size of the change (the `run-change` skill automates this):

- **Lightweight** — typo/docs/formatting (edit directly, no spec), or refactor / dependency bump /
  trivial bugfix (micro-spec: Context + Tests + Checklist, then `run-tdd`).
- **Full** — new user-facing behavior, multi-stakeholder, or unclear scope → `gather-requirements` →
  full spec → `review-alignment` (semantic gate) → `run-tdd`. Schema/data changes use `migration-spec.md`.
