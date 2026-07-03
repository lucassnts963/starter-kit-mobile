#!/usr/bin/env node
// Prepares a release deterministically: validates version consistency, then rolls the
// CHANGELOG ## [Unreleased] section into a dated ## [<version>] section and opens a fresh empty
// [Unreleased]. It does NOT tag, commit, push, or publish — those outward-facing steps stay manual.
//
// Usage:
//   node scripts/cut-release.mjs <YYYY-MM-DD>   cut the release dated <date>
//   node scripts/cut-release.mjs --check        verify release-readiness without writing
//
// The version is the single source from package.json; it must equal the methodology version in
// .specs/config.md (the kit's release version tracks the methodology structure version).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "package.json");
const CONFIG = join(ROOT, ".specs", "config.md");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check");
const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

const die = (msg) => {
  console.error(`cut-release: ${msg}`);
  process.exit(1);
};

const pkgVersion = JSON.parse(readFileSync(PKG, "utf8")).version;
const configText = readFileSync(CONFIG, "utf8");
const methVersion = (configText.match(/##\s*Methodology Version[\s\S]*?\*\*Version:\*\*\s*([0-9.]+)/) || [])[1];

// --- Gate 1: version consistency (kit release version === methodology version) ---
if (!methVersion) die(".specs/config.md has no '## Methodology Version' / **Version:** value");
if (pkgVersion !== methVersion)
  die(`version mismatch: package.json ${pkgVersion} != methodology ${methVersion} (align them first)`);

// --- Gate 2: the Unreleased section must have real content ---
const changelog = existsSync(CHANGELOG) ? readFileSync(CHANGELOG, "utf8").replace(/\r\n/g, "\n") : "";
const lines = changelog.split("\n");
const start = lines.findIndex((l) => /^##\s*\[Unreleased\]/i.test(l));
if (start === -1) die("CHANGELOG.md has no ## [Unreleased] section");
let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
  if (/^##\s*\[/.test(lines[i])) { end = i; break; }
}
const block = lines.slice(start + 1, end);
const hasContent = block.some((l) => /^\s*-\s+\S/.test(l));

if (CHECK_ONLY) {
  if (!hasContent) die(`not ready: [Unreleased] has no entries (version ${pkgVersion})`);
  console.log(`Release-ready: version ${pkgVersion}, [Unreleased] has entries. Run: node scripts/cut-release.mjs <date>`);
  process.exit(0);
}

if (!date) die("a release date is required: node scripts/cut-release.mjs <YYYY-MM-DD>");
if (!hasContent) die(`[Unreleased] has no entries to release (version ${pkgVersion})`);
if (changelog.includes(`## [${pkgVersion}]`)) die(`CHANGELOG already has a [${pkgVersion}] section`);

// Body = the Unreleased block minus any trailing '---'/blank separator.
const body = block.join("\n").replace(/\n*---\s*$/g, "").trim();
const freshUnreleased = "## [Unreleased]\n\n### Added\n\n### Changed\n\n### Fixed\n\n### Removed\n\n---\n";
const released = `## [${pkgVersion}] - ${date}\n\n${body}\n\n---\n`;

const before = lines.slice(0, start).join("\n");
const after = lines.slice(end).join("\n"); // starts at the previous newest version header
const result = `${before}\n${freshUnreleased}\n${released}\n${after}`.replace(/\n{3,}/g, "\n\n");

writeFileSync(CHANGELOG, result.endsWith("\n") ? result : result + "\n");
console.log(`CHANGELOG: cut [Unreleased] → [${pkgVersion}] - ${date}, opened a fresh [Unreleased].`);
console.log("Next (manual, outward-facing — not done by this script):");
console.log(`  1. Commit the release prep.`);
console.log(`  2. Merge the branch into the default branch.`);
console.log(`  3. git tag v${pkgVersion} && git push origin v${pkgVersion}`);
console.log(`  4. Create the GitHub Release from the [${pkgVersion}] notes.`);
