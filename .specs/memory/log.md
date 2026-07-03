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

## 2026-07-03 — Revisão do stakeholder: multi-provedor, diarização, Android, nome conflitado

- **Did:** Decisões do stakeholder incorporadas: REQ-12 (diarização Must + renomear falantes),
  REQ-13 (multi-provedor com ElevenLabs Scribe, chaves por provedor), C-05 (Android primeiro).
  ADR-003 ganhou "Alternatives considered" (Flutter/Dart, nativo, KMP — pedido do stakeholder);
  ADR-004 recebeu amendment de diarização; ADR-005 criado (catálogo de provedores por capacidade).
  Spec CHG-002 e alignment-review atualizados (TEST-15..18); domínio via TDD: `speaker` só em
  segmentos final, `distinctSpeakers`, `renameSpeaker` (53 testes verdes). Naming research feita:
  "Escriba" conflitado (escriba.app é produto de transcrição; Escriba Informática é marca forte BR).
- **Learned:** ElevenLabs Scribe diariza até 48 falantes com pt-BR de WER excelente e tem variante
  Realtime (~150ms) — cobre lote E um futuro upgrade do rascunho ao vivo. STT nativo não diariza →
  falante é propriedade exclusiva de segmento `final` (invariante no domínio, DraftSpeakerError).
- **Next:** stakeholder escolher o nome (shortlist: Escrivo / Ata Viva / Pautero — domínios .app
  livres em 2026-07-03); Fatia B (repositories) e Fatia C começando pelo adapter ElevenLabs
  (TEST-17/18); spikes Android (gravação 2h background + STT nativo pt-BR).
- **Refs:** CHG-002, ADR-003 (amendment), ADR-004 (amendment), ADR-005.

## 2026-07-03 — Fatia B: persistência e serviços (CHG-002)

- **Did:** TDD Red → Green da Fatia B: port `SqlDatabase` (assinatura expo-sqlite; testes em
  `node:sqlite` real), migrations v1 (FK ON DELETE CASCADE), repositories (Meeting, Transcript,
  Point, Artifact, RefinementQueue), `MeetingSessionService` (transições persistidas, pontos
  ancorados, delete profundo com port de arquivos) e `RefinementService` (fila offline-first,
  falantes na base final, builders, retry). Domínio ganhou transição refining → ended
  (`refinementFailed`, TEST-21). 81 testes verdes, cobertura 99,7%/94% branches.
- **Learned:** TRB-001 — `INSERT OR REPLACE` em tabela-pai com FK CASCADE apaga as filhas (o
  REPLACE é delete+insert); usar `ON CONFLICT DO UPDATE`. `node:sqlite` roda sem flag no Node 22.22
  (só ExperimentalWarning) — dá teste de integração com SQL real sem dependência nativa extra.
- **Next:** Fatia C — adapters: `ElevenLabsScribeAdapter` (TEST-18), catálogo de provedores com
  capability flags (TEST-17), `LlmProvider`; depois scaffold Expo (Fatias D/E) e spikes Android.
- **Refs:** CHG-002 (Fatia B), TRB-001.

## 2026-07-03 — Fatia C: adapters de IA multi-provedor (CHG-002)

- **Did:** TDD Red → Green da Fatia C: ports `HttpClient`/`ApiKeyStore`, erros tipados,
  `ElevenLabsScribeProvider` (diarização speaker_N → "Falante N+1", offset entre arquivos de áudio
  segmentados), `OpenAiWhisperProvider` (capability flag false), `OpenAiLlmProvider` +
  `AnthropicLlmProvider` com `EXTRACTION_SYSTEM_PROMPT` anti-alucinação e `parseCandidates`
  tolerante, catálogo `provider-catalog.ts` (ADR-005) com seleção persistida em `settings`
  (migration v2, defaults: elevenlabs-scribe / anthropic-llm), `LiveAssistService` (cursor de delta
  por reunião; falha de LLM → ok:false sem consumir o delta). 116 testes, 99,4%/97,7% branches.
- **Learned:** o delta só pode ser consumido DEPOIS da resposta do LLM — consumir antes perderia
  trechos em caso de falha (re-tentativa processa o mesmo delta). Candidato de LLM sem âncora
  literal é descartado no serviço e contado em `dropped` (telemetria futura de alucinação).
- **Next:** Fatia D (scaffold Expo dev client + `RecordingService`/`LiveTranscriptionService` +
  spikes Android: 2h background e STT nativo pt-BR) e Fatia E (UI expo-router + tela de
  configurações de provedores/chaves usando o catálogo).
