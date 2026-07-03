---
name: create-skill
description: >-
  Create a new, standardized skill discoverable by both opencode and Claude Code. Use when the user
  says "create skill", "criar skill", "add skill" or "adicionar skill". Produces a
  .claude/skills/<name>/SKILL.md with valid YAML frontmatter (name + description) and the 6 canonical
  body sections, then validates it with check-consistency.
metadata:
  version: 2.0.0
---

# Create Skill

## Purpose

Guide to create new, standardized skills for this project. Skills live in
`.claude/skills/<name>/SKILL.md` and teach agents how to perform specific project tasks. This
location is discovered by both opencode (which scans `.claude/skills/*/SKILL.md`) and Claude Code.

## Prerequisites

- `AGENTS.md` — project overview and conventions
- `.specs/config.md` — single source of truth for URLs, stacks, defaults, and the canonical
  section list (`## Skill Format`)
- `.claude/skills/` — existing skills (check for name/description collisions)
- `.specs/memory/conventions.md` — coding patterns

## Instructions

### Step 1: Gather Requirements

Ask the user: what the skill should do (1–2 sentence purpose), when it should trigger (keywords /
scenarios in English and Portuguese), which project files it needs, and whether it follows a spec
template from `.specs/templates/`.

### Step 2: Read Context

Read `AGENTS.md`, `.specs/config.md` (to avoid hardcoding URLs or stack lists), and
`.specs/memory/conventions.md`.

### Step 3: Choose Name, Folder, and Description

- **Folder + file:** `.claude/skills/<skill-name>/SKILL.md` (one folder per skill).
- **Name** (`name:` in frontmatter): `verb-substantive`, all lowercase, hyphen-separated. Must
  describe what the skill DOES (e.g., `create-migration`, `run-tdd`). Must be unique across
  `.claude/skills/`.
- **Description** (`description:` in frontmatter): this is what the agent reads to decide whether to
  load the skill — make it specific. Describe *when* to use it and embed the trigger phrases in both
  English and Portuguese (e.g., "Use when the user says 'create migration' / 'criar migração' …").
  Also note when NOT to use it if it could be confused with another skill.

### Step 4: Write the SKILL.md

Use this mandatory structure — valid frontmatter + the **6 canonical body sections**
(see `.specs/config.md## Skill Format`):

```markdown
---
name: <verb-substantive>
description: >-
  <When to use this skill, with English + Portuguese trigger phrases embedded.
  One rich sentence or two.>
metadata:
  version: 1.0.0
---

# <Skill Title>

## Purpose
<1–2 sentences. The FIRST sentence is pulled verbatim into the generated skills index
(`.claude/skills/INDEX.md`) — make it a crisp, standalone description of what the skill does.>

## Prerequisites
<Context files to read first. Reference `.specs/config.md` for constants instead of hardcoding.>

## Instructions
### Step 1: <Clear Action Name>
<Specific, actionable guidance.>

## Output
<What the agent should produce or report back.>

## Examples
### Example 1: <Scenario>
**User says:** "<trigger phrase>"
**Agent should:** 1. <step> 2. <step>

## References
- `.specs/config.md` — project constants and defaults
- `AGENTS.md`, `.specs/memory/conventions.md`, `.specs/memory/clean-code.md`,
  `.specs/memory/component-catalog.md`, `.specs/templates/<relevant-template>.md`
```

### Step 5: Validate (Mandatory)

Run every check; fix and re-validate on any failure:

```
[ ] Folder + file: .claude/skills/<name>/SKILL.md (one folder per skill)
[ ] Frontmatter present and valid: name + description (description is specific, embeds en+pt triggers)
[ ] name follows verb-substantive convention and is unique
[ ] All 6 body sections present: Purpose, Prerequisites, Instructions, Output, Examples, References
[ ] No hardcoded URLs or stack lists — references `.specs/config.md`
[ ] Instructions are actionable (no vague "figure it out" steps)
[ ] At least 1 example provided
[ ] References section includes `.specs/config.md`
```

### Step 6: Regenerate the Skills Index

Run `node scripts/update-skills-index.mjs` so the new skill appears in `.claude/skills/INDEX.md` (the
generated catalog). This is required — `check-consistency` fails if the index is out of sync with the
skill folders.

### Step 7: Run Consistency Check

Run the `check-consistency` skill ("verificar consistência" / "check consistency"). It executes
`node scripts/check-consistency.mjs`, which validates the whole skill set structurally — including
that the skills index lists exactly the skills that exist.

### Step 8: Confirm with User

Show the skill content, validation results, and ask whether the description/triggers are right and
if any steps are missing.

## Output

1. The created `.claude/skills/<name>/SKILL.md`
2. Validation results from Step 5
3. The regenerated `.claude/skills/INDEX.md` entry (Step 6)
4. Consistency check report from Step 7

## Examples

### Example 1: Creating a migration skill

**User says:** "criar skill"

**Agent should:**
1. Ask what the skill does; read `AGENTS.md` and `.specs/config.md`.
2. Note migration specs use `.specs/templates/migration-spec.md`.
3. Name: `create-migration`; description embeds "create migration / criar migração".
4. Write `.claude/skills/create-migration/SKILL.md` with frontmatter + 6 sections.
5. Run Step 5 checklist — all pass.
6. Run `check-consistency` — no violations. Confirm with user.

### Example 2: Validation catches a bad skill

**User says:** "add skill" (and provides one with issues)

**Agent should detect and fix:** flat file → move into `.claude/skills/<name>/SKILL.md`; missing
frontmatter → add `name` + `description`; vague description → rewrite with embedded triggers;
missing `## Output` → add it; hardcoded URL → reference `.specs/config.md`. Then re-run
`check-consistency` → pass.

## References

- `.specs/config.md` — constants and the canonical Skill Format
- `AGENTS.md` — project overview and conventions
- `.specs/memory/conventions.md` — code conventions
- `.specs/memory/clean-code.md` — SOLID, metrics, anti-patterns
- `.claude/skills/check-consistency/SKILL.md` — validation skill
- `scripts/update-skills-index.mjs` — regenerates `.claude/skills/INDEX.md` from the skills
- `.claude/skills/` — existing skills directory
