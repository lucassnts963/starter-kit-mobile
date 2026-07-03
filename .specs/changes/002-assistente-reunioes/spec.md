# Spec: Escriba MVP — Assistente de Reuniões

| Field | Value |
|---|---|
| **ID** | CHG-002 |
| **Status** | draft |
| **Author** | Lucas Santos (via agente) |
| **Created** | 2026-07-03 |
| **Approved** | — |

## Context

O levantamento de requisitos ao vivo exige que o condutor entreviste, anote e detecte lacunas ao mesmo
tempo — e depois transforme tudo em ata e `requirements.md` manualmente. O Escriba automatiza esse
fluxo: grava, transcreve (rascunho ao vivo + refinamento em lote, ADR-004), sugere perguntas guiadas
pelo template da metodologia starter-kit, extrai pontos ao vivo e entrega ata + requirements.md ao
encerrar. Requisitos completos em `requirements/002-assistente-reunioes/`.

## Scope

MVP em fatias verticais, todas dentro deste spec:

1. **Fatia A — Domínio puro (`src/domain/`)**: sessão de reunião (máquina de estados), tipos de
   reunião como templates de dados, motor de cobertura/perguntas, pontos extraídos com rastreio,
   montagem de ata e `requirements.md` (Markdown).
2. **Fatia B — Persistência e serviços**: repositories (expo-sqlite) para reuniões/transcrições/
   pontos, `MeetingSessionService`, fila de refinamento offline-first, exclusão definitiva.
3. **Fatia C — Adapters de IA**: `SttAdapter` (lote, provedor Whisper-compatível), `LlmAdapter`
   (perguntas contextuais, extração de pontos, ata), chaves em SecureStore, degradação graciosa.
4. **Fatia D — Gravação e STT nativo**: `RecordingService` (expo-audio, background, recuperação de
   sessão), rascunho ao vivo via `expo-speech-recognition` com reinício automático de sessão.
5. **Fatia E — UI (expo-router)**: Home/histórico com busca, criação de reunião (tipo + consentimento),
   tela de sessão (transcrição ao vivo, painel de condução, indicador de gravação), tela de resultados
   (ata, requirements.md, export via share sheet).

### Out of Scope

Itens da seção 9 dos requisitos: backend próprio, contas/sync, gravação de calls de outros apps,
diarização garantida, multiusuário, i18n além de pt-BR, push automático para Git.

## Requirements

### Functional

- [ ] REQ-01: Gravação iniciar/pausar/retomar/encerrar, persistente, sobrevive a background e morte do app
- [ ] REQ-02: Rascunho de transcrição ao vivo com STT nativo (offline, pt-BR)
- [ ] REQ-03: Re-transcrição integral pós-reunião via `SttAdapter`; artefatos finais usam essa versão
- [ ] REQ-04: Perguntas sugeridas em tempo real + sinalização de seções não cobertas (roteiro do tipo de reunião)
- [ ] REQ-05: Extração de pontos ao vivo, organizados por seção, com rastreio ao trecho de origem e edição manual
- [ ] REQ-06: Ata completa (tópicos, decisões, pendências, ações) gerada da transcrição refinada
- [ ] REQ-07: `requirements.md` no formato do template do starter-kit, com Open Questions explícitas
- [ ] REQ-08: Tipos de reunião como templates de dados ("levantamento de requisitos" e "genérica" no MVP)
- [ ] REQ-09: Histórico local com busca + export/compartilhamento Markdown
- [ ] REQ-10: Indicador visível de gravação + exclusão definitiva (áudio, transcrições e derivados)
- [ ] REQ-11: Chaves de provedores de IA em SecureStore (uma por provedor)
- [ ] REQ-12: Diarização na transcrição refinada + renomear falantes com propagação para ata e requisitos
- [ ] REQ-13: Multi-provedor STT/LLM via catálogo de adapters (ADR-005), com ElevenLabs Scribe desde o MVP

### Non-Functional

