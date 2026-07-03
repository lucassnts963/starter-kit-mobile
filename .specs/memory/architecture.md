# Architectural Decision Records

## ADR-001: Spec-Driven Development

- **Date:** 2026-07-03
- **Status:** Accepted

**Context:** Without structured planning, scope creep and inconsistent implementation are risks. Complex projects need traceable decisions.

**Decision:** All changes (features, migrations, bugfixes) must go through a spec document in `.specs/changes/` before implementation. Specs follow templates in `.specs/templates/`. Completed specs are archived.

**Consequences:**
- Slightly slower start for small changes
- Better traceability and documentation
- Architectural decisions captured here
- Entity mapping stays current in `shared/`

---

## ADR-002: Test-Driven Development

- **Date:** 2026-07-03
- **Status:** Accepted

**Context:** Without tests written first, implementations drift from requirements. Bugs are discovered late. Refactoring becomes risky without a safety net.

**Decision:** All code changes follow TDD: tests are written BEFORE implementation, using the spec's requirements as the source of truth for test cases. The TDD cycle (Red → Green → Refactor) is integrated into the spec workflow: Spec → Write Tests → Implement → Refactor → Validate → Archive.

**Consequences:**
- Slightly longer initial development time (offset by fewer regressions)
- Every spec must include a `## Tests` section defining test cases
- Bugfix specs must include a regression test that reproduces the bug first
- Code without tests is considered incomplete
- Refactoring is safer with comprehensive test coverage
- Agents following this project MUST write tests before implementation code

---

## ADR-003: Technology Stack

- **Date:** 2026-07-03
- **Status:** Accepted

**Context:** O Escriba é um app mobile que precisa de: acesso ao microfone com gravação longa (1h+),
funcionamento offline-first (reuniões acontecem em salas sem rede confiável), integração com serviços
de IA (transcrição e LLM) e iteração rápida por um time de uma pessoa auxiliado por agentes.

**Decision:**
- Shell: MOBILE — React Native via **Expo** (dev client / EAS quando módulos nativos forem necessários)
- Frontend: REACT — React Native + TypeScript, expo-router
- Backend: NONE — local-first; STT e LLM consumidos direto do app via **Adapters** (chave do usuário);
  um backend próprio (ex.: Supabase Edge Functions) fica como evolução futura para esconder chaves e sincronizar
- Database: SQLITE — expo-sqlite (dados 100% locais no MVP)
- Package Manager: npm
- Testing: JEST (jest-expo; domain core puro em Node) — coverage: valor em `.specs/config.md## Defaults`

**Alternatives considered (registrado a pedido do stakeholder, 2026-07-03):**

| Alternativa | Prós | Por que não |
|---|---|---|
| **Flutter (Dart)** | Excelente performance de UI; bom ecossistema de áudio (`record`, `speech_to_text`); binário único | Introduz uma segunda linguagem no ecossistema do time (todo o tooling do starter-kit — scripts, skills, convenções — é TypeScript/Node). O núcleo de domínio em Dart não seria compartilhável com um futuro backend/web em TS. TDD em Dart é bom, mas o time e os agentes têm proficiência e convenções maduras em TS/Jest. Ganho de performance é irrelevante para este app (UI simples; o custo real está em áudio/rede, que é nativo nos dois casos) |
| **Nativo (Kotlin + Swift)** | Controle máximo de áudio em background, foreground service, SpeechRecognizer/SFSpeechRecognizer sem ponte | Duas bases de código para um time de uma pessoa = dobro de spec/TDD/manutenção. O acesso nativo necessário (gravação, STT do sistema) já existe empacotado em módulos Expo mantidos (`expo-audio`, `expo-speech-recognition`); se faltar algo, o Expo dev client permite escrever módulo nativo pontual sem sair da stack |
| **Kotlin Multiplatform** | Domínio compartilhado entre plataformas | Ecossistema ainda mais distante do kit; UI ainda teria de ser feita por plataforma (ou Compose MP, menos maduro em iOS); curva alta para ganho pequeno num MVP |

