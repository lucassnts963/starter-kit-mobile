---
name: upgrade-methodology
description: >-
  Bring a project that ALREADY uses this methodology up to the starter-kit's latest version, applying
  only the delta non-destructively. Use when the user says "upgrade methodology", "atualizar
  metodologia", "sync methodology", "sincronizar metodologia", "migrar metodologia" or "update
  methodology" inside a repo that already has .specs/ and .claude/skills/. Version-aware: compares the
  project's methodology version to the kit's and adds only what is missing or outdated. Do NOT use to
  adopt the methodology for the first time (that is adopt-project) or to bootstrap a new project
  (create-project / init-project).
metadata:
  version: 1.0.0
---

# Upgrade Methodology to the Latest Version

## Purpose

Bring a project that already uses the methodology up to the starter-kit's latest version, applying
**only the delta** — non-destructively, never re-running setup and never clobbering project content.
A project set up months ago is frozen at the version it was bootstrapped with; when the kit adds
skills, templates, checker rules, or memory pages, those projects don't get them automatically. This
skill closes that gap by comparing the project's methodology version against the kit's latest. It is
`adopt-project` narrowed to "what changed since you last synced".

## Prerequisites

- You are at the root of a repo that **already uses the methodology** (`.specs/config.md` and
  `.claude/skills/` exist). If they don't, this is the wrong skill — use `adopt-project` (existing
  code) or `init-project` (new project).
- `git` and **Node.js** in PATH.
- The starter-kit URL — from `.specs/config.md## Repository` (reference it; do not hardcode).
- The kit's `METHODOLOGY.md## Methodology Versions` table — the per-version changelog this skill
  explains the delta from.

## Instructions

### Step 1: Read the Installed Version

Read `.specs/config.md## Methodology Version` in the **target project**. If the section is absent,
treat the installed version as `1.0.0` (the project predates versioning). Record it as `FROM`.

### Step 2: Fetch the Latest and Compare

Clone the starter-kit (URL from `.specs/config.md## Repository`) into a **temporary directory**. Read
its `config.md## Methodology Version` as `TO`.

- If `FROM` ≥ `TO`: report "already current at `FROM`" and stop — nothing to do.
- Otherwise, read `METHODOLOGY.md## Methodology Versions` from the temp clone and summarize every
  version **between** `FROM` and `TO` so the user sees exactly what will be applied before any change.

### Step 3: Recommend a Branch

Suggest working on a dedicated branch: `git checkout -b chore/upgrade-methodology-<TO>`. Get
confirmation before writing anything.

### Step 4: Categorize and Apply the Delta (non-destructive)

Compare the temp clone to the project and act per category. **Golden rule: never overwrite a
project-owned file** — on any conflict, write the incoming file alongside with a `.kit` suffix and ask.