- [ ] NFR-01: Gravação estável ≥ 2h com rascunho ativo
- [ ] NFR-02: Rascunho ≤ 5s; perguntas ≤ 15s após o trecho relevante
- [ ] NFR-03: Rede só em `src/adapters/`; dados permanecem no dispositivo
- [ ] NFR-04: Chaves nunca em texto plano/logs (SecureStore)
- [ ] NFR-05: Operação com uma mão; sugestões não bloqueiam a tela
- [ ] NFR-06: Falha de rede/IA nunca derruba a gravação (degradação para somente-gravação)
- [ ] NFR-07: pt-BR em transcrição, perguntas e artefatos
- [ ] NFR-08: Sessão de 1h com consumo de bateria < 20%

### Technical

| Layer | File / Component | Change Description |
|---|---|---|
| Domain | `src/domain/meeting-session.ts` | Máquina de estados: idle → recording ⇄ paused → ended → refining → done; eventos e invariantes (REQ-01) |
| Domain | `src/domain/meeting-type.ts` | Tipo de reunião como template de dados: seções, roteiro de perguntas, formato de saída (REQ-04/08) |
| Domain | `src/domain/templates/requirements-elicitation.ts` | Template "levantamento de requisitos" espelhando `.specs/templates/requirements-spec.md` e a skill gather-requirements (REQ-04/07) |
| Domain | `src/domain/templates/generic-meeting.ts` | Template "reunião genérica" (pauta + ata simples) (REQ-08) |
| Domain | `src/domain/coverage.ts` | Motor de cobertura: pontos extraídos × seções do template → seções cobertas/pendentes + próxima pergunta (REQ-04) |
| Domain | `src/domain/extracted-point.ts` | Ponto extraído com âncora no trecho da transcrição; mover/editar/apagar (REQ-05) |
| Domain | `src/domain/transcript.ts` | Segmentos com `kind: draft \| final`, timestamps e `speaker?` (só em final); listar/renomear falantes com propagação (REQ-02/03/12) |
| Domain | `src/domain/artifacts/minutes-builder.ts` | Montagem determinística da ata (Markdown) a partir de tópicos/decisões/ações extraídos (REQ-06) |
| Domain | `src/domain/artifacts/requirements-builder.ts` | Montagem do `requirements.md` no template do kit, com Open Questions = seções não cobertas (REQ-07) |
| Repository | `src/db/repository/*.ts` + `src/db/migrations/` | `MeetingRepository`, `TranscriptRepository`, `PointRepository`, `ArtifactRepository`; exclusão em cascata (REQ-09/10) |
| Adapter | `src/adapters/provider-catalog.ts` | Catálogo de provedores por capacidade (STT lote / STT streaming / LLM) com capability flags (`supportsDiarization`); seleção do usuário (REQ-13, ADR-005) |
| Adapter | `src/adapters/stt/elevenlabs-scribe.ts` | `SttBatchProvider` ElevenLabs Scribe: upload m4a → segmentos com timestamps + falantes (REQ-03/12/13) |
| Adapter | `src/adapters/stt/openai-whisper.ts` | `SttBatchProvider` OpenAI (sem diarização — capability flag false, gera aviso US-10.3) (REQ-03/13) |
| Adapter | `src/adapters/llm/*.ts` | `LlmProvider` (OpenAI, Anthropic): `suggestQuestions()`, `extractPoints()`, `generateMinutes()` com instrução anti-alucinação (REQ-04/05/06/13) |
| Adapter | `src/adapters/secure-keys.ts` | Chaves via expo-secure-store, **uma por provedor** (REQ-11) |
| Service | `src/services/meeting-session-service.ts` | Orquestra sessão: gravação, STT ao vivo, extração periódica, encerramento → fila de refinamento (REQ-01..07) |
| Service | `src/services/recording-service.ts` | expo-audio: gravação em segmentos, background mode, recuperação pós-crash (REQ-01, NFR-01) |
| Service | `src/services/live-transcription-service.ts` | expo-speech-recognition com auto-restart de sessão; alimenta domain (REQ-02) |
| Service | `src/services/refinement-service.ts` | Fila offline-first: re-transcrição + geração de artefatos quando houver rede (REQ-03/06/07, NFR-06) |
| UI | `app/` (expo-router) | Home/histórico, nova reunião (tipo + consentimento), sessão (painel de condução), resultados/export com renomeação de falantes (REQ-04/05/09/10/12) |
| UI | `app/settings.tsx` | Configurações: seleção de provedor por capacidade + chave por provedor; aviso quando o STT escolhido não diariza (REQ-11/13, US-10.3) |

