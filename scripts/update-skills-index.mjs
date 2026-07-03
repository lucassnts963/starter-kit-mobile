#!/usr/bin/env node
// Generates .claude/skills/INDEX.md from every .claude/skills/<name>/SKILL.md — the single source
// for the skills catalog, so AGENTS.md/README don't hand-maintain (and drift from) the list. Same
// "compile, don't write" pattern as update-changelog.mjs. Includes project-added skills automatically.
//
// Usage: node scripts/update-skills-index.mjs [--check]
//   --check : exit 1 (without writing) if INDEX.md is missing or out of date.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, ".claude", "skills");
const INDEX = join(SKILLS_DIR, "INDEX.md");
const CHECK_ONLY = process.argv.includes("--check");

/** Frontmatter `name:` (block-scalar-tolerant enough for a simple inline key). */
function frontmatterName(text) {
  text = text.replace(/\r\n/g, "\n");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const m = text.slice(3, end).match(/^name:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

/** First sentence of the `## Purpose` section, flattened to one table-safe line. */
function purposeSentence(text) {
  text = text.replace(/\r\n/g, "\n");
  const start = text.search(/^##\s+Purpose\s*$/m);
  if (start === -1) return "";
  const after = text.slice(start).split("\n").slice(1);
  const para = [];
  for (const line of after) {
    if (/^##\s+/.test(line)) break; // next section
    if (line.trim() === "") { if (para.length) break; else continue; } // first paragraph only
    para.push(line.trim());
  }
  const joined = para.join(" ").replace(/\s+/g, " ").trim();
  const firstSentence = (joined.match(/^.*?[.!?](?:\s|$)/) || [joined])[0].trim();
  return firstSentence.replace(/\|/g, "\\|"); // escape table delimiter
}

function listSkillDirs() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory())
    .sort();
}

function build() {
  const rows = [];
  for (const dir of listSkillDirs()) {
    const file = join(SKILLS_DIR, dir, "SKILL.md");
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const name = frontmatterName(text) || dir;
    rows.push(`| \`${name}\` | ${purposeSentence(text) || "—"} |`);
  }
  return [
    "# Skills Index",
    "",
    "> Generated from `.claude/skills/*/SKILL.md` by `scripts/update-skills-index.mjs`. Do not edit by",
    "> hand — run the generator (or `create-skill` regenerates it). `check-consistency` enforces that",
    "> this index lists exactly the skills that exist. Skills are auto-discovered by opencode and",
    "> Claude Code from `.claude/skills/`; this file is the human/agent-readable catalog.",
    "",
    "| Skill | Purpose |",
    "|---|---|",
    ...rows,
    "",
  ].join("\n");
}

const generated = build();
const current = existsSync(INDEX) ? readFileSync(INDEX, "utf8") : "";

if (generated === current) {
  console.log(`Skills index up to date (${listSkillDirs().length} skills).`);
  process.exit(0);
}

if (CHECK_ONLY) {
  console.log("Skills index out of date — run: node scripts/update-skills-index.mjs");
  process.exit(1);
}

writeFileSync(INDEX, generated);
console.log(`Skills index written: ${listSkillDirs().length} skills → .claude/skills/INDEX.md`);
