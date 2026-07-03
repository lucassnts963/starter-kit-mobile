---
name: adopt-project
description: >-
  Overlay the spec-driven + TDD methodology onto an EXISTING project that already has code. Use when
  the user says "adopt methodology", "adotar metodologia", "add methodology" or "adicionar
  metodologia" inside a repo that already has a stack and source. Detects the stack (no blind
  questions), brings the methodology files in without overwriting anything, auto-drafts the memory
  docs from the real codebase, and sets a forward-only TDD coverage baseline. Do NOT use on an empty
  project (that is init-project) or to clone a fresh one (create-project).
metadata:
  version: 1.0.0
---

# Adopt Methodology into an Existing Project

## Purpose

Add the spec-driven + TDD methodology to a repository that **already has a stack, code, and possibly
its own `AGENTS.md`, CI, and `package.json`**. Unlike `init-project` (greenfield), this skill
**detects** rather than asks, **overlays without clobbering**, and **populates the memory docs from
the actual codebase**. Legacy code is treated with a forward-only TDD baseline — no retroactive
test retrofit is demanded.

## Prerequisites

- You are at the root of an existing **git** repository that already contains source code.
- `git` and **Node.js** in PATH (the kit's `scripts/*.mjs` tooling requires Node, even if the target
  project is not a Node project).
- The starter-kit repository URL — recorded in the kit's `.specs/config.md## Repository`
  (reference it; do not hardcode the literal here).

## Instructions

### Step 1: Preflight & Collision Report

1. Confirm this is an existing repo **with code** (e.g., a manifest + a `src/`/equivalent), not an
   empty dir and not a starter-kit (no unfilled `{PROJECT_NAME}` in an existing `AGENTS.md`). If it
   looks greenfield, suggest `init-project` instead and stop. If the repo **already uses the
   methodology** (`.specs/config.md` exists, with or without a `## Methodology Version`), this is not
   a first-time adoption — suggest the `upgrade-methodology` skill instead and stop.
2. Recommend working on a branch: `git checkout -b chore/adopt-methodology`.
3. Build a **collision report** — check whether each of these already exists in the target:
   `.claude/skills/`, `.specs/`, `scripts/`, `.github/workflows/`, `AGENTS.md`, `CLAUDE.md`,
   `package.json`, `CHANGELOG.md`.
4. **Golden rule: never overwrite a project file.** For any collision, either merge (Steps 4/7) or
   place the incoming file alongside with a `.kit` suffix for the user to reconcile, and ask before
   proceeding.

### Step 2: Bring in the Methodology Files (non-destructive)

Clone the starter-kit (URL from `.specs/config.md## Repository`) into a **temporary directory**, then
copy **only paths that do not already exist** in the target:

- `.claude/skills/` (all skills, including this one)
- `.specs/templates/`, `.specs/memory/` (scaffolds), `.specs/shared/`, `.specs/config.md`,
  `.specs/changes/.gitkeep`, `.specs/archive/.gitkeep`, `.specs/requirements/.gitkeep`
- `scripts/` (`check-consistency.mjs`, `update-changelog.mjs`, `update-skills-index.mjs`,
  `session-context.mjs`)
