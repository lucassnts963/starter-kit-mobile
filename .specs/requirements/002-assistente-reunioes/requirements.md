# Requirements Specification

| Field | Value |
|---|---|
| **ID** | REQ-002 |
| **Status** | review |
| **Author** | Lucas Santos (elicitação conduzida por agente) |
| **Created** | 2026-07-03 |
| **Stakeholders** | Lucas Santos (PO/dev), participantes de reuniões, clientes entrevistados |

---

## 1. Problem Statement

### Current Situation

O levantamento de requisitos com clientes acontece em reuniões ao vivo. Quem conduz precisa, ao mesmo
tempo, entrevistar, anotar, garantir que nenhum ponto fique em aberto e depois transformar as
anotações em ata e em um `requirements.md` estruturado (metodologia starter-kit). Na prática, pontos
se perdem, perguntas importantes deixam de ser feitas e a escrita do documento é retrabalho manual
horas depois, quando o contexto já esfriou.

### Why This Matters

- Requisitos perdidos ou ambíguos viram retrabalho de desenvolvimento e novas reuniões com o cliente.
- Questões em aberto não detectadas na hora custam dias de ida-e-volta.
- A ata manual é lenta, incompleta e desmotiva o registro — memória que não é escrita é re-derivada.

### Success Definition

Ao encerrar a reunião, a ata e o rascunho do documento de requisitos estão prontos, sem edição manual
pesada, e as questões em aberto foram sinalizadas **durante** a reunião, enquanto o cliente ainda
estava presente.

| Metric | Current | Target |
|---|---|---|
| Tempo entre fim da reunião e ata pronta | horas/dias | < 10 min |
| Tempo para `requirements.md` inicial | horas | < 30 min (revisão sobre rascunho gerado) |
| Questões em aberto detectadas só depois da reunião | frequentes | sinalizadas ao vivo durante a reunião |
| Pontos da reunião ausentes da ata | desconhecido/frequente | 0 (ata gerada da transcrição integral) |

---

## 2. Stakeholder Map

| Stakeholder | Role | Interest | Influence (High/Med/Low) | Key Concern |
|---|---|---|---|---|
| Lucas Santos | Condutor da reunião / PO / dev | Conduzir bem a entrevista e sair com ata + requisitos prontos | High | Não deixar questões em aberto; zero retrabalho |
| Cliente / entrevistado | Fonte dos requisitos | Ser entendido; ver requisitos refletidos fielmente | Med | Privacidade da gravação; consentimento |
| Participantes de outras reuniões | Usuários futuros (planning, retro, 1:1) | Ata fiel de qualquer tipo de reunião | Low | App flexível, não amarrado a requisitos |
| Time de desenvolvimento | Consumidor do requirements.md | Documento no formato da metodologia starter-kit | Med | Compatibilidade com `.specs/requirements/` |

---

## 3. Methodology

**Hybrid:** User Stories (funcionalidades) + BDD (fluxos críticos da sessão de reunião).

---

## 4. Requirements

### 4.1 User Stories

