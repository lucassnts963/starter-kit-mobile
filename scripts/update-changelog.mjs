#!/usr/bin/env node
// Generates CHANGELOG.md entries from archived specs. Deterministic replacement for the prose
// update-changelog skill. Idempotent: specs already present are skipped.
//
// Usage: node scripts/update-changelog.mjs [--check]
//   --check : report what would change and exit 1 if out of date, without writing.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVE_DIR = join(ROOT, ".specs", "archive");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const CHECK_ONLY = process.argv.includes("--check");

const SECTION_FOR = (id, title) => {
  if (id.startsWith("FIX-")) return "Fixed";
  if (id.startsWith("MIG-")) return "Changed";
  // CHG-
  return /refactor|melhoria|improve|change/i.test(title) ? "Changed" : "Added";
};

function deSlug(slug) {
  return slug
    .replace(/^\d+-/, "")
    .split("-")
    .join(" ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Collect { id, title, section } from each archived spec.md. */
function collectArchived() {
  if (!existsSync(ARCHIVE_DIR)) return [];
  const out = [];
  for (const d of readdirSync(ARCHIVE_DIR)) {
    const full = join(ARCHIVE_DIR, d);
    if (!statSync(full).isDirectory() || d === ".gitkeep") continue;
    const spec = join(full, "spec.md");
    if (!existsSync(spec)) continue;
    const text = readFileSync(spec, "utf8");
    const id = (text.match(/\b(CHG|FIX|MIG)-\d+\b/) || [])[0];
    if (!id) continue;
    const ctx = (text.match(/##\s*Context\s*\n+([^\n]+)/) || [])[1];
    const title = ctx && ctx.length < 80 ? ctx.trim().replace(/\.$/, "") : deSlug(d);
    out.push({ id, title, section: SECTION_FOR(id, title) });
  }
  return out;
}

function insertEntry(lines, section, entry) {
  const unreleased = lines.findIndex((l) => /^##\s*\[Unreleased\]/i.test(l));
  if (unreleased === -1) throw new Error("CHANGELOG.md has no ## [Unreleased] section");
  // Bound the Unreleased region by the next top-level (## ) header.
  let bound = lines.length;
  for (let i = unreleased + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i]) && !/^##\s*\[Unreleased\]/i.test(lines[i])) {
      bound = i;
      break;
    }
  }
  let header = lines.findIndex((l, i) => i > unreleased && i < bound && new RegExp(`^###\\s*${section}\\b`).test(l));
  if (header === -1) {
    // Create the subsection just under [Unreleased].
    lines.splice(unreleased + 1, 0, "", `### ${section}`);
    header = unreleased + 2;
  }
  lines.splice(header + 1, 0, entry);
  return lines;
}

const archived = collectArchived();
let changelog = existsSync(CHANGELOG) ? readFileSync(CHANGELOG, "utf8") : "";
const pending = archived.filter((s) => !changelog.includes(`(${s.id})`));

if (pending.length === 0) {
  console.log(`Changelog up to date (${archived.length} archived spec(s), 0 pending).`);
  process.exit(0);
}

if (CHECK_ONLY) {
  console.log("Changelog out of date. Missing entries:");
  for (const s of pending) console.log(`  - ${s.title} (${s.id}) → ${s.section}`);
  process.exit(1);
}

let lines = changelog.split("\n");
for (const s of pending) lines = insertEntry(lines, s.section, `- ${s.title} (${s.id})`);
writeFileSync(CHANGELOG, lines.join("\n"));

console.log("Changelog updated:");
for (const s of pending) console.log(`  + [${s.section}] ${s.title} (${s.id})`);
console.log(`Skipped: ${archived.length - pending.length} already present.`);