- `.github/workflows/consistency.yml`
- `.claude/settings.json` — only if the project has none. If the project already has one, **merge**
  the `SessionStart` hook into it (don't overwrite its existing hooks/config). The hook runs
  `node scripts/session-context.mjs`; opencode ignores this file.

Do **not** copy the kit's `README.md`, `METHODOLOGY.md`, `CHANGELOG.md`, or `LICENSE` over the
project's own. The kit's `CHANGELOG.md` is the *kit's* history — never overlay it. If the project has
**no** `CHANGELOG.md`, create a clean one from `.specs/templates/changelog-template.md` so the
`update-changelog` tooling has its `## [Unreleased]` section to write into. Remove the temp clone
when done.

### Step 3: Detect the Stack (don't ask blindly)

Infer from manifests instead of asking the 9 questions:

| Signal | Detect |
|---|---|
| `package.json` deps | Frontend (react/vue/svelte/angular/solid/htmx), backend (node), test runner (vitest/jest) |
| Lockfile | Package manager (`package-lock`→npm, `pnpm-lock`→pnpm, `yarn.lock`→yarn, `bun.lockb`→bun) |
| `Cargo.toml` | Backend RUST, cargo, cargo test |
| `pyproject.toml` / `requirements.txt` | Backend PYTHON, pip, pytest |
| `go.mod` | Backend GO, go mod, go test |
| `pom.xml` / `build.gradle` | Backend JAVA, JUnit |
| `*.csproj` | Backend CSHARP, xUnit |
| `mix.exs` | Backend ELIXIR |
| deps / `migrations/` / `docker-compose.yml` | Database (postgres/mysql/sqlite/mongodb/surrealdb) |
| `src-tauri/`, electron/wails config, else web/cli/lib layout | Shell/Platform |

Use `.specs/config.md## Supported Technologies` for the canonical option names. **Present the
detected stack and ask the user to confirm or correct it** before writing anything. Then reuse the
placeholder→value mapping from `init-project` (its Step 2 table) to fill `AGENTS.md`.

### Step 4: Generate AGENTS.md (merge-aware)

- **If `AGENTS.md` already exists:** preserve the project's content. **Append** the methodology
  sections in clearly marked blocks — the stack table (from Step 3), the **Skills** index, the
  **Choosing the Change Path** rule, **Key Rules**, and **Testing** — and ask for confirmation before
  merging. Never delete the project's existing guidance.
- **If it does not exist:** create it from the kit template, filled with the detected stack.
- **`CLAUDE.md`:** if it exists, ensure it imports `@AGENTS.md`; otherwise create the minimal
  importer.

### Step 5: Auto-draft the Memory Docs from the Codebase

Scan the repo and write **drafts**, each opening with a `> REVIEW: inferred from code — confirm.`
marker so nothing is treated as truth until the user approves:

- **`conventions.md`** — styling approach, component pattern, state management, naming, folder
  structure, backend layering, and test framework/location, inferred from `src/`.
- **`component-catalog.md`** — enumerate the components, hooks, utils, services, repositories,
  adapters, and types that **already exist**, filling the catalog tables (file path + purpose). This
  is the highest-value output: it makes existing code reusable instead of duplicated.
- **`architecture.md`** — keep `ADR-001` (Spec-Driven) and `ADR-002` (TDD); add **`ADR-003`** with
  the detected stack. Optionally reconstruct notable existing decisions as additional ADRs with
  status `Proposed` (drafts) from README/structure.
- **`schema-current.md`** — if a database exists, draft it from migrations/ORM models; otherwise mark
  `NONE`.
- **`glossary.md`** — optional: domain terms pulled from types/README.

### Step 6: Forward-only TDD Baseline

1. Run the project's existing test + coverage command if one exists; **record the current coverage as
   the baseline** in `conventions.md` (Testing section) and as the CI policy: *coverage must not
   regress*. Do **not** demand a retrofit of legacy tests.
2. Document that TDD and the clean-code thresholds (functions ≤20 lines, ≤3 params, …) apply to
   **new or changed code**, not retroactively.
3. If no tests exist: baseline = none; note that TDD applies going forward and add a test-command
   placeholder.

### Step 7: Wire the Tooling without Clobbering

- **`package.json`:** if it exists, **only add** the `check` and `changelog` scripts if absent.
  **Do NOT** add `"type": "module"` to a project that doesn't have it — the kit scripts are `.mjs`
  and run as ESM regardless, so leaving the field untouched preserves the project's module system.
  If there is no `package.json` and the project is not Node, leave none — the scripts still run via
  `node scripts/...`.
- **CI:** if the project already has workflows, add `consistency.yml` as a **separate** workflow
  (don't touch existing ones).

### Step 8: Validate & Report

Run `node scripts/check-consistency.mjs` (expect exit 0). Then report: collisions found and how each
was handled, files added, the detected/confirmed stack, the memory drafts created (flagged
`REVIEW`), the coverage baseline, and next steps (review the memory drafts; use `run-change` for the
first real change).

## Output

A report covering:
1. Collision report and resolution (what was merged, what was placed as `.kit` for review).
2. Detected and confirmed technology stack.
3. Files added (skills, templates, scripts, CI) and `AGENTS.md`/`CLAUDE.md` changes.
4. Memory drafts created, each marked `REVIEW`.
5. Coverage baseline (or "no tests yet").
6. Confirmation that no existing project file was overwritten, plus next steps.

## Examples

### Example 1: Existing React + Node app with its own AGENTS.md

**User says:** "adotar metodologia"

**Agent should:**
1. Detect a non-empty repo with `package.json` and an existing `AGENTS.md` → not greenfield.
2. Suggest `chore/adopt-methodology` branch; build the collision report (`AGENTS.md`, `package.json`
   exist; `.specs/`, `.claude/skills/` do not).
3. Clone the kit to a temp dir; copy in `.claude/skills/`, `.specs/`, `scripts/`, CI — skipping
   nothing that collides.
4. Detect stack from deps: REACT + NODE + Vitest + pnpm (lockfile) + Postgres (pg dep). Confirm.
5. Append methodology sections to the existing `AGENTS.md` (preserving its content); ensure
   `CLAUDE.md` imports `@AGENTS.md`.
6. Draft `component-catalog.md` from `src/components`, `src/hooks`, `src/services`; draft
   `conventions.md`; add `ADR-003`; draft `schema-current.md` from `migrations/`.
7. Run `vitest --coverage` → baseline 41%; record as forward-only floor.
8. Add `check`/`changelog` scripts to `package.json` (no `type:module`); add `consistency.yml`.
9. `node scripts/check-consistency.mjs` → exit 0. Report everything, nothing overwritten.

### Example 2: Existing Python CLI, no AGENTS.md, no tests

**User says:** "add methodology"

**Agent should:**
1. Detect `pyproject.toml`, `src/`, no `AGENTS.md`, no tests.
2. Copy in the methodology files (no collisions).
3. Detect CLI + PYTHON + pytest + pip; DB = SQLite (from a `*.db`/sqlite dep) or NONE. Confirm.
4. Create `AGENTS.md` from template filled with the stack; create `CLAUDE.md`.
5. Draft memory docs from the package modules; `schema-current.md` = SQLite tables or NONE.
6. No tests → baseline = none; document TDD applies going forward; add a test-command placeholder.
7. Validate and report.

## References

- `.specs/config.md` — repository URL, supported stack options, methodology version, Skill Format
- `.claude/skills/init-project/SKILL.md` — placeholder→value mapping reused in Step 3
- `.claude/skills/upgrade-methodology/SKILL.md` — for repos that already adopted the methodology
- `.claude/skills/run-change/SKILL.md` — first real change after adoption
- `.specs/memory/conventions.md`, `.specs/memory/component-catalog.md`, `.specs/memory/architecture.md` — scaffolds to draft into
- `AGENTS.md` — template/host for the methodology sections
- `METHODOLOGY.md` — "Adopting into an existing project"