| ID | Story | Acceptance Criteria |
|---|---|---|
| US-01 | Como condutor, quero gravar o áudio da reunião (iniciar/pausar/retomar/encerrar), para ter o registro integral sem depender de anotações | 1. Gravação contínua ≥ 2h sem perda 2. Continua com app em background/tela bloqueada 3. Áudio persistido localmente mesmo se o app for morto (recuperação de sessão) |
| US-02 | Como condutor, quero ver a transcrição ao vivo (rascunho) enquanto a reunião acontece, para acompanhar o que foi capturado | 1. Texto aparece com atraso ≤ 5s 2. Funciona offline (STT nativo do aparelho) 3. Rascunho claramente marcado como não-final |
| US-03 | Como condutor, quero que o app sugira perguntas em tempo real, guiadas pela metodologia do starter-kit, para não deixar questões em aberto | 1. Sugestões derivadas das seções do template de requisitos (problema, stakeholders, NFRs, restrições, escopo, riscos) 2. Sinaliza seções ainda não cobertas na conversa 3. Sugestões descartáveis/adiáveis sem interromper a gravação |
| US-04 | Como condutor, quero que os pontos principais sejam extraídos durante a reunião e organizados nas seções do documento de requisitos, para ver o `requirements.md` sendo construído ao vivo | 1. Painel mostra seções do template com o que já foi capturado 2. Pontos extraídos citam o trecho da transcrição de origem 3. Posso corrigir/mover/apagar um ponto extraído durante a reunião |
| US-05 | Como condutor, ao encerrar a reunião quero receber a ata completa (sem deixar passar nada) e o `requirements.md` estruturado, para revisar e usar imediatamente | 1. Áudio integral re-transcrito em alta qualidade (pós-processamento) 2. Ata gerada da transcrição refinada cobre todos os tópicos, decisões, pendências e ações 3. `requirements.md` segue o template `.specs/templates/requirements-spec.md` do starter-kit 4. Questões em aberto viram seção explícita (Open Questions) |
| US-06 | Como usuário, quero escolher o tipo de reunião (levantamento de requisitos, genérica; depois: planning, retro, 1:1), para que perguntas, extração e ata se adaptem ao contexto | 1. Tipo escolhido ao criar a reunião 2. Cada tipo define template de saída e roteiro de perguntas 3. Tipos são dados (templates), não código — adicionar tipo não exige rebuild |
| US-07 | Como usuário, quero ver o histórico de reuniões e exportar/compartilhar ata, transcrição e requirements.md (Markdown), para levar o resultado ao repositório do projeto | 1. Lista com busca por título/data 2. Exportação via share sheet do sistema em Markdown 3. Nada é enviado a terceiros sem ação explícita do usuário |
| US-08 | Como entrevistado, quero que a gravação seja explícita e local, para confiar no processo | 1. Indicador visível de gravação ativa 2. Áudio e transcrições armazenados apenas no dispositivo 3. Exclusão definitiva de uma reunião apaga áudio + transcrições + derivados |

### 4.4 BDD Scenarios

```gherkin
Feature: Sessão de reunião de levantamento de requisitos
  Como condutor
  Quero uma sessão que grava, transcreve e me guia
  Para sair da reunião com ata e requisitos prontos

  Scenario: Fluxo feliz de uma reunião de requisitos
    Given uma reunião criada com o tipo "levantamento de requisitos"
    When inicio a gravação e a conversa acontece
    Then vejo a transcrição-rascunho ao vivo
    And o painel de seções mostra o que já foi coberto (problema, stakeholders, ...)
    And recebo sugestões de perguntas para as seções ainda vazias
    When encerro a reunião
    Then o áudio integral é re-transcrito em alta qualidade
    And recebo a ata e o requirements.md estruturado para revisão

  Scenario: Reunião sem conexão de rede
    Given uma reunião em andamento sem internet
    When a conversa acontece
    Then a gravação e o rascunho ao vivo continuam funcionando (STT nativo)
    And o refinamento pós-reunião fica enfileirado
    When a conexão volta
    Then o refinamento roda e a ata final é gerada

  Scenario: Seção do levantamento ficou descoberta
    Given uma reunião de requisitos em andamento
    And nenhuma fala cobriu "restrições" até agora
    When consulto o painel de condução
    Then "Restrições" aparece como não coberta
    And há pelo menos uma pergunta sugerida para essa seção

  Scenario: App interrompido no meio da gravação
    Given uma gravação em andamento
    When o sistema mata o app ou o telefone reinicia
    Then ao reabrir, o áudio já capturado está preservado
    And posso retomar a sessão ou encerrá-la gerando os artefatos do que foi gravado
```

---

## 5. Functional Requirements

| ID | Description | Source | Priority (MoSCoW) |
|---|---|---|---|
| REQ-01 | O sistema deve gravar áudio de reunião com iniciar/pausar/retomar/encerrar, persistindo localmente e sobrevivendo a background e morte do app | US-01 | Must |
| REQ-02 | O sistema deve exibir transcrição-rascunho em tempo real usando STT nativo do dispositivo (offline, pt-BR) | US-02 | Must |
| REQ-03 | O sistema deve re-transcrever o áudio integral pós-reunião com provedor de alta qualidade via adapter, e usar essa versão para os artefatos finais | US-05 | Must |
| REQ-04 | O sistema deve sugerir perguntas em tempo real com base no roteiro do tipo de reunião (para requisitos: seções do template do starter-kit), sinalizando seções não cobertas | US-03 | Must |
| REQ-05 | O sistema deve extrair pontos principais ao vivo e organizá-los nas seções do documento-alvo, com rastreio ao trecho de origem e edição manual | US-04 | Must |
| REQ-06 | Ao encerrar, o sistema deve gerar a ata completa (tópicos, decisões, pendências, ações) a partir da transcrição refinada | US-05 | Must |
| REQ-07 | Ao encerrar uma reunião de requisitos, o sistema deve gerar `requirements.md` no formato do template do starter-kit, com Open Questions explícitas | US-05 | Must |
| REQ-08 | O sistema deve suportar tipos de reunião configuráveis por template (roteiro de perguntas + formato de saída), com ao menos "levantamento de requisitos" e "genérica" no MVP | US-06 | Should |
| REQ-09 | O sistema deve manter histórico local de reuniões com busca e exportação/compartilhamento em Markdown | US-07 | Should |
| REQ-10 | O sistema deve indicar gravação ativa de forma visível e permitir exclusão definitiva de todos os dados de uma reunião | US-08 | Must |
| REQ-11 | O sistema deve permitir configurar as chaves dos provedores de IA (STT/LLM) em armazenamento seguro do dispositivo | US-05, US-03 | Must |

