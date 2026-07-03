# Starter Kit Configuration

Single source of truth for project-wide constants. Skills reference this file instead of hardcoding
values. This file is harness-agnostic — it is not specific to any agent tool.

## Repository

- **URL:** `https://github.com/lucassnts963/starter-kit.git`

## Methodology Version

- **Version:** 1.2.0

This is the version of the methodology *structure* — skills, templates, scripts, and the `.specs/`
memory layout — that this project was bootstrapped or last upgraded to. It is **not** the project's
own product version (that lives in `package.json`/`CHANGELOG.md`).

Because `init-project`, `create-project`, and `adopt-project` all copy this `config.md` into the new
project, the project automatically carries the methodology version it was set up with. The
`upgrade-methodology` skill compares this value against the starter-kit's latest to compute and apply
the delta. Bump it (minor for additive structure, major for breaking layout changes) and add a row to
`METHODOLOGY.md## Methodology Versions` whenever the methodology structure changes.

## Supported Technologies

| Layer | Options |
|---|---|
| Shell / Platform | TAURI, ELECTRON, WAILS, WEB, CLI, MOBILE, LIBRARY |
| Frontend | REACT, VUE, SVELTE, ANGULAR, SOLID, HTMX, VANILLA, NONE |
| Backend | RUST, NODE, PYTHON, GO, CSHARP, JAVA, ELIXIR, NONE |
| Database | SQLITE, POSTGRES, MYSQL, MONGODB, SURREALDB, NONE |
| Testing | VITEST, JEST, PYTEST, CARGO_TEST, GO_TEST, JUNIT, XUNIT |
| Package Manager | npm, pnpm, yarn, bun, cargo, pip, go mod |
| Language | en, pt-BR, bilingual (pt + en), other |

## Defaults

- **Coverage threshold:** 90%
- **Project language:** en

> The coverage default lives here only. Skills and docs must reference this value, not restate it.

---

## Skill Format

Skills are discovered by both opencode and Claude Code from `.claude/skills/<name>/SKILL.md`
(one folder per skill). This is the single canonical location — flat `.md` files elsewhere are not
discovered.

Every `SKILL.md` must have:

1. **YAML frontmatter** with:
   - `name` (required) — `verb-substantive`, lowercase, hyphens; must equal the folder name.
   - `description` (required) — *when* to use the skill, with English + Portuguese trigger phrases
     embedded. This is what the agent reads to decide whether to load the skill, so be specific.
   - `metadata.version` (optional).
2. The **6 canonical body sections**, in order:
   `## Purpose`, `## Prerequisites`, `## Instructions`, `## Output`, `## Examples`, `## References`.

---

## Consistency

Consistency is enforced by a **script**, not a manual checklist. Before committing changes to any
skill or config file, run:

```
node scripts/check-consistency.mjs        # or: "verificar consistência" / "check consistency"
```

It validates: skill folder/frontmatter/sections, verb-substantive names, no hardcoded repo URL
outside this file, no orphaned references (old flat skill paths, `tdd-workflow`,
`requirements-gathering`), and archive↔CHANGELOG coverage. Exit code `0` = clean. The same script
runs in CI on every push and pull request.
