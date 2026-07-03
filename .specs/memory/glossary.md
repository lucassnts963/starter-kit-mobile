# Entity Glossary

Map between domain terminology, column names, and different systems.

| Term (pt-BR) | Term (en / código) | Table / Context | Notes |
|---|---|---|---|
| Reunião | Meeting | `meetings` | Agregado raiz: título, tipo, consentimento, status |
| Sessão | MeetingSession | domínio (runtime) | Reunião em andamento: máquina de estados de gravação |
| Tipo de reunião | MeetingType | `meeting_types` / templates em dados | Roteiro de perguntas + formato de saída |
| Rascunho ao vivo | Draft transcript (`kind: draft`) | `transcript_segments` | STT nativo em tempo real, não-final |
| Transcrição refinada | Final transcript (`kind: final`) | `transcript_segments` | Re-transcrição em lote pós-reunião (ADR-004) |
| Ponto extraído | ExtractedPoint | `extracted_points` | Trecho classificado numa seção, com âncora na transcrição |
| Painel de condução | Coverage panel | UI da sessão | Seções cobertas/pendentes + perguntas sugeridas |
| Ata | Minutes | `artifacts` | Tópicos, decisões, pendências, ações (Markdown) |
| Documento de requisitos | Requirements doc | `artifacts` | `requirements.md` no template do starter-kit |
| Refinamento | Refinement | fila offline-first | Re-transcrição + geração de artefatos pós-reunião |

## Column Translations

| Source Column | Target Column | Transform |
|---|---|---|
| — | — | (preencher quando o schema SQLite for criado na Fatia B) |

## Status Mapping

| Source Value | Target Value | Context |
|---|---|---|
| idle / recording / paused / ended / refining / done | `meetings.status` | Máquina de estados da sessão (CHG-002) |
