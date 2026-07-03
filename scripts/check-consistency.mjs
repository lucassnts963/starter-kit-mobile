#!/usr/bin/env node
// Validates the starter-kit's own structural conventions. Deterministic replacement for the
// prose checklist that used to live inside the check-consistency skill.
//
// Usage: node scripts/check-consistency.mjs
// Exit code 0 = all checks pass; 1 = one or more violations.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SKILLS_DIR = join(ROOT, ".claude", "skills");
const CONFIG = join(ROOT, ".specs", "config.md");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const ARCHIVE_DIR = join(ROOT, ".specs", "archive");
const REQUIREMENTS_DIR = join(ROOT, ".specs", "requirements");
const CHANGES_DIR = join(ROOT, ".specs", "changes");
const TROUBLESHOOTING = join(ROOT, ".specs", "memory", "troubleshooting.md");
const BASELINE = join(ROOT, ".specs", "baseline.json");

// Forward-only grandfathering: archived specs that predate the 1.1.0 traceability/alignment rules
// (recorded at upgrade time) are exempt from those checks. New specs always comply. Returns a Set of
// archive dir names. This mirrors the kit's forward-only TDD baseline — never a retroactive gate.
function grandfatheredArchive() {
  if (!existsSync(BASELINE)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(BASELINE, "utf8")).grandfatheredArchive || []);
  } catch {
    return new Set();
  }
}
const GRANDFATHERED = grandfatheredArchive();

const NAME_RE = /^[a-z]+(-[a-z]+)+$/;
const CANONICAL_SECTIONS = [
  "## Purpose",
  "## Prerequisites",
  "## Instructions",
  "## Output",
  "## Examples",
  "## References",
];
const REPO_URL_LITERAL = "github.com/lucassnts963/starter-kit";
// Patterns require the `.md` suffix so prose that merely names the old files (e.g. config.md
// describing what this checker looks for) is not flagged — only real broken references are.
const ORPHAN_PATTERNS = [
  /\.opencode\/skills\/[a-z-]+\.md/, // old flat skill paths
  /\btdd-workflow\.md\b/,
  /\brequirements-gathering\.md\b/,
];

const violations = [];
const passes = [];
const violate = (msg) => violations.push(msg);
const pass = (msg) => passes.push(msg);

/**
 * Parse a leading `---` YAML frontmatter block. Line-based so YAML block scalars (`>-`, `|`)
 * spanning multiple indented lines are captured correctly. Returns { name, description } or null.
 */
function parseFrontmatter(text) {
  text = text.replace(/\r\n/g, "\n"); // tolerate CRLF (Windows autocrlf checkouts)
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const lines = text.slice(3, end).split("\n");

  const scalars = {}; // top-level key -> string value
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([a-zA-Z_]+):\s*(.*)$/); // top-level key (no indentation)
    if (!m) continue;
    const [, key, inline] = m;
    if (inline && !/^[>|]/.test(inline)) {
      scalars[key] = inline.trim();
      continue;
    }
    // Block scalar (or empty inline): gather following indented lines.
    const parts = [];
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) parts.push(lines[j].trim());
    scalars[key] = parts.join(" ").trim();
  }
  return { name: scalars.name || null, description: scalars.description || null };
}

function listSkillDirs() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR).filter((d) =>
    statSync(join(SKILLS_DIR, d)).isDirectory()
  );
}

function walkMarkdown(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkMarkdown(full, acc);
    else if (entry.endsWith(".md")) acc.push(full);
  }
  return acc;
}