## Design

### States (UI)

| State | Behavior |
|---|---|
| Loading | Skeleton na home/histórico; spinner discreto no painel enquanto LLM responde |
| Empty | Home sem reuniões: CTA "Nova reunião"; painel sem pontos: mostra roteiro completo do tipo |
| Error | Falha de IA: banner não-bloqueante "modo somente gravação" (NFR-06); falha de gravação: alerta bloqueante |
| Success | Sessão: transcrição rolando + painel de cobertura; resultados: abas Ata / Requisitos / Transcrição |

### User Interaction Flow

1. Usuário cria reunião: título, tipo (requisitos/genérica), confirmação de consentimento dos participantes
2. Usuário inicia gravação; indicador permanente visível; rascunho ao vivo começa a rolar
3. A cada intervalo (~30s de fala nova), o serviço envia o delta da transcrição ao LLM → pontos extraídos entram nas seções; cobertura recalculada
4. Painel mostra seções pendentes; usuário toca numa seção → vê perguntas sugeridas; pode descartar/adiar
5. Usuário pode pausar/retomar; editar/mover/apagar pontos extraídos
6. Usuário encerra → sessão vai para "refinando": re-transcrição em lote + ata + requirements.md
7. Tela de resultados: revisar, editar, exportar via share sheet (Markdown)
8. Excluir reunião → confirmação → apaga áudio + transcrições + pontos + artefatos

### Edge Cases

- Sem rede na reunião: rascunho e extração local param no nível "roteiro estático de perguntas"; refinamento enfileirado (NFR-06)
- App morto durante gravação: segmentos de áudio já gravados preservados; ao reabrir, oferece retomar ou encerrar com o parcial (REQ-01)
- STT nativo indisponível (permissão negada / idioma sem modelo): sessão continua como somente-gravação, aviso claro
- Reunião > 2h ou disco cheio: aviso de espaço antes de iniciar; gravação em segmentos permite fechar o que já existe
- Chave de API ausente/inválida: fluxos de IA desativados com explicação e atalho para configurar (REQ-11)
- LLM retorna ponto sem âncora na transcrição: ponto descartado (anti-alucinação, risco da seção 13 dos requisitos)
- Provedor STT escolhido não suporta diarização: aviso na criação da reunião; artefatos saem sem falantes (US-10.3)
- Renomear falante após artefatos gerados: renomeação propaga (regeneração determinística dos builders) (REQ-12)
- Provedor fora do ar no refinamento: fila retenta; usuário pode trocar de provedor e reprocessar a mesma reunião (REQ-13)

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| STT nativo pt-BR fraco para guiar perguntas (A-02) | Med | High | Spike na Fatia D em aparelho real antes de polir UI; fallback streaming documentado em ADR-004 |
| Background audio quebrar gravações longas | Med | High | Spike NFR-01 (2h) em iOS e Android no início da Fatia D |
| Custo por reunião acima do aceitável | Low | Med | Uma passada de refinamento; exibir estimativa de custo por duração |
| Alucinação na ata | Med | High | Builders determinísticos sobre pontos ancorados; LLM nunca escreve a ata "livre" |

## Dependencies

- expo-audio, expo-speech-recognition, expo-sqlite, expo-secure-store, expo-router (dev client — C-02)
- Provedor STT lote e LLM com chave do usuário (REQ-11)

