# Working Log

> Append-only, chronological journal of what agents did and learned in this project. This is the
> `log.md` of Karpathy's LLM-Wiki: the running record that makes memory *compounding* rather than
> re-derived each session. Newest entries go at the **bottom** — never rewrite or delete history.

## What this is (and is not)

| This file (`log.md`) | Not this file |
|---|---|
| Chronological — "what happened, in order" | `CHANGELOG.md` — user-facing release notes, compiled from `archive/` |
| Working memory across sessions — pick up where you left off | `troubleshooting.md` — topical error/fix memory, searched by symptom |
| Append-only; entries are never edited after the fact | `architecture.md` — curated ADRs, edited in place |

The CHANGELOG answers *"what shipped"*. This log answers *"what was I doing, and why, last session"*.

## How to write an entry

Append one block per work session (or per meaningful milestone). Keep it short — a few lines, not a
transcript. Format:

```markdown
## YYYY-MM-DD — <short title>

- **Did:** what changed (specs touched, files, decisions made).
- **Learned:** anything non-obvious worth remembering (a gotcha → also record it in troubleshooting.md).
- **Next:** the immediate next step, so the next session starts without re-reading everything.
- **Refs:** spec ids (`CHG-`/`FIX-`/`MIG-`), `TRB-` ids, commits, PRs.
```

Rules:

1. **Append only.** Add at the bottom; do not edit or remove past entries — the history is the point.
2. **Date every entry** with an ISO `YYYY-MM-DD` prefix so it is sortable and greppable.
3. **One block per session/milestone**, not per file edit. Compile, don't dump.
4. **Cross-link, don't duplicate.** Point to specs, `TRB-` entries, and commits instead of restating them.

---

## Log

<!--
Template — copy, set today's date, append at the bottom:

## 2026-01-15 — Implemented CSV export (CHG-014)

- **Did:** Added export service + handler; spec CHG-014 archived; CHANGELOG regenerated.
- **Learned:** the report stream is lazy — must `await` the cursor before serializing or rows drop.
- **Next:** wire the export button into the reports toolbar (follow-up spec 015).
- **Refs:** CHG-014, commit 9f3a1c2, TRB-002 (lazy-cursor gotcha).
-->

## 2026-07-03 — Bootstrap do Escriba + requisitos e spec do MVP (CHG-001, CHG-002)

- **Did:** Projeto criado a partir do starter-kit v1.2.0 (create-project/init-project): AGENTS.md
  preenchido (MOBILE, React Native + Expo, TS, expo-sqlite, Jest, pt-BR), conventions restritas,
  ADR-003 (stack) e ADR-004 (transcrição híbrida: STT nativo ao vivo + refinamento em lote),
  identidade resetada. Elicitação completa em `requirements/002-assistente-reunioes/` (REQ-01..11,
  NFR-01..08), spec CHG-002 em fatias A–E, alignment-review `aligned`. Glossário preenchido.
- **Learned:** Rascunho ao vivo e ata final têm exigências opostas → modelar `Transcript.kind`
  (draft/final) desde o domínio. STT nativo iOS reinicia sessão ~1 min — o serviço precisa de
  auto-restart. Motor de perguntas deve ser ancorado no template (determinístico) com LLM só
  reformulando, para não virar ruído.
- **Next:** validar Open Questions com o stakeholder (nome do app, provedores, plataforma do 1º
  build, diarização); iniciar `run-tdd` da Fatia A (domínio puro: meeting-session, coverage,
  builders); spikes da Fatia D (gravação 2h em background; qualidade do STT nativo pt-BR).
- **Refs:** CHG-001 (implemented), CHG-002 (draft, aligned), ADR-003, ADR-004.
