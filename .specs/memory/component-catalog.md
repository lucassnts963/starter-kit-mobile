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

Components are UI elements (React, Vue, Svelte, etc.) in `src/components/`.

| Component | Path | Purpose | Props / Input | Example |
|---|---|---|---|---|
| — | — | — | — | — |

<!-- 
Template for new entries:
| `ComponentName` | `src/components/ComponentName.{EXT}` | <what it renders> | `prop1: type, prop2: type` | `<ComponentName prop1={value} />` |
-->

---

## Repositories

Data access layer in `backend/src/db/repository/`. One per database entity. CRUD only.

| Repository | Path | Entity | Key Methods | Example |
|---|---|---|---|---|
| — | — | — | — | — |

<!-- 
Template for new entries:
| `EntityRepository` | `backend/src/db/repository/EntityRepository.{EXT}` | `entity_name` | `findById, save, delete, list` | `const user = await userRepository.findById(id)` |
-->

---

## Adapters

External service integrations in `backend/src/adapters/`. One per external service.

| Adapter | Path | External Service | Key Methods | Example |
|---|---|---|---|---|
| — | — | — | — | — |

<!-- 
Template for new entries:
| `ServiceNameAdapter` | `backend/src/adapters/ServiceNameAdapter.{EXT}` | Stripe, S3, SendGrid | `charge, upload, send` | `await stripeAdapter.charge(amount, token)` |
-->

---

## Services / Business Logic

Business logic orchestration in `backend/src/services/` or `backend/src/business/`. Coordinates repositories and adapters.

| Service | Path | Purpose | Key Methods | Example |
|---|---|---|---|---|
| — | — | — | — | — |

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