## Requirements Traceability

**Requirements:** [`requirements/002-assistente-reunioes/requirements.md`](../../requirements/002-assistente-reunioes/requirements.md)

| REQ ID | Requirement Summary | Priority | Acceptance Criteria |
|---|---|---|---|
| REQ-01 | Gravação com pausa/retomada, persistente | Must | ≥ 2h; background; recuperação pós-crash |
| REQ-02 | Rascunho ao vivo (STT nativo) | Must | ≤ 5s; offline; marcado como draft |
| REQ-03 | Re-transcrição refinada pós-reunião | Must | Artefatos finais usam somente `kind: final` |
| REQ-04 | Perguntas sugeridas + cobertura de seções | Must | Derivadas do template; seções pendentes sinalizadas; descartáveis |
| REQ-05 | Extração de pontos ao vivo com rastreio | Must | Ponto cita trecho de origem; editar/mover/apagar |
| REQ-06 | Ata completa da transcrição refinada | Must | Tópicos, decisões, pendências, ações |
| REQ-07 | requirements.md no template do kit | Must | Seções do template; Open Questions explícitas |
| REQ-08 | Tipos de reunião por template | Should | Requisitos + genérica; tipos são dados |
| REQ-09 | Histórico + export Markdown | Should | Busca; share sheet; nada sai sem ação do usuário |
| REQ-10 | Indicador de gravação + exclusão definitiva | Must | Indicador permanente; cascade delete |
| REQ-11 | Chaves de IA em SecureStore (por provedor) | Must | Keychain/Keystore; nunca em logs |
| REQ-12 | Diarização + renomear falantes | Must | Falantes em segmentos `final`; renomeação propaga a ata/requisitos; aviso se provedor não diariza |
| REQ-13 | Multi-provedor STT/LLM (ElevenLabs no MVP) | Must | Catálogo por capacidade; trocar provedor sem migração; ElevenLabs Scribe operacional |

## Tests

> **TDD:** Write these tests BEFORE implementation. Tests must fail (Red) before code exists.
> Ordem de implementação = Fatia A → E; cada fatia entra pelo ciclo Red → Green → Refactor.

### Test Cases

| ID | Test | Type | Description |
|---|---|---|---|
| TEST-01 | `meeting-session state machine` | unit | Transições válidas (idle→recording→paused→recording→ended→refining→done) e rejeição das inválidas (REQ-01) |
| TEST-02 | `session recovery from crash` | unit | Sessão restaurada de snapshot persistido retoma em paused com segmentos preservados (REQ-01) |
| TEST-03 | `transcript kinds` | unit | Segmentos draft não aparecem na base dos artefatos finais; final substitui draft (REQ-02/03) |
| TEST-04 | `coverage engine marks sections` | unit | Ponto classificado numa seção → seção coberta; seções sem pontos listadas como pendentes (REQ-04) |
| TEST-05 | `next questions come from template` | unit | Perguntas sugeridas pertencem ao roteiro do tipo; seções cobertas não geram sugestão (REQ-04/08) |
| TEST-06 | `extracted point anchoring` | unit | Ponto sem âncora válida na transcrição é rejeitado; mover/editar/apagar preservam âncora (REQ-05) |
| TEST-07 | `minutes builder completeness` | unit | Ata contém todo tópico/decisão/pendência/ação extraído; nada além deles (REQ-06) |
| TEST-08 | `requirements builder emits kit template` | unit | Saída tem as seções do template do kit; seções não cobertas viram Open Questions (REQ-07) |
| TEST-09 | `meeting type templates are data` | unit | Carregar template genérico e de requisitos sem alterar código do motor (REQ-08) |
| TEST-10 | `repositories CRUD + cascade delete` | integration | Excluir reunião remove transcrições, pontos e artefatos (REQ-09/10) |
| TEST-11 | `refinement queue offline-first` | integration | Sem rede: fila retém; com rede: processa; falha de adapter não afeta sessão (REQ-03, NFR-06) |
| TEST-12 | `adapters degrade gracefully` | integration | LlmAdapter com erro → serviço continua em modo somente-gravação; chave ausente → erro tipado (REQ-11, NFR-06) |
| TEST-13 | `history search filter` | unit | Filtro memoizado por título/data (REQ-09) |
| TEST-14 | `session screen states` | unit (RTL) | Loading/empty/error/success do painel de condução; indicador de gravação sempre visível (REQ-10, NFR-05) |
| TEST-15 | `speakers on final segments` | unit | `speaker` só em segmentos final; lista de falantes distintos derivada da transcrição refinada (REQ-12) |
| TEST-16 | `speaker rename propagates` | unit | Renomear falante atualiza todos os segmentos; artefatos regenerados refletem o novo nome (REQ-12) |
| TEST-17 | `provider catalog capabilities` | integration | Seleção por capacidade; provedor sem `supportsDiarization` sinaliza aviso; troca de provedor não invalida dados (REQ-13) |
| TEST-18 | `elevenlabs scribe adapter contract` | integration | Fixture de resposta Scribe → segmentos com timestamps e falantes; erro de API → erro tipado (REQ-03/12/13) |

