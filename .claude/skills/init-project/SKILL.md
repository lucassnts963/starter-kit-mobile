---
name: init-project
description: >-
  Bootstrap an already-cloned starter-kit into a configured project. Use when the user says
  "start project", "iniciar projeto", "bootstrap project" or "inicializar projeto". Asks the
  9 stack questions, fills AGENTS.md, narrows conventions.md, records ADR-003 (technology stack),
  and creates the bootstrap requirements + spec. Do NOT use to clone a fresh copy from GitHub —
  that is create-project.
metadata:
  version: 1.1.0
---

# Bootstrap New Project

## Purpose

Guide users through the initial setup of a new project following the spec-driven + TDD methodology.
Asks all necessary decisions, fills in `AGENTS.md`, `conventions.md`, records the stack ADR, creates
the first requirements + spec, and leaves the project ready for development.

## Prerequisites

- The starter-kit must already be copied to the project root
- Read `AGENTS.md`, `METHODOLOGY.md`, `.specs/memory/conventions.md`, `.specs/memory/architecture.md`
- `.specs/config.md` — source of truth for the supported stack options (do not hardcode them here)

## Instructions

### Step 1: Gather Project Metadata

Ask the user sequentially (one question at a time), using sensible defaults where applicable. The
canonical option lists live in `.specs/config.md## Supported Technologies` — read them from there.

| # | Question | Field |
|---|---|---|
| 1 | What is the project name? | `{PROJECT_NAME}` (PascalCase or kebab-case) |
| 2 | What is the shell/platform? | Shell/Platform |
| 3 | What is the frontend framework? | Frontend |
| 4 | What is the backend language/framework? | Backend |
| 5 | What database will you use? | Database |
| 6 | What is the project/team language? | Language |
| 7 | What testing framework? | Test Framework |
| 8 | What coverage threshold (%)? | Coverage (default: `.specs/config.md## Defaults`) |
| 9 | What package manager? | Package Manager |

### Step 2: Fill in AGENTS.md

Read `AGENTS.md` and replace placeholders with the user's answers:

| Placeholder | User's Answer |
|---|---|
| `{PROJECT_NAME}` | Project name |
| `{TAURI or ...}` | Keep only the chosen shell |
| `{REACT or ...}` | Keep only the chosen frontend |
| `{RUST or ...}` | Keep only the chosen backend |
| `{SQLITE or ...}` | Keep only the chosen database |
| `{LANGUAGE}` | User's choice |
| `{TEST_FRAMEWORK}` | User's choice |
| `{COVERAGE_THRESHOLD}` | User's choice |
| `{DEV_COMMAND}` | Ask or set as `<package-manager> run dev` |
| `{BUILD_COMMAND}` | Ask or set as `<package-manager> run build` |
| `{TEST_COMMAND}` | Ask or set as `<package-manager> run test` |
| `{LINT_COMMAND}` | Ask or set as `<package-manager> run lint` |
| `{HANDLER_PATTERN}` | Based on backend (commands, controllers, routes, handlers) |
| `{STYLING_APPROACH}`, `{UI_LIBRARY}`, `{STATE_MANAGEMENT}`, `{FORM_PATTERN}`, `{ROUTING_STRATEGY}`, `{AUTH_MECHANISM}`, `{NAMING_CONVENTION}`, `{ID_STRATEGY}` | Ask or leave as placeholder |

**IMPORTANT:** Only replace placeholders the user explicitly answered. Leave others as
`{PLACEHOLDER}` for later. `AGENTS.md` holds only project content now; its `## Methodology` section
just imports the kit-owned `.specs/methodology.md` (Key Rules, change path, skills) — leave that
import as-is, there is nothing to fill there.

### Step 3: Update conventions.md

Edit `.specs/memory/conventions.md` to narrow the placeholder options to the chosen stack:
- If frontend is `REACT`, keep React state options; remove Vue/Svelte ones.
- If backend is `RUST`, keep Rust ORM / connection-pool options.
- If database is `POSTGRES`, keep only PostgreSQL.
- If no UI framework: set Component Test Lib to `NONE`, E2E to `NONE`.

### Step 4: Record ADR-003 (Technology Stack)

`architecture.md` already ships with `ADR-001: Spec-Driven Development` and `ADR-002: Test-Driven
Development`. Append the stack decision as **ADR-003** (do not overwrite the existing ADRs):

