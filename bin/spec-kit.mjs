#!/usr/bin/env node
// spec-kit — the deterministic "hands" of the methodology. Run via:
//   npx github:lucassnts963/starter-kit <command>            (default branch)
//   npx github:lucassnts963/starter-kit#vX.Y.Z <command>     (pin a released version)
// npx fetches the kit to run this file, so the CLI copies files from its OWN location (KIT_ROOT)
// into the target project (CWD) — no separate clone. It does the mechanical file work; the agent
// skills (init-project, adopt-project, upgrade-methodology) do the judgment (stack questions,
// memory drafting, AGENTS merges). Each command prints which skill to run next.
//
// Commands:
//   init     scaffold a NEW project here (copy the methodology, reset identity files)
//   adopt    overlay the methodology onto an EXISTING project (non-clobbering)
//   upgrade  bring a methodology project up to this CLI's version (additive + refresh + reindex)
//   check    run the consistency + freshness checks here
//   help     usage

import {
  readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync, cpSync, rmSync,
} from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const KIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = process.cwd();

const log = (m) => process.stdout.write(m + "\n");
const die = (m) => { process.stderr.write(`spec-kit: ${m}\n`); process.exit(1); };
const rel = (...p) => join(...p);
const exists = (base, p) => existsSync(rel(base, p));
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

// Mutating commands must not scaffold into the kit itself; read-only ones (help/check) are fine.
function guardNotInKit() {
  if (KIT_ROOT === TARGET && !process.argv.includes("--here"))
    die("refusing to write into the kit itself. Run in your target project dir (or pass --here to override).");
}

// --- copy helpers ---
function copyEntryIfAbsent(relPath) {
  const src = rel(KIT_ROOT, relPath), dst = rel(TARGET, relPath);
  if (existsSync(dst)) return false;
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
  return true;
}
function copyChildrenIfAbsent(relDir) {
  const srcDir = rel(KIT_ROOT, relDir);
  if (!isDir(srcDir)) return [];
  const added = [];
  for (const name of readdirSync(srcDir))
    if (copyEntryIfAbsent(join(relDir, name))) added.push(join(relDir, name));
  return added;
}
function copyForce(relPath) {
  const src = rel(KIT_ROOT, relPath), dst = rel(TARGET, relPath);
  if (!existsSync(src)) return false;
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
  return true;
}
function ensureGitkeep(relDir) {
  const d = rel(TARGET, relDir);
  mkdirSync(d, { recursive: true });
  const k = join(d, ".gitkeep");
  if (!existsSync(k)) writeFileSync(k, "");
}

// Kit-owned tooling: always refreshed to this version (projects should not fork these).
const TOOLING = [
  "scripts/check-consistency.mjs", "scripts/update-changelog.mjs", "scripts/update-skills-index.mjs",
  "scripts/session-context.mjs", "scripts/cut-release.mjs", ".github/workflows/consistency.yml",
  ".specs/methodology.md", // kit-owned methodology rules imported by AGENTS.md — refreshed wholesale
];
// Additive scaffold: copied only when absent (never clobbers project content).
const ADDITIVE_DIRS = [".claude/skills", ".specs/templates", ".specs/memory", ".specs/shared"];
const ADDITIVE_FILES = [".claude/settings.json", ".specs/config.md", "AGENTS.md", "CLAUDE.md", "METHODOLOGY.md"];

