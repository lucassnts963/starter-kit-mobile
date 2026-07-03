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

**Consequences:**
- Tooling and conventions will follow this stack
- All ADRs and specs must align with these choices
- Expo acelera o desenvolvimento, mas gravação em background + STT nativo em tempo real podem exigir
  dev client (expo-dev-client) em vez do Expo Go — assumido desde já
- Sem backend próprio, as chaves de API ficam no dispositivo (SecureStore); aceitável para uso pessoal,
  reavaliar antes de distribuir publicamente

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