| Category | Examples | Action |
|---|---|---|
| **Purely additive files** | new skills (`review-alignment/`, `record-troubleshooting/`, this skill), new memory pages (`troubleshooting.md`, `log.md`), new templates | Copy in **only if absent**. |
| **Kit-owned tooling** | `scripts/check-consistency.mjs`, `scripts/update-changelog.mjs`, the kit's own skills | If the project's copy is unmodified from the previous kit version, **refresh** it to get new rules. If the project diverged, place the new one as `*.kit` and ask. |
| **Kit-owned templates** | `.specs/templates/*.md` | Same as tooling — refresh if unmodified, else `.kit` + ask. A changed template (e.g., `feature-spec.md` gaining the traceability link) matters for the new checker rules. |
| **Project-owned docs** | `AGENTS.md`, `README.md`, `METHODOLOGY.md` | **Append** new methodology sections/Key Rules in clearly marked blocks; never delete project content. Confirm before merging. (The skills list is **not** maintained here — see Step 4d.) |
| **Project history** | `CHANGELOG.md` | **Never touch.** It is the project's own changelog, not the kit's — do not overlay or reset it. (Refresh only the kit's `changelog-template.md` under `.specs/templates/`.) |
| **Harness config** | `.claude/settings.json` | If absent, copy it. If present, **merge** the new `SessionStart` hook into the project's existing hooks — never overwrite its config. |
| **`config.md`** | the project's own | Do **not** overwrite (it holds project-specific Defaults). Only **add missing sections** and bump the version (Step 6). |

Pull the list of "what's new per version" from the Methodology Versions table so nothing in the
`FROM`→`TO` range is skipped.

**Step 4d — regenerate the skills index.** After copying the new skills, run
`node scripts/update-skills-index.mjs` to rebuild `.claude/skills/INDEX.md`. Because the index is
generated from the skill folders, this picks up the new skills **and** preserves any the project
added on its own — no manual table-merge into `AGENTS.md`, which only references the index. This is
the step that removes the one judgment-dependent part of the upgrade.

**Step 4e — forward-only baseline (when crossing into 1.1.0).** The 1.1.0 traceability and
alignment-gate checks would otherwise fire **retroactively** on specs archived before those rules
existed, breaking CI on a mature repo. When upgrading from a version `< 1.1.0`, write
`.specs/baseline.json` snapshotting the **current** `.specs/archive/*` dirs:
`{ "methodologyBaseline": "<to>", "grandfatheredArchive": ["<dir>", …] }`. `check-consistency` exempts
those legacy specs; specs archived from now on must comply. Never overwrite an existing baseline. (The
`spec-kit upgrade` CLI does this automatically; only do it by hand if upgrading without the CLI.)

### Step 5: Stamp the New Version

Update `.specs/config.md## Methodology Version` to `TO` (add the section if it was absent). This is
what makes the *next* upgrade start from the correct baseline — and lets the reconcile phase read the
version it is reconciling to.

### Step 6: Reconcile (judgment phase → `reconcile-upgrade`)

The copy/refresh above is mechanical. The judgment phase — merging new sections into `AGENTS.md`,
reconciling any overwritten tooling, and **adapting the project's existing files to conventions the
new version introduced** (e.g. giving a `troubleshooting.md` `TRB-NN` ids, adding traceability links) —
is driven by the **`reconcile-upgrade`** skill. Run it now (it is the same phase a user gets after the
`spec-kit upgrade` CLI). Hand off the `FROM → TO` range so it knows what changed.

### Step 7: Validate

Run `node scripts/check-consistency.mjs` (expect exit 0). New rules shipped by the upgrade (e.g.,
traceability, troubleshooting schema, alignment gate) start **dormant** until the project has the
artifacts that trigger them, so a clean project still passes immediately after upgrade.

### Step 8: Report

Report `FROM`→`TO`, the per-version delta applied, every file added/refreshed, every `.kit` collision
left for the user to reconcile, the doc sections appended, the check-consistency result, and the new
stamped version. Note any new dormant checks and what will activate them.

## Output

A report covering: versions (`FROM`→`TO`), the changelog of what those versions introduced, files
added vs. refreshed vs. left as `.kit` for review, project-doc sections appended, validation result,
the newly stamped version, and recommended next steps (reconcile `.kit` files; review appended doc
blocks).

## Examples

### Example 1: Project on 1.0.0 pulling the LLM-Wiki + alignment-gate improvements

**User says:** "atualizar metodologia"

**Agent should:**
1. Read project `config.md` → no version section → `FROM = 1.0.0`.
2. Clone kit → `TO = 1.1.0`; summarize the 1.1.0 row (troubleshooting + log, review-alignment,
   traceability + alignment gate, this skill) and present it.
3. Suggest `chore/upgrade-methodology-1.1.0`.
4. Add `.specs/memory/troubleshooting.md`, `.specs/memory/log.md`,
   `.claude/skills/{review-alignment,record-troubleshooting,upgrade-methodology}/`; refresh
   `scripts/check-consistency.mjs` and `.specs/templates/feature-spec.md` (unmodified → refresh);
   run `update-skills-index.mjs` to rebuild `INDEX.md`; append Key Rules 8–9 to `AGENTS.md`.
5. `node scripts/check-consistency.mjs` → exit 0 (new checks dormant).
6. Bump `config.md` version to `1.1.0`.
7. Report the delta, nothing overwritten.

### Example 2: Already current

**User says:** "upgrade methodology"

**Agent should:** read `FROM = 1.1.0`, clone kit → `TO = 1.1.0` → report "already current at 1.1.0",
make no changes, stop.

## References

- `.specs/config.md` — repository URL and the `## Methodology Version` stamp this skill reads/bumps
- `METHODOLOGY.md## Methodology Versions` — the per-version changelog of what each upgrade introduces
- `.claude/skills/reconcile-upgrade/SKILL.md` — the judgment phase this delegates to (Step 6)
- `.claude/skills/adopt-project/SKILL.md` — first-time adoption (the non-versioned sibling of this skill)
- `.claude/skills/check-consistency/SKILL.md` — run after upgrading to validate the result
- `.claude/skills/create-skill/SKILL.md` — how the skills being copied in are structured
