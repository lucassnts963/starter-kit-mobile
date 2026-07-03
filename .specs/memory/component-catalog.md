# Component Catalog

> Living inventory of reusable code in this project. Before writing anything new, check here first. After creating something reusable, add it here.

---

## Purpose

This catalog prevents duplication and enables code reuse. Every entry describes **what** the component does, **where** it lives, and **how** to use it. Agents and developers consult this before creating new code.

---

## Usage Rules

| Rule | Description |
|---|---|
| **Check before you create** | Before implementing a new component, hook, or utility, scan this catalog. If something similar exists, reuse or extend it. |
| **Add after you create** | After implementing a reusable piece, add an entry here. Include the file path, purpose, and a one-line usage example. |
| **Never duplicate** | If this catalog has an entry that matches your need, use it. Do not create a parallel implementation. |
| **Keep it current** | When refactoring or removing a component, update or remove its entry here. Stale entries are worse than no entries. |

---

## Components

UI em duas camadas: componentes apresentacionais **testáveis** em `src/components/` (RTL/jest-expo) e
rotas finas em `app/` (expo-router — wiring de hooks, fora do coverage de CI). Adapters nativos finos
em `src/expo/` (expo-audio, expo-speech-recognition, expo-sqlite, expo-secure-store, expo-file-system,
expo-sharing) + composition root `src/expo/container.ts` e `ServicesProvider`/`useServices`.

| Component | Path | Purpose | Props / Input | Example |
|---|---|---|---|---|
| `SessionPanel` | `src/components/SessionPanel.tsx` | Painel de condução: indicador de gravação sempre visível, cobertura, perguntas descartáveis, banner de degradação, controles | `type, status, degradedReason, draftText, assistLoading, coverage, suggestions, on*` | `<SessionPanel {...vm} />` |
| Rotas | `app/index, new-meeting, session/[id], results/[id], settings` | Histórico+busca, criação (consentimento + aviso diarização), sessão ao vivo, resultados (abas, renomear falantes, export), provedores+chaves | — | expo-router file-based |

<!-- 
Template for new entries:
| `ComponentName` | `src/components/ComponentName.{EXT}` | <what it renders> | `prop1: type, prop2: type` | `<ComponentName prop1={value} />` |
-->

---

## Repositories

Data access layer in `src/db/repository/`. One per database entity. CRUD only. Todos recebem o port
`SqlDatabase` (`src/db/database.ts` — assinatura do expo-sqlite; testes usam `node:sqlite`).
Migrations versionadas em `src/db/migrations/` (PRAGMA user_version).

| Repository | Path | Entity | Key Methods | Example |
|---|---|---|---|---|
| `MeetingRepository` | `src/db/repository/meeting-repository.ts` | `meetings` | `save (UPSERT — ver TRB-001), findById, list, searchByTitle, delete (cascade)` | `await meetings.findById(id)` |
| `TranscriptRepository` | `src/db/repository/transcript-repository.ts` | `transcript_segments` | `saveMany, listByMeeting, replaceKind` | `await transcripts.replaceKind(id, 'final', segs)` |
| `PointRepository` | `src/db/repository/point-repository.ts` | `extracted_points` | `save, listByMeeting, delete` | `await points.save(meetingId, point)` |
| `ArtifactRepository` | `src/db/repository/artifact-repository.ts` | `artifacts` | `save (upsert por meeting+kind), findByMeetingAndKind` | `await artifacts.findByMeetingAndKind(id, 'minutes')` |
| `RefinementQueueRepository` | `src/db/repository/refinement-queue-repository.ts` | `refinement_queue` | `enqueue (idempotente), pending, recordFailure, remove` | `await queue.pending()` |

<!-- 
Template for new entries:
| `EntityRepository` | `backend/src/db/repository/EntityRepository.{EXT}` | `entity_name` | `findById, save, delete, list` | `const user = await userRepository.findById(id)` |
-->

---

## Adapters

External service integrations in `src/adapters/`. One per external service. Rede SÓ existe aqui
(NFR-03). Ports: `HttpClient` (`http.ts`), `ApiKeyStore` (`secure-keys.ts` — uma chave por provedor,
REQ-11), interfaces de provedor em `provider-ports.ts`. Erros tipados em `errors.ts`
(`MissingApiKeyError`, `ProviderApiError`). Catálogo com capability flags em `provider-catalog.ts`
(ADR-005): adicionar provedor = nova classe + uma linha no catálogo.

