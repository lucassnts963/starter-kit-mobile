# Code Conventions

## Frontend

### Styling
- React Native `StyleSheet.create` (system-native look; sem CSS)
- Pattern: estilos co-locados no fim do arquivo do componente

### Components
- React Native core components (View, Text, Pressable, FlatList) — sem UI kit externo no MVP
- Functional components with hooks
- One component per file (default export)
- Files named PascalCase (components), kebab-case (modules/services)

### State Management
- React Context + hooks (um contexto por agregado: `MeetingSessionContext`)
- Local state via `useState` / `useReducer`

### Forms
- Inline form (telas simples); bottom-sheet para ações rápidas durante a gravação

### Filtering / Search
- Use `useMemo` for client-side filtering
- Pattern:
  ```pseudocode
  search = state("")
  filtered = computed(() => {
    if empty(search) return items
    term = lowercase(search)
    return items.filter(item => contains(lowercase(item.field), term))
  })
  ```

### Data Fetching
- Adapters encapsulam `fetch` para APIs externas (STT/LLM); nunca `fetch` direto em componente
- Always handle loading, error, and empty states

### Types / Interfaces
- All type definitions in `src/types/` (or co-located in `src/domain/`)
- Naming follows camelCase (variáveis/funções), PascalCase (types/classes)
- IDs: UUID v4

---

## Backend (in-app layers — o app é local-first, sem servidor próprio)

### Architecture

Three distinct layers with clear boundaries:

| Layer | Folder | Purpose | Example |
|---|---|---|---|
| **Repository** | `src/db/repository/` | Data access (CRUD) — one per database entity | `MeetingRepository`, `TranscriptRepository` |
| **Adapter** | `src/adapters/` | External service integration — one per external API/service | `SttAdapter`, `LlmAdapter` |
| **Service** | `src/services/` | Business logic orchestration — coordinates repositories and adapters | `MeetingSessionService`, `MinutesService` |

**Data flow:**
```
Hook → Service → Repository (local data)
              → Adapter  (external service)
```

- **Repository**: Abstrai coleção de dados. Métodos: `findById()`, `save()`, `delete()`. Retorna objetos de domínio.
- **Adapter**: Traduz entre o sistema e uma API externa. Métodos semânticos: `transcribe()`, `generateMinutes()`, `suggestQuestions()`. Retorna DTOs ou status codes.
- **Service**: Orquestra lógica de negócio. Chama repositories e adapters — nunca diretamente do hook.
- **Hooks**: thin wrappers calling services. Zero business logic in hooks.
- Entry point registers all providers/contexts em `app/_layout.tsx`

### Models
- Objetos de domínio puros em `src/domain/` (sem imports de React/Expo) — testáveis em Node

### Naming
- Tables and columns: snake_case
- Types/Classes: PascalCase
- IDs: TEXT (UUID v4)

### Database
- SQLite (expo-sqlite)
- Migrations via script próprio versionado (`src/db/migrations/`, aplicadas em ordem no boot)
- Connection pooling via BUILT_IN (single connection, expo-sqlite)

---

## Testing

### Framework
- Jest (preset `jest-expo`; domain core roda com preset Node puro)
- React Native Testing Library (componentes)
- E2E: NONE no MVP (avaliar Maestro/Detox depois)

### Test File Convention
- **Location:** co-located (`File.test.ts` / `Component.test.tsx`)
- **Naming:** `<FileUnderTest>.test.<ext>`
- **Pattern:** one test file per source file

### Coverage
- **Threshold:** valor em `.specs/config.md## Defaults` (minimum)
- **Measured by:** istanbul (built-in do Jest)
- Coverage reports generated on: `npm run test -- --coverage`

### Test Types
| Type | Scope | Framework | Location |
|---|---|---|---|
| **Unit** | Single function/component | Jest | Co-located |
| **Integration** | Module/API interaction | Jest + mocks de adapters | `tests/integration/` |
| **E2E** | Full user flows | NONE (MVP) | — |

### TDD Workflow (Mandatory)
1. **Read spec** → understand requirements and `## Tests` section
2. **Red** → write a failing test that validates the requirement
3. **Green** → write minimum code to make the test pass
4. **Refactor** → clean up code, ensure all tests still pass
5. **Repeat** → next test case until all spec requirements are covered

### Test Standards
- Tests must be **deterministic** (no flaky tests)
- Tests must be **independent** (no shared mutable state)
- Tests must have **descriptive names** following the pattern: `should <expected behavior> when <condition>`
- Mock external dependencies (STT/LLM adapters); never mock the unit under test
- Each bugfix MUST include a regression test

---

## Spec Files

- All spec documents in `.specs/`
- Templates in `.specs/templates/`
- Active specs in `.specs/changes/<nnn>-<slug>/`
- Completed specs moved to `.specs/archive/`
- Knowledge in `.specs/memory/`
- Reference docs in `.specs/shared/`
