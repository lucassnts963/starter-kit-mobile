---
name: create-project
description: >-
  One-shot bootstrap of a brand-new project from the starter-kit: clone from GitHub, clean git
  history, then run the full init-project flow. Use when the user says "create new project",
  "criar novo projeto", "start from scratch" or "começar do zero". Delegates stack configuration
  to the init-project skill — it does NOT duplicate those steps.
metadata:
  version: 1.1.0
---

# Create Project from Starter-Kit

## Purpose

One-shot skill that bootstraps a completely new project from the starter-kit. Clones the repository
from GitHub, cleans the git history, and runs the interactive `init-project` flow to configure the
technology stack and methodology. The developer gets a ready-to-use project directory with AGENTS.md
filled, conventions set, ADR-003 recorded, and the first specs in place.

## Prerequisites

- `git` installed and available in PATH
- Network access to the starter-kit repository (URL in `.specs/config.md## Repository`)
- The `init-project` skill (this skill delegates to it)

## Instructions

### Step 1: Detect Context

Check whether we are already inside a starter-kit directory:
- Read `AGENTS.md` (if it exists).
- If `AGENTS.md` contains unfilled `{PLACEHOLDERS}` (e.g., `{PROJECT_NAME}`), we are inside an
  uninitialized starter-kit → **skip to Step 4** (run init-project in place).
- If `AGENTS.md` does not exist or has already been filled, we need a fresh copy → **Step 2**.

### Step 2: Gather Project Info

Ask the user:
1. **Project name** — kebab-case recommended (e.g., `my-app`, `api-gateway`).
2. **Target directory** — absolute path. Default: `<cwd>/<project-name>`.

Confirm the directory. If it exists and is non-empty, warn and ask for confirmation before
overwriting.

### Step 3: Clone & Clean

Use the repository URL from `.specs/config.md## Repository`. Run the commands for the user's
platform — pick ONE block:

**POSIX (bash/zsh):**
```bash
git clone <REPO_URL> "<target-directory>"
rm -rf "<target-directory>/.git"
git -C "<target-directory>" init
```

**Windows (PowerShell):**
```powershell
git clone <REPO_URL> "<target-directory>"
Remove-Item -Recurse -Force "<target-directory>/.git"
git -C "<target-directory>" init
```

If the clone fails (no network, repo moved), report the error and stop. All subsequent work happens
inside `<target-directory>`.

### Step 4: Run init-project (delegate)

Change the working context to `<target-directory>` and **execute the `init-project` skill in full**,
with one override: skip the project-name question (reuse the name from Step 2).

Do not re-list init-project's individual steps here — it owns stack configuration, AGENTS.md,
conventions, ADR-003, and the bootstrap requirements + spec. This delegation keeps the two skills
from drifting apart.

### Step 5: Final Report

Summarize what was done: cloned, cleaned `.git`, ran init-project, files created, target location,
and next steps (fill remaining placeholders, scaffold source code, review/approve REQ-001 and
CHG-001, start first feature with `gather-requirements`).

## Output

A complete, initialized project directory ready for development, containing:
- `AGENTS.md` — filled with the chosen technology stack
- `.specs/memory/conventions.md` — narrowed to the chosen stack
- `.specs/memory/architecture.md` — with ADR-003 appended
- `.specs/requirements/001-init/requirements.md` and `.specs/changes/001-init/spec.md`
- A clean `CHANGELOG.md` (the project's own, reset from the template — not the kit's history),
  and `package.json`/`README.md` reset to the project's identity (handled by init-project Step 6)
- Clean git history (fresh `git init`)

## Examples

### Example 1: React + Node project

**User says:** "criar novo projeto"

**Agent should:**
1. Detect we are NOT in a starter-kit → proceed to clone.
2. Ask project name → "my-web-app"; ask/confirm target directory.
3. Clone (URL from config.md) → clean `.git` → `git init`.
4. Run init-project in full (WEB, REACT, NODE, POSTGRES, en, VITEST, 80, pnpm).
5. Report summary with full path.

### Example 2: Already inside a starter-kit directory

**User says:** "create new project"

**Agent should:**
1. Read AGENTS.md → detects `{PROJECT_NAME}` placeholder → uninitialized starter-kit.
2. Skip clone/clean.
3. Run init-project normally (all 9 questions).
4. Report summary.

## References

- `.specs/config.md` — repository URL and stack options (do not hardcode them)
- `.claude/skills/init-project/SKILL.md` — the skill this wraps
- `AGENTS.md` — template to fill
- `METHODOLOGY.md` — full methodology guide