---

## 6. Non-Functional Requirements

| ID | Category | Description | Measurement |
|---|---|---|---|
| NFR-01 | Performance | Gravação estável por ≥ 2h com rascunho ao vivo ativo | Teste de sessão longa em aparelho real, sem crash/perda |
| NFR-02 | Performance | Latência do rascunho ao vivo ≤ 5s; sugestões de pergunta ≤ 15s após o trecho relevante | Medição instrumentada em sessão de teste |
| NFR-03 | Privacidade | Áudio e transcrições permanecem no dispositivo; envio a APIs externas só com consentimento configurado e por adapter explícito | Revisão de código: nenhuma chamada de rede fora de `src/adapters/` |
| NFR-04 | Segurança | Chaves de API em SecureStore (Keychain/Keystore), nunca em texto plano ou logs | Auditoria de código + teste |
| NFR-05 | Usabilidade | Operação com uma mão durante a reunião: ações principais alcançáveis, sugestões não bloqueiam a tela | Revisão heurística nas telas da sessão |
| NFR-06 | Confiabilidade | Falha de rede ou de provedor de IA nunca interrompe a gravação; degradação graciosa para modo somente-gravação | Testes com adapters mockados falhando |
| NFR-07 | Idioma | Transcrição, perguntas e artefatos em pt-BR no MVP (arquitetura preparada para outros idiomas) | Sessões de teste em pt-BR |
| NFR-08 | Consumo | Sessão de 1h consome bateria de forma aceitável (alvo: < 20%) | Medição em aparelho real |

---

## 7. Constraints

| ID | Constraint | Type | Impact |
|---|---|---|---|
| C-01 | Stack fixada pelo ADR-003: Expo/React Native + TypeScript, expo-sqlite, sem backend próprio no MVP | Technical | STT/LLM chamados direto do app; chaves no aparelho |
| C-02 | STT nativo ao vivo e gravação simultâneos exigem módulos nativos (expo-dev-client); Expo Go não basta | Technical | Build de desenvolvimento via EAS/dev client |
| C-03 | Time de uma pessoa + agentes; metodologia starter-kit obrigatória (spec + TDD) | Timeline | Escopo do MVP precisa ser enxuto e incremental |
| C-04 | Legislação de gravação de conversas (LGPD; consentimento dos participantes) | Regulatory | Indicador de gravação + fluxo de consentimento na criação da reunião |

---

## 8. Assumptions

| ID | Assumption | Validation Needed? | Risk if Wrong |
|---|---|---|---|
| A-01 | Uma única fonte de áudio (celular na mesa / alto-falante) capta a reunião com qualidade suficiente | Yes | Ata incompleta; exigiria captação externa/por participante |
| A-02 | STT nativo pt-BR gera rascunho bom o bastante para guiar perguntas ao vivo | Yes (spike REQ-02) | Rascunho ao vivo teria de usar API de streaming paga (rede obrigatória) |
| A-03 | LLM com o template do starter-kit gera perguntas e extração úteis a partir de transcrição imperfeita | Yes (spike com transcrições reais) | Motor de perguntas precisaria de heurísticas locais adicionais |
| A-04 | Usuário aceita configurar a própria chave de API no MVP | No (é o próprio PO) | Precisaria de backend proxy antes de distribuir |
| A-05 | Reuniões majoritariamente presenciais ou com áudio audível pelo microfone do celular | Yes | Integração com apps de call (gravação de sistema) ficaria Must, e é limitada em mobile |