```markdown
## ADR-003: Technology Stack

- **Date:** <today>
- **Status:** Accepted

**Context:** A new project needed a technology stack decision.

**Decision:**
- Shell: {choice}
- Frontend: {choice}
- Backend: {choice}
- Database: {choice}
- Package Manager: {choice}
- Testing: {choice} (coverage: {choice}%)

**Consequences:**
- Tooling and conventions will follow this stack
- All ADRs and specs must align with these choices
```

### Step 5: Create Bootstrap Requirements and Spec

Create `.specs/requirements/001-init/requirements.md` with:
- Problem: new project initialization
- Methodology: User Stories (for the setup itself)
- Stakeholder: development team
- Functional Requirements: project structure, conventions, ADR-003

Create `.specs/changes/001-init/spec.md` using the `feature-spec.md` template with:
- **ID:** CHG-001
- **Status:** draft
- **Context:** Initial project setup with bootstrap configuration
- **Scope:** Project scaffolding, AGENTS.md configuration, ADR-003, conventions setup
- **Requirements:** REQ-01: Project structure created with chosen tech stack
- **Design:** N/A (no UI)
- **Tests:** N/A (setup-only change)
- **Requirements Traceability:** Linked to requirements/001-init/
- **Validation Checklist:** AGENTS.md filled, conventions set, ADR-003 written

> Note: because CHG-001 is now a real spec in `changes/`, the `CHANGELOG.md` entry for it is only
> created later, by `update-changelog`, after the spec is archived. Do not pre-seed the changelog.

### Step 6: Reset Project-Identity Files

A project bootstrapped from the kit must not inherit the **kit's own** identity files. Reset them so
they represent the new project:

1. **`CHANGELOG.md`** — overwrite the kit's changelog with the clean template:
   copy `.specs/templates/changelog-template.md` to `CHANGELOG.md` (root). The project's history
   starts empty; `update-changelog` fills it as specs are archived. Do **not** carry over the kit's
   `[0.1.0] Initial release` or `[Unreleased]` entries.
2. **`package.json`** (if the project is Node) — set `name` to the project name and `version` to
   `0.1.0`; keep the `check`/`changelog` scripts. If the project is not Node, leave it as the user's
   own concern.
3. **`README.md`** — the kit's README documents the kit. Replace it with a minimal project README
   (title + one-line description), or ask the user before overwriting. `METHODOLOGY.md` and `LICENSE`
   may stay as reference.

> The methodology *structure* version stays in `.specs/config.md## Methodology Version` — that one is
> intentionally carried over, because it records which methodology the project was set up with.

### Step 7: Report Summary

Display a summary table of all decisions and the files created/modified (see Output).

## Output

After completing the bootstrap, report:
1. Project name and technology stack decisions (table)
2. Files created/modified: `AGENTS.md`, `conventions.md`, `architecture.md` (ADR-003), bootstrap
   requirements + spec
3. Project-identity files reset: `CHANGELOG.md` (clean), `package.json` name/version (if Node),
   `README.md`
4. Count of remaining `{PLACEHOLDERS}` to fill
5. Next steps: scaffold source code, review specs, start first feature with `gather-requirements`

## Examples

### Example 1: Web + React + Node

**User says:** "start project"

**Agent should:**
1. Ask the 9 questions → WEB, REACT, NODE, POSTGRES, en, VITEST, 80, pnpm
2. Fill AGENTS.md with React, Node, PostgreSQL, Vitest
3. Narrow conventions.md to React+Node+PostgreSQL options
4. Append ADR-003 with the full stack
5. Create requirements/001-init/requirements.md and changes/001-init/spec.md
6. Report summary

### Example 2: CLI + Python

**User says:** "iniciar projeto"

**Agent should:**
1. Ask the 9 questions → CLI, NONE, PYTHON, SQLITE, pt-BR, PYTEST, 90, pip
2. Fill AGENTS.md with CLI, Python, SQLite, Pytest
3. Remove frontend sections from conventions.md (no UI)
4. Append ADR-003 with the full stack
5. Create bootstrap requirements + spec
6. Report summary

## References

- `.specs/config.md` — supported stack options, defaults (do not hardcode these)
- `AGENTS.md` — template to fill
- `METHODOLOGY.md` — full methodology guide
- `.specs/memory/conventions.md` — coding conventions to narrow
- `.specs/memory/architecture.md` — ADR log (append ADR-003)
- `.specs/templates/feature-spec.md` — spec template for 001-init
- `.specs/templates/changelog-template.md` — clean changelog the project's `CHANGELOG.md` is reset from