function methodologyVersion(base) {
  const cfg = rel(base, ".specs/config.md");
  if (!existsSync(cfg)) return null;
  const m = readFileSync(cfg, "utf8").match(/##\s*Methodology Version[\s\S]*?\*\*Version:\*\*\s*([0-9.]+)/);
  return m ? m[1] : null;
}
function regenerateIndex() {
  try { execFileSync("node", [rel(TARGET, "scripts/update-skills-index.mjs")], { cwd: TARGET, stdio: "ignore" }); } catch {}
}
function resetChangelog() {
  const tpl = rel(KIT_ROOT, ".specs/templates/changelog-template.md");
  if (existsSync(tpl)) writeFileSync(rel(TARGET, "CHANGELOG.md"), readFileSync(tpl, "utf8"));
}
function cmp(a, b) { return a.localeCompare(b, undefined, { numeric: true }); }

// Forward-only baseline: when a project crosses into the version that introduced the
// traceability/alignment checks (1.1.0), snapshot its existing archived specs so those legacy specs
// are grandfathered (exempt) — new specs still comply. Mirrors the kit's forward-only TDD baseline.
const GATE_VERSION = "1.1.0";
function writeBaselineIfCrossing(from, to) {
  if (!(cmp(from, GATE_VERSION) < 0 && cmp(to, GATE_VERSION) >= 0)) return null;
  const baselinePath = rel(TARGET, ".specs/baseline.json");
  if (existsSync(baselinePath)) return null; // never overwrite an existing baseline
  const archiveDir = rel(TARGET, ".specs/archive");
  const dirs = isDir(archiveDir)
    ? readdirSync(archiveDir).filter((d) => d !== ".gitkeep" && isDir(join(archiveDir, d)))
    : [];
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        methodologyBaseline: to,
        note: "One-time snapshot taken at upgrade. It does NOT grow — specs archived after this point must comply with the traceability/alignment checks (no grandfathering past the baseline).",
        grandfatheredArchive: dirs,
      },
      null,
      2
    ) + "\n"
  );
  return dirs.length;
}

// --- commands ---
function cmdInit() {
  guardNotInKit();
  if (readdirSync(TARGET).some((f) => ![".git"].includes(f)))
    log("note: target dir is not empty — copying methodology files alongside (existing files kept).");
  const added = [];
  for (const d of ADDITIVE_DIRS) added.push(...copyChildrenIfAbsent(d));
  for (const f of ADDITIVE_FILES) if (copyEntryIfAbsent(f)) added.push(f);
  for (const t of TOOLING) copyForce(t);
  for (const g of [".specs/changes", ".specs/archive", ".specs/requirements"]) ensureGitkeep(g);
  resetChangelog();
  regenerateIndex();
  log(`✓ scaffolded ${added.length} methodology paths into ${basename(TARGET)}`);
  log(`✓ CHANGELOG.md reset to a clean template (no kit history)`);
  log(`✓ skills index generated; tooling installed (v${methodologyVersion(KIT_ROOT)})`);
  log("\nNext: run the init-project skill (say \"iniciar projeto\" / \"start project\") to configure the");
  log("stack — it fills AGENTS.md, narrows conventions, records ADR-003, and sets package.json identity.");
}

function cmdAdopt() {
  guardNotInKit();
  if (exists(TARGET, ".specs/config.md"))
    die("this project already has .specs/config.md — use `spec-kit upgrade` instead of adopt.");
  const added = [];
  for (const d of ADDITIVE_DIRS) added.push(...copyChildrenIfAbsent(d));
  for (const f of ADDITIVE_FILES) if (copyEntryIfAbsent(f)) added.push(f);
  for (const t of TOOLING) copyForce(t);
  for (const g of [".specs/changes", ".specs/archive", ".specs/requirements"]) ensureGitkeep(g);
  if (!exists(TARGET, "CHANGELOG.md")) resetChangelog(); // only create if the project has none
  regenerateIndex();
  log(`✓ overlaid ${added.length} methodology paths (existing project files untouched)`);
  log("\nNext: run the adopt-project skill (say \"adotar metodologia\" / \"adopt methodology\") to detect");
  log("the stack, merge methodology sections into your AGENTS.md, and draft the memory docs from code.");
}