---

## 9. Out of Scope

- Backend próprio, contas de usuário, sincronização entre dispositivos (evolução futura)
- Gravação de chamadas de dentro de outros apps (Meet/Zoom/Teams) — só áudio ambiente no MVP
- Diarização perfeita por participante (best-effort se o provedor oferecer; não é critério de aceite)
- Edição colaborativa/multiusuário da ata
- Tradução e reuniões em idiomas diferentes de pt-BR
- Envio automático do `requirements.md` para um repositório Git (export manual via share sheet no MVP)

---

## 10. MoSCoW Prioritization

| Priority | Requirements | Rationale |
|---|---|---|
| **Must have** | REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-10, REQ-11 | O produto é a sessão guiada: gravar + rascunho ao vivo + perguntas + extração + artefatos finais; privacidade e chaves são pré-condição |
| **Should have** | REQ-08, REQ-09 | Flexibilidade de tipos e histórico agregam muito, mas uma reunião única já entrega valor |
| **Could have** | — | Diarização best-effort, temas/i18n |
| **Won't have (now)** | — | Itens da seção 9 (backend, calls, multiusuário) |

---

## 11. Dependencies

| Dependency | Type | Status | Impact if Unavailable |
|---|---|---|---|
| expo-av / expo-audio (gravação) | Third-party | Available | Sem gravação — inviabiliza o produto |
| expo-speech-recognition (STT nativo ao vivo) | Third-party | Available (validar em dev client) | Sem rascunho ao vivo; cai para streaming pago (A-02) |
| Provedor STT em lote (Whisper/OpenAI ou compatível) | Third-party | Available (requer chave) | Ata final degrada para o rascunho nativo |
| Provedor LLM (perguntas, extração, ata, requirements.md) | Third-party | Available (requer chave) | REQ-04..07 inoperantes — só gravação+transcrição |
| Template `requirements-spec.md` do starter-kit | Internal | Available | Saída perderia o formato da metodologia |

---

## 12. Domain Glossary

| Term | Definition | Context |
|---|---|---|
| Sessão | Uma reunião em andamento no app (gravação + transcrição + painel de condução) | Núcleo do domínio |
| Rascunho ao vivo | Transcrição em tempo real via STT nativo, não-final | Durante a sessão |
| Transcrição refinada | Re-transcrição do áudio integral em alta qualidade, pós-reunião | Base da ata e do requirements.md |
| Ata | Documento final da reunião: tópicos, decisões, pendências, ações | Saída de qualquer tipo de reunião |
| Painel de condução | Tela que mostra seções cobertas/não cobertas e perguntas sugeridas | Durante a sessão |
| Tipo de reunião | Template que define roteiro de perguntas + formato de saída | Flexibilidade (REQ-08) |
| Ponto extraído | Trecho relevante identificado e classificado numa seção do documento-alvo | Construção ao vivo do requirements.md |

---

## 13. Risks & Mitigations

| Risk | Likelihood (Low/Med/High) | Impact (Low/Med/High) | Mitigation |
|---|---|---|---|
| STT nativo pt-BR insuficiente para guiar o motor de perguntas (A-02) | Med | High | Spike cedo em aparelho real; fallback: streaming API quando houver rede |
| Restrições de áudio em background (iOS/Android) quebrarem gravações longas | Med | High | Spike de gravação 2h em ambas as plataformas; usar modos de áudio corretos + foreground service |
| Custo por reunião (STT lote + LLM) acima do aceitável | Low | Med | Uma passada de refinamento por reunião; estimar custo por hora de áudio e exibir ao usuário |
| Sugestões de pergunta irrelevantes viram ruído e o condutor ignora o painel | Med | Med | Roteiro ancorado no template (determinístico) + LLM só para reformular/contextualizar; feedback de descarte |
| Gravar sem consentimento gerar problema legal/relacional (C-04) | Low | High | Aviso e registro de consentimento no início da sessão; indicador permanente |
| LLM "inventar" conteúdo na ata (alucinação) | Med | High | Ata cita trechos da transcrição; instrução de não inferir; revisão humana como etapa do fluxo |

---

## 14. Traceability Matrix

