# AGENTS.md — Escriba

> Primary instruction source for AI agents. **This file is project-owned** — stack, commands,
> architecture, and conventions live here. The kit-owned methodology rules are imported under
> `## Methodology`, so a methodology upgrade never touches this file. Keep it updated as the project evolves.

## Overview

**Escriba** é um app mobile de apoio a reuniões: grava o áudio, transcreve, sugere perguntas em tempo
real guiadas pela metodologia do starter-kit (para não deixar questões em aberto) e, ao final, entrega
a ata da reunião e o documento de requisitos (`requirements.md`) já estruturado. Flexível para outros
tipos de reunião via templates de pauta.

| Layer | Tech |
|---|---|
| Shell / Platform | MOBILE (React Native via Expo) |
| Frontend | REACT (React Native + Expo, TypeScript) |
| Backend | NONE (local-first; serviços externos de IA via Adapters) |
| Database | SQLITE (expo-sqlite, local-first) |
| Auth | none (MVP local, single-user) |
| Language | pt-BR |

---

## Commands

| Command | Where | Description |
|---|---|---|
| `npm run start` | root | Start dev server (Expo) |
| `npm run build` | root | Build for production (EAS build) |
| `npm run test` | root | Run tests (Jest) |
| `npm run lint` | root | Lint code (ESLint) |

---

## Architecture

```
Screen / Component (React Native)
  → hook (useMeetingSession, useTranscription)
    → Service (business logic)
      → Repository (expo-sqlite — meetings, transcripts, requirements)
      → Adapter    (external AI APIs — STT, LLM)
```

- **Routing:** expo-router (file-based)
- **Auth:** none (MVP)
- **Domain core:** pure TypeScript in `src/domain/` — zero React/Expo imports, 100% testable in Node.

---

## Project Conventions

Full conventions in `.specs/memory/conventions.md`. Summary:

- **Frontend:** React Native StyleSheet, React Native core components, state via React Context + hooks
- **Backend (in-app layers):** Repository (data), Adapter (external API), Service (business logic), hooks as thin handlers, naming: camelCase (files: PascalCase for components, kebab-case for modules)
- **New endpoint pattern:** model → repository → service → hook → screen → add type definition
- **New adapter pattern:** for external services (STT, LLM), create adapter → inject into service → test with mock
- **Client-side filtering:** memoized/computed filter from input state (`useMemo`)
- **IDs:** UUID v4
- **Clean Code:** SOLID principles in `.specs/memory/clean-code.md`

---

## Testing

| | |
|---|---|
| **Framework** | JEST (jest-expo preset; domain core roda em Node puro) |
| **Coverage** | istanbul via Jest (threshold: 90%) |
| **Run tests** | `npm run test` |
| **Watch mode** | `npm run test -- --watch` |
| **Coverage report** | `npm run test -- --coverage` |

Full testing conventions in `.specs/memory/conventions.md## Testing`. **TDD is mandatory** (tests
before implementation) — see the methodology rules below.

---

## Methodology

This project follows the spec-driven + TDD methodology. Its operational rules — Key Rules, the change
path, skills, and the memory/consistency model — are **kit-owned** and imported here, so methodology
upgrades replace one file and never touch this one. **Read and follow them**; the import inlines the
content for harnesses that support it (Claude Code), and names the file for those that don't:

@.specs/methodology.md