| Adapter | Path | External Service | Key Methods | Example |
|---|---|---|---|---|
| `ElevenLabsScribeProvider` | `src/adapters/stt/elevenlabs-scribe.ts` | ElevenLabs Scribe (STT lote, diariza — REQ-12) | `transcribe(files, {language})` | `createSttProvider('elevenlabs-scribe', deps)` |
| `OpenAiWhisperProvider` | `src/adapters/stt/openai-whisper.ts` | OpenAI Whisper (STT lote, sem diarização → aviso) | `transcribe(files, {language})` | `createSttProvider('openai-whisper', deps)` |
| `OpenAiLlmProvider` | `src/adapters/llm/openai-llm.ts` | OpenAI Chat Completions | `extractPoints(input)` | `createLlmProvider('openai-llm', deps)` |
| `AnthropicLlmProvider` | `src/adapters/llm/anthropic-llm.ts` | Anthropic Messages API | `extractPoints(input)` | `createLlmProvider('anthropic-llm', deps)` |
| `parseCandidates` + `EXTRACTION_SYSTEM_PROMPT` | `src/adapters/llm/parse-candidates.ts` | — (validação compartilhada da saída do LLM; instrução anti-alucinação) | `parseCandidates(raw)` | usado por todos os LlmProviders |

<!-- 
Template for new entries:
| `ServiceNameAdapter` | `backend/src/adapters/ServiceNameAdapter.{EXT}` | Stripe, S3, SendGrid | `charge, upload, send` | `await stripeAdapter.charge(amount, token)` |
-->

---

## Services / Business Logic

Business logic orchestration in `src/services/`. Coordinates repositories and adapters. Ports de
infraestrutura (Clock, IdGenerator, AudioFileStore) em `src/services/ports.ts`; ports de provedor de
IA (SttBatchProvider — ADR-005) em `src/adapters/provider-ports.ts`.

| Service | Path | Purpose | Key Methods | Example |
|---|---|---|---|---|
| `MeetingSessionService` | `src/services/meeting-session-service.ts` | Orquestra a sessão: transições persistidas, rascunho ao vivo, pontos ancorados, encerramento → fila | `createMeeting, start/pause/resume/end, addAudioSegment, addDraftSegment, addPoint, deleteMeeting` | `await session.end(meetingId)` |
| `RefinementService` | `src/services/refinement-service.ts` | Fila offline-first: re-transcrição (falantes), builders de ata/requisitos, retry em falha | `processQueue` | `await refinement.processQueue()` |
| `LiveAssistService` | `src/services/live-assist-service.ts` | Loop ao vivo: delta → LLM → âncoras validadas → cobertura + perguntas; degrada sem exceção | `processDelta(meetingId, type)` | `const r = await assist.processDelta(id, type)` |
| `RecordingService` | `src/services/recording-service.ts` | Gravação segmentada sobre `RecorderPort` (pause fecha segmento, resume abre outro); stop encerra mesmo se o gravador falhar | `start/pause/resume/stop` | `await recording.pause(id)` |
| `LiveTranscriptionService` | `src/services/live-transcription-service.ts` | STT nativo com auto-restart de sessão; erro → degradado sem parar a gravação; `status()` para a UI | `start, stop, status, flush` | `await live.start(id, 'pt-BR')` |
| `SpeakerService` | `src/services/speaker-service.ts` | Renomear falante + regenerar ata/requisitos pelos builders | `listSpeakers, rename` | `await speakers.rename(id, 'Falante 1', 'Cliente')` |
| `filterMeetings` | `src/services/history-filter.ts` | Filtro puro do histórico (título/data) — usar com `useMemo` | `(meetings, term) => MeetingRecord[]` | `useMemo(() => filterMeetings(all, q), [all, q])` |

<!-- 
Template for new entries:
| `DomainService` | `backend/src/services/DomainService.{EXT}` | <what it orchestrates> | `process, validate, execute` | `await paymentService.processCheckout(cart)` |
-->

---

## Domain (pure TypeScript — `src/domain/`, zero side effects)