Critério decisivo: **um time de uma pessoa guiado por agentes entrega mais rápido na stack em que o
kit, as convenções e os agentes já operam (TypeScript)**, com o domínio 100% puro e testável em Node
— e o risco nativo (áudio em background, STT) fica isolado em módulos Expo com fallback para módulo
nativo pontual via dev client. A decisão é revisável: se os spikes da Fatia D provarem limitação real
de RN/Expo em gravação longa + STT simultâneo no Android, um novo ADR reavalia (a camada de domínio
é portável por design).

**Consequences:**
- Tooling and conventions will follow this stack
- All ADRs and specs must align with these choices
- Expo acelera o desenvolvimento, mas gravação em background + STT nativo em tempo real podem exigir
  dev client (expo-dev-client) em vez do Expo Go — assumido desde já
- Sem backend próprio, as chaves de API ficam no dispositivo (SecureStore); aceitável para uso pessoal,
  reavaliar antes de distribuir publicamente
- Primeiros builds e spikes rodam em **Android** (decisão do stakeholder — C-05 dos requisitos 002)

---

## ADR-004: Estratégia de transcrição — híbrida (rascunho ao vivo + refinamento em lote)

- **Date:** 2026-07-03
- **Status:** Proposed

**Context:** O produto precisa de (a) transcrição em tempo real para alimentar as sugestões de
perguntas durante a reunião e (b) uma ata final "sem deixar passar nada". Nenhuma opção única atende
os dois: STT nativo do dispositivo é em tempo real, grátis e offline, mas menos preciso; APIs de
streaming (Deepgram, AssemblyAI, OpenAI Realtime, Google STT) são precisas mas custam por minuto e
exigem rede estável a reunião inteira; Whisper em lote é o mais preciso, mas só depois do áudio pronto.

**Decision:** Estratégia **híbrida em duas passadas**:
1. **Ao vivo:** reconhecimento de fala nativo (`expo-speech-recognition` — iOS SFSpeechRecognizer /
   Android SpeechRecognizer, ambos com suporte a pt-BR) gera um rascunho em tempo real, suficiente
   para o motor de perguntas e para o usuário acompanhar. Funciona offline e sem custo.
2. **Pós-reunião:** o áudio gravado completo (m4a) é transcrito em lote por um provedor de alta
   qualidade via `SttAdapter` (Whisper/OpenAI ou compatível), com diarização quando disponível. A ata
   e o documento de requisitos finais usam SEMPRE a transcrição refinada.

**Consequences:**
- A reunião nunca depende de rede: sem conexão, o rascunho ao vivo local continua e o refinamento roda depois
- O motor de perguntas trabalha com texto imperfeito — deve ser tolerante a erros de STT
- Dois formatos de transcrição (draft/final) precisam ser modelados desde o início (`Transcript.kind`)
- Custo de API concentrado numa única chamada em lote por reunião, previsível
- Validação pendente marcada em REQ (A-02): qualidade do STT nativo pt-BR em fala de reunião real

**Amendment (2026-07-03) — diarização é Must (REQ-12):** o STT nativo ao vivo não identifica
falantes; a diarização acontece na passada de refinamento, pelo provedor de lote (ElevenLabs Scribe
diariza até 48 falantes, pt com WER excelente). Consequências: falantes existem apenas em segmentos
`final` (o domínio modela `speaker` opcional); o rascunho ao vivo permanece sem falantes; provedores
de lote sem diarização geram aviso ao usuário (US-10). O ElevenLabs também oferece Scribe Realtime
(streaming, ~150ms) — fica registrado como upgrade opcional do rascunho ao vivo quando houver rede,
sem alterar a arquitetura híbrida.

---

## ADR-005: Multi-provedor de IA via Adapters, com chaves do usuário

