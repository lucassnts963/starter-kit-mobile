# CLAUDE.md

This project uses `AGENTS.md` as the single, harness-agnostic instruction source for AI agents
(read by both opencode and Claude Code). To avoid drift, this file simply imports it:

@AGENTS.md

`AGENTS.md` is project-owned (stack, commands, architecture, conventions) and imports the kit-owned
methodology rules from `.specs/methodology.md` (Key Rules, change path, skills, memory/consistency
model). Skills live in `.claude/skills/<name>/SKILL.md`, are discovered automatically, and are
catalogued in `.claude/skills/INDEX.md`; format rules in `.specs/config.md## Skill Format`.
