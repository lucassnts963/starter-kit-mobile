#!/usr/bin/env node
// "Where you left off" — prints a compact resume summary for a spec-driven project: the latest
// working-log entry, specs in flight, and requirements without a spec yet. Wired as a Claude Code
// SessionStart hook (.claude/settings.json) so its stdout is injected as context, and runnable
// manually via the resume-session skill / `npm run session`. Bulletproof by design: any error or
// missing artifact prints nothing and exits 0 — it must never disrupt a session.
//
// Usage: node scripts/session-context.mjs

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

try {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const SPECS = join(ROOT, ".specs");
  if (!existsSync(SPECS)) process.exit(0); // not a methodology project

  const read = (p) => (existsSync(p) ? readFileSync(p, "utf8").replace(/\r\n/g, "\n") : null);
  const dirsIn = (p) =>
    existsSync(p)
      ? readdirSync(p).filter((d) => d !== ".gitkeep" && statSync(join(p, d)).isDirectory()).sort()
      : [];
  const numOf = (name) => (name.match(/^(\d+)-/) || [])[1] || null;

  const out = [];

  // 1) Latest dated working-log entry (ignore template headings + commented examples).
  const log = read(join(SPECS, "memory", "log.md"));
  if (log) {
    const lines = log.replace(/<!--[\s\S]*?-->/g, "").split("\n");
    const dated = [];
    for (let i = 0; i < lines.length; i++)
      if (/^## \d{4}-\d{2}-\d{2}/.test(lines[i])) dated.push(i);
    if (dated.length) {
      const start = dated[dated.length - 1];
      let end = lines.length;
      for (let i = start + 1; i < lines.length; i++)
        if (/^## /.test(lines[i])) { end = i; break; }
      const head = lines[start].replace(/^##\s*/, "").trim();
      const content = lines.slice(start + 1, end).join("\n");
      const next = (content.match(/^- \*\*Next:\*\*\s*(.+)$/m) || [])[1];
      out.push("Last journal entry (.specs/memory/log.md):");
      out.push(`  ## ${head}`);
      if (next) out.push(`  Next: ${next.trim()}`);
    }
  }

  // 2) Specs in flight, with their alignment-gate state.
  const active = dirsIn(join(SPECS, "changes"));
  if (active.length) {
    out.push((out.length ? "\n" : "") + "Active specs (.specs/changes/):");
    for (const d of active) {
      const num = numOf(d);
      const hasReq = num && dirsIn(join(SPECS, "requirements")).some((r) => numOf(r) === num);
      let gate = "";
      if (hasReq) {
        const review = read(join(SPECS, "changes", d, "alignment-review.md"));
        gate = review
          ? /\*\*Verdict:\*\*\s*aligned\b/i.test(review)
            ? " — alignment: aligned"
            : " — alignment: NOT aligned (re-run review-alignment)"
          : " — alignment: PENDING (run review-alignment)";
      }
      out.push(`  • ${d}${gate}`);
    }
  }

  // 3) Requirements with no spec started yet.
  const reqs = dirsIn(join(SPECS, "requirements"));
  const specNums = new Set([...dirsIn(join(SPECS, "changes")), ...dirsIn(join(SPECS, "archive"))].map(numOf));
  const orphanReqs = reqs.filter((r) => !specNums.has(numOf(r)));
  if (orphanReqs.length) {
    out.push((out.length ? "\n" : "") + "Requirements without a spec yet:");
    for (const r of orphanReqs) out.push(`  • ${r} → create .specs/changes/${r}/spec.md`);
  }

  if (out.length === 0) process.exit(0); // nothing to resume — stay silent

  process.stdout.write(
    "▸ Where you left off (spec-driven project)\n\n" +
      out.join("\n") +
      '\n\n(Re-run anytime: "onde paramos" / "where did I leave off". Auto-shown via the SessionStart hook in .claude/settings.json.)\n'
  );
} catch {
  process.exit(0); // never disrupt a session
}