- **Refs:** CHG-002 (Fatia C), ADR-005.

## 2026-07-03 — Fatias D e E: casca Expo, gravação/STT ao vivo e UI completa (CHG-002)

- **Did:** TDD Red → Green das Fatias D/E: `RecordingService` (segmentos por pause/resume; stop
  encerra mesmo com gravador falhando), `LiveTranscriptionService` (auto-restart quando a sessão
  nativa expira; erro degrada sem parar a gravação), `SpeakerService` (renomear falante regenera
  artefatos; ata ganhou linha Participantes), `filterMeetings` e `SessionPanel` (RTL). Scaffold
  Expo SDK 57: app.json com permissões/plugins, package.json main expo-router/entry, adapters finos
  em `src/expo/`, composition root (`container.ts` + `ServicesProvider`), rotas: home/busca, nova
  reunião (consentimento LGPD + aviso de diarização), sessão (painel + loop de 30s do LiveAssist),
  resultados (abas ata/requisitos/transcrição, renomear falantes, refinar agora, export via share
  sheet), configurações (provedor por capacidade + chave por provedor). Jest multi-projeto
  (ts-jest + jest-expo). 141 testes, 99%/90,6% branches, tsc limpo.
- **Learned:** jest-expo 57 exige Jest 29 (30 quebra com `clearMocksOnScope`); RNTL v14 tem
  `render`/`fireEvent` assíncronos e queries só via `screen`; presets em `projects` inline não
  resolvem — usar arquivos de config por projeto. Adapters nativos como passthrough de ports mantém
  toda a lógica testável em Node.
- **Next:** build dev client Android (`npx expo run:android`) e os dois spikes em aparelho físico:
  NFR-01 (gravação 2h em background) e A-02 (qualidade do STT nativo pt-BR); depois revisão do
  stakeholder ponta a ponta e fechar o checklist do CHG-002 para arquivar.
- **Refs:** CHG-002 (Fatias D/E), C-05, NFR-01, A-02.

## 2026-07-03 — Primeiro build em aparelho físico + 2 bugs reais corrigidos (CHG-002)

- **Did:** `npx expo run:android` funcionando pela primeira vez num Moto G15 real, depois de três
  bloqueios de ambiente puramente locais desta máquina Windows (TRB-002/003/004 — hoisting do npm,
  sandbox do agente bloqueando `Selector.open()` do JDK, NDK 27 + espaço no caminho do usuário).
  Smoke test manual encontrou e corrigiu (TDD Red→Green) um bug real de produção: upload de áudio pro
  STT quebrava com "Unsupported FormDataPart implementation" porque o `fetch` global do RN (via
  `whatwg-fetch`) não entende o formato de arquivo nativo `{uri,name,type}` do `FormData` do RN
  (TRB-005) — corrigido roteando corpos `FormData` por `XMLHttpRequest` em `createHttpClient`.
  Melhorada a UX de renomear falante (aba Transcrição agora mostra `Falante N: texto` por linha, chip
  em edição destacado). 146 testes, `tsc --noEmit` limpo (reconciliado `module`/`moduleResolution`
  com o `extends: expo/tsconfig.base` que o Expo CLI injeta sozinho a cada build).
- **Learned:** builds Android via as ferramentas Bash/PowerShell do próprio agente Claude Code
  falham com "Unable to establish loopback connection" (Java NIO `Selector.open()` bloqueado pela
  sandbox do harness) mesmo com `dangerouslyDisableSandbox` — build precisa rodar no terminal do
  usuário. NDK 27 no Windows quebra link C++ (`ld.lld: undefined symbol` em libc++) quando o perfil do
  usuário tem espaço no nome, porque o `clang++.exe` vira `CLANG_~1.EXE` (nome curto 8.3) e o Clang
  decide compilar como C puro só pelo nome do executável — fix: copiar o NDK para um caminho sem
  espaço e apontar via `android/local.properties`.
- **Next:** repetir Spike A-02 falando direto no microfone (o teste feito foi condição difícil — áudio
  indireto de baixa qualidade — o stakeholder quer repetir em condição normal antes do veredito);
  rodar Spike NFR-01 (2h gravação em background) quando o aparelho estiver disponível; validar em
  aparelho a correção de UX do `labeledText` (feita após o último rebuild desta sessão, ainda não
  testada); depois fechar o checklist do CHG-002.
- **Refs:** CHG-002, TRB-002, TRB-003, TRB-004, TRB-005.