function cmdUpgrade() {
  guardNotInKit();
  if (!exists(TARGET, ".specs/config.md"))
    die("no .specs/config.md here — this isn't a methodology project. Use `init` or `adopt`.");
  const from = methodologyVersion(TARGET) || "1.0.0"; // no version section ⇒ predates versioning
  const to = methodologyVersion(KIT_ROOT);
  if (cmp(from, to) >= 0) { log(`Already current at ${from} (CLI is ${to}). Nothing to do.`); return; }

  log(`Upgrading methodology ${from} → ${to}`);
  const added = [];
  for (const d of ADDITIVE_DIRS) added.push(...copyChildrenIfAbsent(d));
  for (const f of ADDITIVE_FILES) if (copyEntryIfAbsent(f)) added.push(f);
  let refreshed = 0;
  for (const t of TOOLING) if (copyForce(t)) refreshed++;
  copyEntryIfAbsent(".claude/settings.json");
  regenerateIndex();

  // Stamp the new methodology version into the project's config.md (project-owned: only this field).
  const cfgPath = rel(TARGET, ".specs/config.md");
  let cfg = readFileSync(cfgPath, "utf8");
  if (/##\s*Methodology Version/.test(cfg)) {
    cfg = cfg.replace(/(##\s*Methodology Version[\s\S]*?\*\*Version:\*\*\s*)[0-9.]+/, `$1${to}`);
  } else {
    cfg = cfg.replace(/(- \*\*URL:\*\*[^\n]*\n)/, `$1\n## Methodology Version\n\n- **Version:** ${to}\n`);
  }
  writeFileSync(cfgPath, cfg);

  const grandfathered = writeBaselineIfCrossing(from, to);

  log(`✓ added ${added.length} new paths, refreshed ${refreshed} tooling files, regenerated the skills index`);
  log(`✓ stamped .specs/config.md → Methodology Version ${to}`);
  if (grandfathered !== null)
    log(`✓ forward-only baseline written: ${grandfathered} pre-existing archived spec(s) grandfathered (exempt from the new traceability/alignment checks)`);
  log(`\nNext — run the reconcile-upgrade skill ("ajustar arquivos da metodologia") for the judgment steps:`);
  log("  • migrate AGENTS.md to the methodology split: move any inline rules into the @.specs/methodology.md import");
  log("  • adapt existing files to new conventions (e.g. give troubleshooting.md TRB-NN ids)");
  log("  • reconcile files you customized that this refresh overwrote (git diff shows them)");
  log("  • record the upgrade in .specs/memory/log.md");
  log("\nThen: node scripts/check-consistency.mjs  (new checks stay dormant until you have the artifacts).");
}

function cmdCheck() {
  const steps = [
    ["scripts/check-consistency.mjs", []],
    ["scripts/update-changelog.mjs", ["--check"]],
    ["scripts/update-skills-index.mjs", ["--check"]],
  ];
  let failed = 0;
  for (const [script, args] of steps) {
    const p = rel(TARGET, script);
    if (!existsSync(p)) { log(`skip ${script} (absent)`); continue; }
    try { execFileSync("node", [p, ...args], { cwd: TARGET, stdio: "inherit" }); }
    catch { failed++; }
  }
  if (failed) die(`${failed} check(s) failed.`);
  log("✓ all checks passed.");
}

function cmdHelp() {
  log(`spec-kit — methodology CLI (v${methodologyVersion(KIT_ROOT) || "?"})

Usage: npx github:lucassnts963/starter-kit <command>   (or: node bin/spec-kit.mjs <command>)
       pin a released version for reproducibility: ...starter-kit#vX.Y.Z <command>

  init      Scaffold a NEW project here (copy the methodology, clean CHANGELOG, install tooling)
  adopt     Overlay the methodology onto an EXISTING project (never clobbers your files)
  upgrade   Bring a methodology project up to this CLI's version (additive + tooling refresh + reindex)
  check     Run the consistency + freshness checks here
  help      This message

The CLI does the deterministic file work; run the matching skill afterward for the judgment parts
(stack config, memory drafting, AGENTS merges). Outward-facing steps (git, releases) are never done.`);
}

const cmd = process.argv[2];
switch (cmd) {
  case "init": cmdInit(); break;
  case "adopt": cmdAdopt(); break;
  case "upgrade": cmdUpgrade(); break;
  case "check": cmdCheck(); break;
  case "help": case "--help": case "-h": case undefined: cmdHelp(); break;
  default: die(`unknown command '${cmd}'. Run \`spec-kit help\`.`);
}