| Module | Path | Purpose | Key Exports | Example |
|---|---|---|---|---|
| `meeting-session` | `src/domain/meeting-session.ts` | Máquina de estados da sessão (idle→recording⇄paused→ended→refining→done) + recuperação pós-crash | `createSession, transition, restoreSession, InvalidTransitionError` | `s = transition(s, 'start')` |
| `transcript` | `src/domain/transcript.ts` | Segmentos draft/final; artefatos finais usam só `final` (ADR-004); falantes (diarização) só em `final`, renomeáveis (REQ-12) | `addSegment, artifactBase, hasFinal, fullText, distinctSpeakers, renameSpeaker` | `renameSpeaker(segments, 'Falante 1', 'Cliente')` |
| `meeting-type` | `src/domain/meeting-type.ts` | Tipos de reunião como dados validados (seções + roteiro de perguntas) | `parseMeetingType, InvalidMeetingTypeError` | `parseMeetingType(json)` |
| `templates/*` | `src/domain/templates/` | Templates: levantamento de requisitos (espelha o kit) e reunião genérica | `requirementsElicitationTemplate, genericMeetingTemplate` | `parseMeetingType(requirementsElicitationTemplate)` |
| `extracted-point` | `src/domain/extracted-point.ts` | Pontos com âncora literal na transcrição (anti-alucinação); mover/editar | `anchorPoint, movePoint, editPointText, AnchorError` | `anchorPoint(p, segments)` |
| `coverage` | `src/domain/coverage.ts` | Seções cobertas/pendentes + perguntas sugeridas (só do roteiro; respeita descartes) | `computeCoverage, suggestQuestions` | `suggestQuestions(type, points, {dismissed})` |
| `artifacts/minutes-builder` | `src/domain/artifacts/minutes-builder.ts` | Ata Markdown determinística a partir dos pontos ancorados | `buildMinutes` | `buildMinutes(meta, type, points)` |
| `artifacts/requirements-builder` | `src/domain/artifacts/requirements-builder.ts` | `requirements.md` no formato do kit; seções pendentes → Open Questions | `buildRequirementsDoc` | `buildRequirementsDoc(meta, type, points)` |

---

## Utilities / Helpers

Pure functions in `src/utils/` or `src/helpers/`. No side effects.

| Function | Path | Purpose | Signature | Example |
|---|---|---|---|---|
| — | — | — | — | — |

<!-- 
Template for new entries:
| `functionName` | `src/utils/functionName.{EXT}` | <what it returns> | `(arg: Type) => ReturnType` | `const value = functionName(arg)` |
-->

---

## Services / API Modules

Service layers in `src/services/` or `backend/src/services/`.

| Service | Path | Purpose | Key Methods | Example |
|---|---|---|---|---|
| — | — | — | — | — |

<!-- 
Template for new entries:
| `ServiceName` | `src/services/ServiceName.{EXT}` | <what it interacts with> | `method1(), method2()` | `const data = await ServiceName.method1()` |
-->

---

## Types / Interfaces

Shared type definitions in `src/types/` or `shared/types/`.

| Type | Path | Purpose | Fields | Used By |
|---|---|---|---|---|
| — | — | — | — | — |

<!-- 
Template for new entries:
| `TypeName` | `src/types/types.{EXT}` | <what it represents> | `field1: Type, field2: Type` | `ComponentName, ServiceName` |
-->

---

## Patterns

Recurring architectural patterns used across the project.

| Pattern | Description | When to Use | Example Location |
|---|---|---|---|
| Repository | Entity data access abstraction (CRUD) | Every database entity | `backend/src/db/repository/` |
| Adapter | External service integration wrapper | Every external API/service | `backend/src/adapters/` |
| Service | Business logic orchestration | When coordinating repositories + adapters | `backend/src/services/` |
| Thin Handler | Request parsing → service call → response formatting | Every API endpoint | `backend/src/handlers/` |
| Memoized Filter | Client-side list filtering via computed/memoized value | Any searchable list | `src/components/*List.{EXT}` |
| — | — | — | — |

---

## Agent Instructions

When implementing a feature:

1. **Read this catalog first** — do not create what already exists.
2. **After Green phase**: if you created a component, hook, utility, or type that other features will need, add it here using the template under each section.
3. **During Refactor**: if you extracted reusable code, add it here and remove any now-dead entries.
4. **On bugfix**: if the fix creates a reusable helper, add it here.

---

## References

- `.specs/memory/clean-code.md` — standards that govern how entries here are written
- `.specs/memory/conventions.md` — naming and file structure conventions
- `check-consistency.md` — validation that this catalog stays current