// --- Check 1: skill folder + frontmatter + sections ---
function checkSkills() {
  const dirs = listSkillDirs();
  if (dirs.length === 0) {
    violate("No skills found under .claude/skills/");
    return;
  }
  for (const dir of dirs) {
    const skillFile = join(SKILLS_DIR, dir, "SKILL.md");
    if (!existsSync(skillFile)) {
      violate(`${dir}/: missing SKILL.md`);
      continue;
    }
    const text = readFileSync(skillFile, "utf8");
    const fm = parseFrontmatter(text);
    if (!fm) {
      violate(`${dir}/SKILL.md: missing or malformed YAML frontmatter`);
      continue;
    }
    if (!fm.name) violate(`${dir}/SKILL.md: frontmatter missing 'name'`);
    else if (fm.name !== dir)
      violate(`${dir}/SKILL.md: name '${fm.name}' must match folder '${dir}'`);
    else if (!NAME_RE.test(fm.name))
      violate(`${dir}/SKILL.md: name '${fm.name}' must be verb-substantive (lowercase, hyphens)`);

    if (!fm.description || fm.description.length < 40)
      violate(`${dir}/SKILL.md: 'description' missing or too short (be specific, embed triggers)`);

    const missing = CANONICAL_SECTIONS.filter((s) => !text.includes(s));
    if (missing.length) violate(`${dir}/SKILL.md: missing sections: ${missing.join(", ")}`);

    if (!violations.some((v) => v.startsWith(`${dir}/`)))
      pass(`skill ${dir}: frontmatter + 6 sections OK`);
  }
}

// --- Check 1b: the generated skills index lists exactly the skills that exist ---
function checkSkillsIndex() {
  const indexFile = join(SKILLS_DIR, "INDEX.md");
  if (!existsSync(indexFile)) {
    return violate("skills index: .claude/skills/INDEX.md missing — run node scripts/update-skills-index.mjs");
  }
  const text = readFileSync(indexFile, "utf8").replace(/\r\n/g, "\n");
  const listed = new Set([...text.matchAll(/^\|\s*`([a-z][a-z-]+)`\s*\|/gm)].map((m) => m[1]));
  const dirs = new Set(listSkillDirs());
  for (const d of dirs)
    if (!listed.has(d)) violate(`skills index: skill '${d}' exists but is not in INDEX.md (regenerate it)`);
  for (const n of listed)
    if (!dirs.has(n)) violate(`skills index: INDEX.md lists '${n}' but no such skill dir (stale — regenerate)`);
  if (!violations.some((v) => v.startsWith("skills index:")))
    pass(`skills index: ${dirs.size} skills, INDEX.md in sync`);
}

// --- Check 2: skills must not hardcode the repo URL (docs/badges may) ---
function checkHardcoded() {
  const files = walkMarkdown(SKILLS_DIR);
  let found = false;
  for (const f of files) {
    if (readFileSync(f, "utf8").includes(REPO_URL_LITERAL)) {
      violate(`${rel(f)}: skill hardcodes repo URL — reference .specs/config.md## Repository`);
      found = true;
    }
  }
  if (!found) pass("hardcoded values: no skill hardcodes the repo URL");
}

// --- Check 3: orphaned references to renamed files/skills ---
function checkOrphans() {
  const files = walkMarkdown(ROOT).filter((f) => !f.includes(`${join(".git")}`));
  let found = false;
  for (const f of files) {
    if (basename(f) === "check-consistency.mjs") continue;
    const text = readFileSync(f, "utf8");
    for (const re of ORPHAN_PATTERNS) {
      if (re.test(text)) {
        violate(`${rel(f)}: orphaned reference matching ${re}`);
        found = true;
      }
    }
  }
  if (!found) pass("orphaned references: none");
}

// --- Check 4: changelog covers archived specs (and vice-versa) ---
function checkChangelog() {
  if (!existsSync(ARCHIVE_DIR)) return pass("changelog: no archive yet (skipped)");
  const specDirs = readdirSync(ARCHIVE_DIR).filter(
    (d) => statSync(join(ARCHIVE_DIR, d)).isDirectory() && d !== ".gitkeep"
  );
  const archivedIds = [];
  for (const d of specDirs) {
    const spec = join(ARCHIVE_DIR, d, "spec.md");
    if (!existsSync(spec)) continue;
    const m = readFileSync(spec, "utf8").match(/\b(CHG|FIX|MIG)-\d+\b/);
    if (m) archivedIds.push(m[0]);
  }
  if (archivedIds.length === 0) return pass("changelog: archive empty (skipped)");

  const changelog = existsSync(CHANGELOG) ? readFileSync(CHANGELOG, "utf8") : "";
  const changelogIds = [...changelog.matchAll(/\b(CHG|FIX|MIG)-\d+\b/g)].map((m) => m[0]);

  for (const id of archivedIds)
    if (!changelogIds.includes(id)) violate(`changelog: ${id} archived but missing from CHANGELOG.md`);
  for (const id of changelogIds)
    if (!archivedIds.includes(id)) violate(`changelog: ${id} in CHANGELOG.md but not in archive (stale)`);

  if (!violations.some((v) => v.startsWith("changelog:")))
    pass(`changelog: ${archivedIds.length} archived specs, all covered`);
}

