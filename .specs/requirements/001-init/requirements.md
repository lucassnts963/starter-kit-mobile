# Requirements Specification

| Field | Value |
|---|---|
| **ID** | REQ-001 |
| **Status** | approved |
| **Author** | Lucas Santos (via agente) |
| **Created** | 2026-07-03 |
| **Stakeholders** | Time de desenvolvimento |

---

## 1. Problem Statement

### Current Situation

Um novo projeto (Escriba, app mobile de apoio a reuniões) precisa nascer já estruturado sobre a
metodologia spec-driven + TDD do starter-kit, com stack definida e convenções estabelecidas.

### Why This Matters

Sem o bootstrap, cada mudança futura careceria de rastreabilidade, convenções e memória do projeto.

### Success Definition

Projeto inicializado: `AGENTS.md` preenchido, convenções restritas à stack, ADR-003 registrado e
specs de bootstrap criados.

| Metric | Current | Target |
|---|---|---|
| Placeholders `{...}` em AGENTS.md | todos | 0 |
| ADRs registrados | 2 (kit) | 4 (stack + transcrição) |

---

## 2. Stakeholder Map

| Stakeholder | Role | Interest | Influence (High/Med/Low) | Key Concern |
|---|---|---|---|---|
| Lucas Santos | Dev / Product Owner | Projeto pronto para desenvolvimento guiado por agentes | High | Metodologia aplicada desde o dia zero |

---

## 3. Methodology

User Stories (para o próprio setup).

## 4. Requirements

### 4.1 User Stories

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-01 | Como dev, quero o starter-kit configurado para a stack mobile escolhida, para que agentes e humanos sigam as mesmas convenções | 1. AGENTS.md sem placeholders 2. conventions.md restrito à stack 3. ADR-003 registrado |

---

## 5. Functional Requirements

| ID | Description | Source | Priority (MoSCoW) |
|---|---|---|---|
| REQ-01 | Estrutura do projeto criada com a stack escolhida (AGENTS.md, conventions.md, ADR-003, arquivos de identidade resetados) | US-01 | Must |

---

## 6. Non-Functional Requirements

N/A — mudança de setup, sem código executável.

## 7. Constraints

| ID | Constraint | Type | Impact |
|---|---|---|---|
| C-01 | Metodologia do kit (versão em `.specs/config.md`) não pode ser editada no projeto | Technical | Upgrades substituem arquivos kit-owned |

## 8. Assumptions

| ID | Assumption | Validation Needed? | Risk if Wrong |
|---|---|---|---|
| A-01 | Stack ADR-003 (Expo/RN/TS/SQLite/Jest) atende o produto descrito em 002 | Yes | Re-bootstrap parcial de convenções |

## 9. Out of Scope

- Scaffold do app Expo (vai em spec próprio, após requisitos do produto)
- Qualquer funcionalidade do produto (ver `requirements/002-assistente-reunioes/`)

## 10. MoSCoW Prioritization

| Priority | Requirements | Rationale |
|---|---|---|
| **Must have** | REQ-01 | Sem bootstrap não há projeto |

## 11. Dependencies

| Dependency | Type | Status | Impact if Unavailable |
|---|---|---|---|
| starter-kit v1.2.0 | Internal | Available | Não há metodologia para aplicar |

## 12. Domain Glossary

Ver `.specs/memory/glossary.md`.

## 13. Risks & Mitigations

| Risk | Likelihood (Low/Med/High) | Impact (Low/Med/High) | Mitigation |
|---|---|---|---|
| Stack escolhida se provar inadequada (ex.: Expo limitar áudio em background) | Low | Med | ADR-003 documenta alternativa (dev client); revisitar via novo ADR |

## 14. Traceability Matrix

| REQ ID | Source (US/UC/JS) | Requirement Summary | Priority | Implementation Spec | Test ID |
|---|---|---|---|---|---|
| REQ-01 | US-01 | Projeto estruturado com stack escolhida | Must | changes/001-init/ | — |

## 15. Appendix

### Open Questions
- [ ] Nome definitivo do app — "Escriba" proposto; alternativas: Pauta, Minuta, Relator, Ata Viva (decisão do stakeholder)

---

## Validation Checklist

- [x] All stakeholders identified
- [x] Methodology chosen and section(s) filled
- [x] Functional requirements documented with sources
- [x] Non-functional requirements defined with measurements
- [x] Constraints and assumptions listed
- [x] MoSCoW prioritization complete
- [x] Dependencies identified
- [x] Risks assessed with mitigations
- [x] Out of scope explicitly defined
- [x] Traceability matrix populated
- [ ] Stakeholders reviewed and approved