### Test Files

| File | What It Covers |
|---|---|
| `src/domain/meeting-session.test.ts` | TEST-01, TEST-02 |
| `src/domain/transcript.test.ts` | TEST-03 |
| `src/domain/coverage.test.ts` | TEST-04, TEST-05 |
| `src/domain/extracted-point.test.ts` | TEST-06 |
| `src/domain/artifacts/minutes-builder.test.ts` | TEST-07 |
| `src/domain/artifacts/requirements-builder.test.ts` | TEST-08 |
| `src/domain/meeting-type.test.ts` | TEST-09 |
| `tests/integration/repositories.test.ts` | TEST-10 |
| `tests/integration/refinement-queue.test.ts` | TEST-11 |
| `tests/integration/adapters.test.ts` | TEST-12 |
| `src/services/history-filter.test.ts` | TEST-13 |
| `app/session.test.tsx` | TEST-14 |
| `src/domain/transcript.test.ts` (speakers) | TEST-15, TEST-16 |
| `tests/integration/provider-catalog.test.ts` | TEST-17 |
| `tests/integration/elevenlabs-scribe.test.ts` | TEST-18 |

---

## Validation Checklist

- [ ] Tests written BEFORE implementation (Red phase)
- [ ] All tests passing (Green phase)
- [ ] Code refactored without breaking tests (Refactor phase)
- [ ] Coverage meets threshold (`.specs/config.md## Defaults`)
- [ ] Requirements met
- [ ] States handled (loading, empty, error, success)
- [ ] Edge cases tested
- [ ] No regression in related features
- [ ] Code follows conventions

## Notes

- **Progresso (2026-07-03):** Fatia A implementada via TDD — TEST-01..09 escritos primeiro (Red),
  domínio implementado (Green), 45 testes passando, cobertura ≥ 90%. Fatias B–E pendentes.
- **Revisão do stakeholder (2026-07-03):** multi-provedor com ElevenLabs (REQ-13, ADR-005),
  diarização Must (REQ-12, amendment ADR-004), Android primeiro (C-05), chaves por provedor (REQ-11).
  Suporte a `speaker` no domínio adicionado via TDD (TEST-15/16). Nome "Escriba" conflitado — ver
  Naming research nos requisitos; aguardando escolha do stakeholder.
- ADR-003 (stack) e ADR-004 (transcrição híbrida) em `.specs/memory/architecture.md` fundamentam as
  fatias C/D.
- NFR-01/NFR-08 (2h de gravação, bateria) exigem validação em aparelho físico — marcar como spikes da
  Fatia D; não são automatizáveis no CI.
- Decisões pendentes do stakeholder (nome do app, provedores padrão, plataforma do primeiro build,
  diarização) listadas em Open Questions dos requisitos — não bloqueiam as Fatias A/B.