// --- Check 5: troubleshooting entries follow the required-field schema ---
// Only real entries (`TRB-<digits>`) are validated. Commented-out examples are stripped first, so
// the template's documentation block never counts; the check stays dormant until the first real
// entry is recorded (mirrors the changelog check, which is skipped while the archive is empty).
//
// Entries may be flat (`## TRB-NNN`) or grouped by area (`## <Area>` with `### TRB-NNN` underneath),
// and field labels are accepted in English OR Portuguese — the kit supports pt-BR projects, so the
// schema must too. Each required field is matched as a bold-label prefix (so qualified labels like
// `**Solução (rápida):**` still count).
const TRB_FIELDS = [
  { name: "Symptom/Sintoma", re: /\*\*\s*(Symptom|Sintoma)/i },
  { name: "Root cause/Causa", re: /\*\*\s*(Root cause|Causa)/i },
  { name: "Fix strategy/Solução", re: /\*\*\s*(Fix strategy|Solução|Soluç|Correção)/i },
];
function checkTroubleshooting() {
  if (!existsSync(TROUBLESHOOTING)) return pass("troubleshooting: file absent (skipped)");
  const text = readFileSync(TROUBLESHOOTING, "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, ""); // drop commented examples — only live entries are validated
  // Entry headings: `##` or `###` carrying a TRB id. Block ends at the next `##`/`###` heading.
  const headings = [...text.matchAll(/^#{2,3}\s+(TRB-\d+)\b/gm)];
  if (headings.length === 0) return pass("troubleshooting: no entries yet (skipped)");

  const nextHeading = (from) => {
    const m = text.slice(from).match(/\n#{2,3}\s/);
    return m ? from + m.index : text.length;
  };
  for (const h of headings) {
    const id = h[1];
    const block = text.slice(h.index, nextHeading(h.index + h[0].length));
    const missing = TRB_FIELDS.filter((f) => !f.re.test(block)).map((f) => f.name);
    if (missing.length) violate(`troubleshooting: ${id} missing field(s): ${missing.join(", ")}`);
  }
  if (!violations.some((v) => v.startsWith("troubleshooting:")))
    pass(`troubleshooting: ${headings.length} entr${headings.length === 1 ? "y" : "ies"}, all well-formed`);
}

// --- Traceability + semantic-gate helpers (Checks 6 & 7) ---
// Structural half of the two-tier consistency model: the script enforces that links and ids line up
// and that the semantic review (review-alignment skill) ran and passed before archive. It never
// judges meaning itself — that is the LLM tier's job. All checks are dormant until both a
// requirements doc and its same-numbered spec exist (mirrors the changelog check on an empty archive).
function specDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(
    (d) => d !== ".gitkeep" && statSync(join(dir, d)).isDirectory()
  );
}
function numPrefix(name) {
  const m = name.match(/^(\d+)-/);
  return m ? m[1] : null;
}
function reqIdSet(text) {
  return new Set([...text.matchAll(/\bREQ-\d+\b/g)].map((m) => m[0]));
}
function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, "utf8").replace(/\r\n/g, "\n") : null;
}
// Find the spec.md for a given requirements number, preferring an archived spec over an active one.
function findSpec(num) {
  for (const [base, where] of [[ARCHIVE_DIR, "archive"], [CHANGES_DIR, "changes"]]) {
    for (const d of specDirs(base)) {
      if (numPrefix(d) === num) {
        const spec = readIfExists(join(base, d, "spec.md"));
        if (spec !== null) return { dir: d, base, where, spec };
      }
    }
  }
  return null;
}

// --- Check 6: requirements ↔ spec traceability integrity ---
function checkTraceability() {
  const reqDirs = specDirs(REQUIREMENTS_DIR);
  if (reqDirs.length === 0) return pass("traceability: no requirements docs yet (skipped)");

  let checked = 0;
  for (const rd of reqDirs) {
    const num = numPrefix(rd);
    const reqText = readIfExists(join(REQUIREMENTS_DIR, rd, "requirements.md"));
    if (!num || reqText === null) continue;
    const spec = findSpec(num);
    if (!spec) continue; // requirements written but spec not started yet — valid in-progress state
    if (spec.where === "archive" && GRANDFATHERED.has(spec.dir)) continue; // forward-only: legacy spec exempt
    checked++;

    const defined = reqIdSet(reqText);
    const referenced = reqIdSet(spec.spec);

    // 6a: the spec must trace back — a Requirements Traceability section that links the requirements doc.
    if (!/##\s+Requirements Traceability/i.test(spec.spec))
      violate(`traceability: ${spec.where}/${spec.dir}/spec.md missing '## Requirements Traceability' section (requirements ${rd} exists)`);
    else if (!new RegExp(`requirements/${num}-`).test(spec.spec))
      violate(`traceability: ${spec.where}/${spec.dir}/spec.md does not link back to requirements/${rd}`);

    // 6b: no dangling references — every REQ the spec cites must exist in the requirements doc.
    for (const id of referenced)
      if (!defined.has(id))
        violate(`traceability: ${spec.where}/${spec.dir}/spec.md references ${id}, absent from requirements/${rd}`);
  }
  if (checked === 0) return pass("traceability: no requirements paired with a spec yet (skipped)");
  if (!violations.some((v) => v.startsWith("traceability:")))
    pass(`traceability: ${checked} requirements↔spec pair(s) linked, no dangling REQ ids`);
}

// --- Check 7: semantic-review gate on archived specs (blocking) ---
// An archived spec that has requirements must carry an alignment-review.md (written by the
// review-alignment skill) that is complete (covers every defined REQ) and verdict `aligned`.
function checkAlignmentGate() {
  if (!existsSync(REQUIREMENTS_DIR) || specDirs(ARCHIVE_DIR).length === 0)
    return pass("alignment gate: no archived specs yet (skipped)");

  let gated = 0;
  for (const ad of specDirs(ARCHIVE_DIR)) {
    if (GRANDFATHERED.has(ad)) continue; // forward-only: spec archived before the gate existed
    const num = numPrefix(ad);
    const reqDir = num ? findReqDir(num) : null;
    if (!reqDir) continue; // archived spec without requirements (lightweight path) — gate does not apply
    const requirements = readIfExists(join(REQUIREMENTS_DIR, reqDir, "requirements.md"));
    if (requirements === null) continue;
    gated++;

    const review = readIfExists(join(ARCHIVE_DIR, ad, "alignment-review.md"));
    if (review === null) {
      violate(`alignment gate: archive/${ad}/ missing alignment-review.md (run the review-alignment skill before archiving)`);
      continue;
    }
    if (!/\*\*Verdict:\*\*\s*aligned\b/i.test(review))
      violate(`alignment gate: archive/${ad}/alignment-review.md verdict is not 'aligned'`);

    const defined = reqIdSet(requirements);
    const reviewed = reqIdSet(review);
    const unreviewed = [...defined].filter((id) => !reviewed.has(id));
    if (unreviewed.length)
      violate(`alignment gate: archive/${ad}/alignment-review.md does not cover ${unreviewed.join(", ")}`);
  }
  const exempt = GRANDFATHERED.size ? ` (${GRANDFATHERED.size} legacy spec(s) grandfathered)` : "";
  if (gated === 0) return pass(`alignment gate: no archived spec has requirements yet (skipped)${exempt}`);
  if (!violations.some((v) => v.startsWith("alignment gate:")))
    pass(`alignment gate: ${gated} archived spec(s) reviewed and aligned${exempt}`);
}
function findReqDir(num) {
  for (const d of specDirs(REQUIREMENTS_DIR)) if (numPrefix(d) === num) return d;
  return null;
}

function rel(p) {
  return p.slice(ROOT.length + 1).replace(/\\/g, "/");
}

// --- Run ---
checkSkills();
checkSkillsIndex();
checkHardcoded();
checkOrphans();
checkChangelog();
checkTroubleshooting();
checkTraceability();
checkAlignmentGate();

console.log("Consistency check\n");
for (const p of passes) console.log(`  OK   ${p}`);
if (violations.length) {
  console.log("");
  for (const v of violations) console.log(`  FAIL ${v}`);
  console.log(`\n${violations.length} violation(s) found.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
