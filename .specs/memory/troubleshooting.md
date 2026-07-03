# Troubleshooting Memory

> Living memory of errors hit in this project and the strategies that fixed them. Before debugging
> something that feels familiar, search here first. After resolving a non-trivial problem, record it
> here so the next agent (or you, in three months) does not re-derive the fix from scratch.

This file is the failure-mode counterpart of `component-catalog.md`:

| Catalog | Troubleshooting |
|---|---|
| "solutions we built → **reuse**, don't recreate" | "failures we solved → **don't re-debug** from zero" |

It is a *compiled* memory page (in the sense of Karpathy's LLM-Wiki: compile durable knowledge out of
transient incidents), not an incident log. A `bugfix-spec.md` captures the **event** (reproduction,
root cause, regression test) and is archived per incident; this file captures the **distilled,
cross-incident lesson** and links back to that spec or commit.

---

## Usage Rules

| Rule | Description |
|---|---|
| **Search before you debug** | Before investigating an error, grep this file for the symptom. If it is here, start from the recorded fix strategy. |
| **Record after you resolve** | After fixing a non-trivial problem (anything that cost real investigation), add an entry. Use the `record-troubleshooting` skill to keep the format consistent. |
| **Compile, don't dump** | Write the distilled lesson, not the raw debugging transcript. Symptom → cause → what worked → how to prevent it. |
| **Link to the source** | Reference the related spec (`FIX-NN`), commit, or PR so the full incident context stays reachable. |
| **Keep it current** | If a later change makes an entry obsolete (the underlying cause is gone), mark it `Status: resolved-permanently` or remove it. Stale entries are worse than none. |

---

## Entry Format

Each entry is a `TRB-<n>` heading (sequential id, project-wide) with these fields:

```markdown
## TRB-NNN: <short symptom>

- **Date:** YYYY-MM-DD · **Related:** FIX-012, commit abc123, PR #45 · **Status:** resolved

**Symptom:** What you observe — exact error message, stack trace excerpt, or wrong behavior.
**Context:** Stack / environment / condition under which it appears (OS, version, config, data shape).
**Root cause:** The underlying reason, once understood.
**Fix strategy:** What resolved it — and, just as important, what did **not** work (dead ends save time).
**Prevention:** How to avoid it next time, or the early signal that it is happening again.
```

Required fields (validated by `check-consistency`): **Symptom**, **Root cause**, **Fix strategy**.
`Context`, `Prevention`, and the `Related`/`Status` metadata are recommended but optional.

**Language:** field labels may be written in **English or Portuguese** — the kit supports pt-BR
projects, so the checker accepts either: `Symptom`/`Sintoma`, `Root cause`/`Causa`,
`Fix strategy`/`Solução`. Write in your project's language; don't translate just to satisfy the check.

**Structure:** for a few entries, a flat list of `## TRB-NNN` is fine. As the file grows, **group by
area** — an `## <Area>` header (e.g. `## Toolchain`, `## Git`, `## Environment`) with `### TRB-NNN`
entries underneath. Ids stay sequential and global across areas; the checker validates entries at
either level.

---

## Entries

> No entries yet. The first recorded troubleshooting becomes `TRB-001`. Keep newest at the top or
> bottom consistently — bottom-append is the default (mirrors the append-only `log.md`).

<!--
Template — copy this block, replace TRB-NNN with the next sequential number, and fill in:

## TRB-001: Build fails with "ENOSPC: no space left on device" during CI

- **Date:** 2026-01-15 · **Related:** FIX-007, commit 1a2b3c4 · **Status:** resolved

**Symptom:** CI job dies mid-build with `ENOSPC` even though the host disk shows free space.
**Context:** Node build on the shared CI runner; only reproduces when the inotify watcher count is low.
**Root cause:** The test watcher exhausted `fs.inotify.max_user_watches`, not actual disk space.
**Fix strategy:** Raised the watch limit in the runner image; running tests once (no watch) in CI also
avoids it. Bumping the disk did NOT help — that was the wrong lead.
**Prevention:** CI runs tests in single-run mode; the watch limit is pinned in the runner Dockerfile.
-->

---

## Agent Instructions

When you hit a non-trivial problem:

1. **Before debugging** — grep this file for the symptom/error string. Reuse the recorded strategy if found.
2. **After resolving** — if the fix took real investigation, run the `record-troubleshooting` skill
   (`"registrar troubleshooting"` / `"record troubleshooting"`) to append a well-formed `TRB-NN` entry.
3. **On bugfix specs** — when archiving a `bugfix-spec.md`, compile its lesson into one `TRB-NN` entry
   here and link back with the `FIX-NN` id. The spec is the event; this is the memory.
4. **Keep links live** — always reference the spec, commit, or PR so the full context is one hop away.

---

## References

- `.claude/skills/record-troubleshooting/SKILL.md` — the skill that appends entries here
- `.specs/memory/log.md` — append-only working journal (chronological; this file is topical)
- `.specs/memory/component-catalog.md` — the reuse counterpart to this failure memory
- `.specs/templates/bugfix-spec.md` — per-incident spec that an entry here is compiled from
- `scripts/check-consistency.mjs` — validates that entries follow the required-field schema
