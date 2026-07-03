# Alignment Review — CHG-002

- **Reviewed-spec:** CHG-002
- **Reviewed-requirements:** ../../requirements/002-assistente-reunioes/requirements.md
- **Date:** 2026-07-03
- **Verdict:** aligned

## Per-Requirement Verdicts

| REQ ID | Verdict | Evidence (spec section · quote) | Gap / Action |
|---|---|---|---|
| REQ-01 | Covered | `### Technical` · "Máquina de estados: idle → recording ⇄ paused → ended"; `recording-service.ts` "background mode, recuperação pós-crash"; edge case "App morto durante gravação" | — |
| REQ-02 | Covered | `### Technical` · `live-transcription-service.ts` "expo-speech-recognition com auto-restart"; `transcript.ts` "kind: draft \| final" | — |
| REQ-03 | Covered | `### Technical` · `stt-adapter.ts` "Transcrição em lote"; `refinement-service.ts` "fila offline-first"; TEST-03 garante artefatos só de `final` | — |
| REQ-04 | Covered | `### Technical` · `coverage.ts` "seções cobertas/pendentes + próxima pergunta"; flow passo 4 "seções pendentes... perguntas sugeridas... descartar/adiar" | — |
| REQ-05 | Covered | `### Technical` · `extracted-point.ts` "âncora no trecho da transcrição; mover/editar/apagar"; edge case anti-alucinação descarta ponto sem âncora | — |
| REQ-06 | Covered | `### Technical` · `minutes-builder.ts` "Montagem determinística da ata"; TEST-07 "contém todo tópico/decisão/pendência/ação" | — |
| REQ-07 | Covered | `### Technical` · `requirements-builder.ts` "template do kit, com Open Questions = seções não cobertas"; TEST-08 | — |
| REQ-08 | Covered | `### Technical` · `meeting-type.ts` "template de dados"; templates de requisitos e genérica; TEST-09 "tipos são dados, sem alterar código do motor" | — |
| REQ-09 | Covered | `## Design` flow passo 7 "exportar via share sheet (Markdown)"; repositories + TEST-13 (busca no histórico) | — |
| REQ-10 | Covered | `## Design` · "indicador permanente visível"; flow passo 8 + TEST-10 "cascade delete" | — |
| REQ-11 | Covered | `### Technical` · `secure-keys.ts` "uma por provedor"; edge case "Chave de API ausente/inválida"; TEST-12 | — |
| REQ-12 | Covered | `### Technical` · `transcript.ts` "speaker? (só em final); listar/renomear falantes com propagação"; edge cases de diarização/renomeação; TEST-15/16/18 | — |
| REQ-13 | Covered | `### Technical` · `provider-catalog.ts` "capability flags"; adapters ElevenLabs/OpenAI/LLMs; edge case "trocar de provedor e reprocessar"; TEST-17/18 | — |
| NFR-01 | Partial (accepted) | `## Notes` · "exigem validação em aparelho físico — spikes da Fatia D" | Spike manual planejado; não automatizável em CI — aceito pelo autor |
| NFR-02 | Covered | `## Design` flow passo 3 (extração periódica ~30s); AC de US-02 herdado no painel; medição instrumentada prevista nos requisitos | — |
| NFR-03 | Covered | `### Technical` camada Adapter concentra rede; conventions.md "nenhuma chamada de rede fora de src/adapters/" | — |
| NFR-04 | Covered | `secure-keys.ts` + TEST-12 "chave ausente → erro tipado"; requisito "nunca em logs" reafirmado | — |
| NFR-05 | Covered | `## Design` States · "banner não-bloqueante"; TEST-14 "indicador... sempre visível" | — |
| NFR-06 | Covered | Edge case "Sem rede na reunião"; TEST-11/TEST-12 degradação graciosa | — |
| NFR-07 | Covered | Templates e prompts em pt-BR (REQ-04/06/07 herdam); requisito NFR-07 citado na lista Non-Functional do spec | — |
| NFR-08 | Partial (accepted) | `## Notes` · spike de bateria em aparelho físico (Fatia D) | Medição manual planejada — aceito pelo autor |

## Scope Drift

- Fatiamento A–E e ordem de implementação — decisão de engenharia, não altera comportamento requerido; ok.
- `ArtifactRepository` (persistir ata/requirements gerados) — implícito em US-05/US-07 (revisar/exportar depois); ok.

## Summary

Todos os REQ-01..13 têm cobertura explícita no spec com evidência citada (REQ-12/13 adicionados na
revisão do stakeholder de 2026-07-03, re-revisados no mesmo dia). NFR-01 e NFR-08 são parciais por
natureza (validação física em aparelho — Android primeiro, C-05 — não automatizável) e estão
explicitamente aceitos e planejados como spikes da Fatia D. Spec liberado para `run-tdd`.