- **Date:** 2026-07-03
- **Status:** Accepted

**Context:** Decisão do stakeholder (2026-07-03): o app deve ser multi-provedor — o usuário escolhe
qual serviço de STT/LLM usar, com destaque para ElevenLabs disponível desde o MVP — e cada usuário
usa as próprias chaves de API. Provedores de IA mudam de preço/qualidade rápido; lock-in é risco.

**Decision:** As capacidades de IA são definidas por **interfaces de domínio de provedor**, com
implementações plugáveis registradas num catálogo:

- `SttBatchProvider` — `transcribe(audio, opts) → segmentos com timestamps + speaker?`; capability
  flag `supportsDiarization`. MVP: **ElevenLabs Scribe** (diarização) e OpenAI (Whisper, sem
  diarização — com aviso).
- `SttStreamProvider` (opcional, pós-MVP) — rascunho ao vivo via streaming; MVP usa STT nativo.
- `LlmProvider` — `suggestQuestions / extractPoints / summarize`; MVP: OpenAI e Anthropic.

Seleção de provedor por capacidade fica em configurações (persistida em SQLite); chaves ficam **uma
por provedor** no SecureStore (REQ-11). Nenhum código fora de `src/adapters/` conhece HTTP/SDKs de
provedor.

**Consequences:**
- Adicionar provedor = nova classe adapter + registro no catálogo; zero mudança em domínio/serviços
- Testes de serviço usam provedores fake; contratos dos adapters testados com fixtures por provedor
- Capability flags (ex.: `supportsDiarization`) permitem avisar o usuário na escolha (US-10.3)
- Custo: manter N integrações; mitigado começando com 2 STT + 2 LLM e contrato estreito

**Amendment (2026-07-03) — provedores gratuitos/baratos via API Chat Completions compatível:**
DeepSeek, OpenRouter (agregador, tem modelos `:free`) e NVIDIA NIM (build.nvidia.com, free tier)
usam o mesmo formato de requisição/resposta que a Chat Completions API da OpenAI — em vez de 3
classes quase idênticas a `OpenAiLlmProvider`, um único `OpenAiCompatibleLlmProvider` parametrizado
por `{id, baseUrl, model}` cobre os três (reuso, não duplicação — `src/adapters/llm/
openai-compatible-llm.ts`). Mesma lógica no lado STT: Groq hospeda Whisper large-v3 no formato
`/audio/transcriptions` da OpenAI, coberto por `OpenAiCompatibleWhisperProvider`. `OpenAiLlmProvider`/
`OpenAiWhisperProvider` originais ficam intocados (evita risco em código já testado); os novos
provedores só entram no catálogo (`provider-catalog.ts`), sem tocar domínio/serviços — consistente
com a decisão original. Objetivo: dar ao usuário caminhos de custo zero/muito baixo sem remover as
opções pagas (OpenAI/Anthropic/ElevenLabs continuam disponíveis e como padrão).

**LLM/STT local (on-device) — avaliado, não implementado:** tecnicamente possível (ex.
`llama.rn`/`react-native-executorch` para LLM, `whisper.rn`/whisper.cpp para STT), mas com riscos
altos para este app: (1) modelos pequenos o bastante pra rodar num aparelho médio (ex. Moto G15) têm
qualidade de extração estruturada pt-BR muito inferior aos modelos hospedados — arriscando o
requisito central de anti-alucinação/âncora literal (REQ-05); (2) exige módulo nativo + download de
modelo (1-4GB) sob demanda, escopo grande de build/infra; (3) roda em concorrência com a gravação/STT
nativo no mesmo aparelho, risco pra bateria/desempenho (NFR-08). Recomendação: não implementar agora;
se o custo de API virar bloqueador real, tratar como spike separado (medir qualidade de extração de
um modelo pequeno on-device contra os testes de anti-alucinação existentes antes de decidir).