| REQ ID | Source (US/UC/JS) | Requirement Summary | Priority | Implementation Spec | Test ID |
|---|---|---|---|---|---|
| REQ-01 | US-01 | Gravação com pausa/retomada, persistente | Must | changes/002-assistente-reunioes/ | — |
| REQ-02 | US-02 | Rascunho de transcrição ao vivo (STT nativo) | Must | changes/002-assistente-reunioes/ | — |
| REQ-03 | US-05 | Re-transcrição refinada pós-reunião | Must | changes/002-assistente-reunioes/ | — |
| REQ-04 | US-03 | Perguntas sugeridas + cobertura de seções | Must | changes/002-assistente-reunioes/ | — |
| REQ-05 | US-04 | Extração de pontos ao vivo com rastreio | Must | changes/002-assistente-reunioes/ | — |
| REQ-06 | US-05 | Ata completa da transcrição refinada | Must | changes/002-assistente-reunioes/ | — |
| REQ-07 | US-05 | requirements.md no template do starter-kit | Must | changes/002-assistente-reunioes/ | — |
| REQ-08 | US-06 | Tipos de reunião por template | Should | changes/002-assistente-reunioes/ | — |
| REQ-09 | US-07 | Histórico + export Markdown | Should | changes/002-assistente-reunioes/ | — |
| REQ-10 | US-08 | Indicador de gravação + exclusão definitiva | Must | changes/002-assistente-reunioes/ | — |
| REQ-11 | US-03, US-05 | Chaves de IA em armazenamento seguro | Must | changes/002-assistente-reunioes/ | — |

---

## 15. Appendix

### Research & References

**Análise: transcrição em tempo real é viável?** (pedido explícito do stakeholder)

| Opção | Tempo real | Offline | Custo | Qualidade pt-BR | Observações |
|---|---|---|---|---|---|
| STT nativo (iOS SFSpeechRecognizer / Android SpeechRecognizer via `expo-speech-recognition`) | Sim | Sim (modelos on-device) | Zero | Média | Limites de sessão contínua (iOS ~1 min por request — exige reinício automático de sessão); suficiente para rascunho |
| API de streaming (Deepgram, AssemblyAI, Google STT, OpenAI Realtime) | Sim | Não | $ por minuto, a reunião toda | Alta | Exige rede estável durante toda a reunião; websocket + áudio em chunks |
| Whisper on-device (whisper.cpp/RN) | Quase (chunks de ~5-30s) | Sim | Zero | Alta (modelos small+) | Custo de bateria/CPU alto em celular; binário grande; risco em aparelhos modestos |
| Lote pós-reunião (Whisper API ou similar) | Não | Não (só no refinamento) | $ único por reunião | Máxima | Não ajuda durante a reunião; perfeito para a ata final |

**Conclusão registrada em ADR-004 (architecture.md):** híbrido — rascunho ao vivo com STT nativo
(grátis, offline, qualidade média é aceitável para guiar perguntas) + re-transcrição integral em lote
pós-reunião para ata e requirements.md ("sem deixar passar nada"). APIs de streaming ficam como
fallback/upgrade opcional quando houver rede e o usuário quiser rascunho melhor.

**Fonte das perguntas guiadas:** o roteiro do tipo "levantamento de requisitos" espelha as seções do
template `.specs/templates/requirements-spec.md` e os passos da skill `gather-requirements` do
starter-kit: problema → custo da inação → definição de sucesso → stakeholders → requisitos
funcionais → NFRs → restrições → premissas → fora de escopo → prioridades → riscos. Cobertura de
seção = pergunta respondida; seção vazia = pergunta sugerida.

### Interview Notes

- Elicitação feita a partir do briefing do stakeholder (mensagem de 2026-07-03): gravar reunião,
  transcrever, ata sem deixar passar nada, analisar transcrição em tempo real, perguntas guiadas pela
  metodologia para evitar questões em aberto, construção incremental do requirements.md, flexível
  para outros tipos de reunião, aberto a nomes, dogfooding da metodologia.

### Open Questions

- [ ] Nome do app: proposta **Escriba**; alternativas: Pauta, Minuta, Relator, Ata Viva — decisão do stakeholder
- [ ] Provedores padrão de STT em lote e LLM (OpenAI? Anthropic para LLM? multi-provedor desde o MVP?)
- [ ] Plataforma-alvo do primeiro build de teste: Android, iOS ou ambos?
- [ ] A ata precisa identificar falantes (diarização) já no MVP ou "best-effort" basta?
- [ ] Reuniões remotas (som saindo do notebook): captar pelo microfone do celular é aceitável no MVP? (A-05)

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
