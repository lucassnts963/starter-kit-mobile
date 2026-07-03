# Spec: Bootstrap do projeto Escriba

| Field | Value |
|---|---|
| **ID** | CHG-001 |
| **Status** | implemented |
| **Author** | Lucas Santos (via agente) |
| **Created** | 2026-07-03 |
| **Approved** | 2026-07-03 |

## Context

Setup inicial do projeto Escriba a partir do starter-kit (metodologia spec-driven + TDD, versão em
`.specs/config.md## Methodology Version`). Configura a stack mobile e deixa o repositório pronto para
o primeiro ciclo requirements → spec → TDD do produto.

## Scope

Scaffolding metodológico do projeto: `AGENTS.md` configurado, ADR-003 (stack) e ADR-004 (estratégia
de transcrição) registrados, `conventions.md` restrito à stack, arquivos de identidade
(`CHANGELOG.md`, `package.json`, `README.md`) resetados para o projeto.

### Out of Scope

- Scaffold do app Expo e qualquer código de produto (specs futuros, a partir de 002)

## Requirements

### Functional

- [x] REQ-01: Estrutura do projeto criada com a stack escolhida

### Non-Functional

N/A (setup-only).

### Technical

| Layer | File / Component | Change Description |
|---|---|---|
| Docs | `AGENTS.md` | Placeholders preenchidos com a stack mobile |
| Docs | `.specs/memory/conventions.md` | Restrito a RN/Expo + SQLite + Jest |
| Docs | `.specs/memory/architecture.md` | ADR-003 (stack) e ADR-004 (transcrição híbrida) |
| Docs | `CHANGELOG.md`, `package.json`, `README.md` | Identidade resetada para o Escriba |

## Design

N/A (no UI).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Convenções restritas cedo demais | Low | Low | Ajustar conventions.md conforme o produto evolui |

## Dependencies

- starter-kit v1.2.0

## Requirements Traceability

**Requirements:** [`requirements/001-init/requirements.md`](../../requirements/001-init/requirements.md)

| REQ ID | Requirement Summary | Priority | Acceptance Criteria |
|---|---|---|---|
| REQ-01 | Projeto estruturado com stack escolhida | Must | AGENTS.md sem placeholders; conventions restritas; ADR-003 registrado; identidade resetada |

## Tests

N/A (setup-only change — sem código executável; validação via `npm run check`).

### Test Cases

| ID | Test | Type | Description |
|---|---|---|---|
| TEST-01 | `node scripts/check-consistency.mjs` | integration | Estrutura da metodologia consistente após o bootstrap |

### Test Files

| File | What It Covers |
|---|---|
| `scripts/check-consistency.mjs` | Validação estrutural do `.specs/` e skills |

---

## Validation Checklist

- [x] AGENTS.md filled
- [x] conventions set
- [x] ADR-003 written
- [x] Identity files reset (CHANGELOG, package.json, README)
- [x] `npm run check` verde

## Notes

Nome "Escriba" é proposta inicial (alternativas em `requirements/001-init` Open Questions). ADR-004
registra a decisão híbrida de transcrição analisada durante o levantamento de 002.
