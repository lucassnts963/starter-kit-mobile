# Troubleshooting Memory

> Living memory of errors hit in this project and the strategies that fixed them. Before debugging
> something that feels familiar, search here first. After resolving a non-trivial problem, record it
> here so the next agent (or you, in three months) does not re-derive the fix from scratch.

This file is the failure-mode counterpart of `component-catalog.md`:

| Catalog | Troubleshooting |
|---|---|
| "solutions we built → **reuse**, don't recreate" | "failures we solved → **don't re-debug** from zero" |

It is a *compiled* memory page (in the sense of Karpathy's LLM-Wiki: compile durable knowledge out of
transient incidents), not an incident log. A `bugfix-spec.md` captures the **event** (reproduction,
root cause, regression test) and is archived per incident; this file captures the **distilled,
cross-incident lesson** and links back to that spec or commit.

---

## Usage Rules

| Rule | Description |
|---|---|
| **Search before you debug** | Before investigating an error, grep this file for the symptom. If it is here, start from the recorded fix strategy. |
| **Record after you resolve** | After fixing a non-trivial problem (anything that cost real investigation), add an entry. Use the `record-troubleshooting` skill to keep the format consistent. |
| **Compile, don't dump** | Write the distilled lesson, not the raw debugging transcript. Symptom → cause → what worked → how to prevent it. |
| **Link to the source** | Reference the related spec (`FIX-NN`), commit, or PR so the full incident context stays reachable. |
| **Keep it current** | If a later change makes an entry obsolete (the underlying cause is gone), mark it `Status: resolved-permanently` or remove it. Stale entries are worse than none. |

---

## Entry Format

Each entry is a `TRB-<n>` heading (sequential id, project-wide) with these fields:

```markdown
## TRB-NNN: <short symptom>

- **Date:** YYYY-MM-DD · **Related:** FIX-012, commit abc123, PR #45 · **Status:** resolved

**Symptom:** What you observe — exact error message, stack trace excerpt, or wrong behavior.
**Context:** Stack / environment / condition under which it appears (OS, version, config, data shape).
**Root cause:** The underlying reason, once understood.
**Fix strategy:** What resolved it — and, just as important, what did **not** work (dead ends save time).
**Prevention:** How to avoid it next time, or the early signal that it is happening again.
```

Required fields (validated by `check-consistency`): **Symptom**, **Root cause**, **Fix strategy**.
`Context`, `Prevention`, and the `Related`/`Status` metadata are recommended but optional.

**Language:** field labels may be written in **English or Portuguese** — the kit supports pt-BR
projects, so the checker accepts either: `Symptom`/`Sintoma`, `Root cause`/`Causa`,
`Fix strategy`/`Solução`. Write in your project's language; don't translate just to satisfy the check.

**Structure:** for a few entries, a flat list of `## TRB-NNN` is fine. As the file grows, **group by
area** — an `## <Area>` header (e.g. `## Toolchain`, `## Git`, `## Environment`) with `### TRB-NNN`
entries underneath. Ids stay sequential and global across areas; the checker validates entries at
either level.

---

## Entries

> Bottom-append (mirrors the append-only `log.md`).

## TRB-001: Upsert com INSERT OR REPLACE apaga linhas-filhas via ON DELETE CASCADE

- **Date:** 2026-07-03 · **Related:** CHG-002 (Fatia B), testes TEST-11 · **Status:** resolved

**Sintoma:** Após o `RefinementService` atualizar o status da reunião, transcrições, pontos,
artefatos e até a linha da fila de refinamento sumiam do banco — `pending()` voltava vazio e a base
final tinha 0 segmentos, mesmo com o provedor retornando dados.
**Context:** SQLite com `PRAGMA foreign_keys = ON` e FKs `ON DELETE CASCADE` apontando para
`meetings`; upsert do `MeetingRepository.save` escrito como `INSERT OR REPLACE`.
**Causa:** `INSERT OR REPLACE` não é update-in-place: em conflito de PK ele **deleta a linha e
insere outra**. O DELETE interno dispara o `ON DELETE CASCADE`, varrendo todas as tabelas-filhas da
reunião a cada "save".
**Solução:** Trocar por UPSERT verdadeiro — `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` — que
atualiza in-place e não dispara cascade. (Desligar as FKs ou remover o CASCADE seriam consertos
errados: o cascade é exatamente o que o delete definitivo REQ-10 usa.)
**Prevention:** Em qualquer tabela referenciada por FK com CASCADE, upsert deve ser
`ON CONFLICT DO UPDATE`, nunca `INSERT OR REPLACE`. Sinal precoce: filhos "desaparecendo" após um
save de linha-pai. Os testes de integração TEST-11 cobrem o cenário como regressão.

## TRB-002: `npm ci` no Windows não hoisteia `jest-util` para a raiz — `ts-jest` falha com "Cannot find module 'jest-util'"

- **Date:** 2026-07-03 · **Related:** CHG-002 (build local Android), sem FIX (ambiente, não código) · **Status:** resolved

**Symptom:** `npm test` falha antes de rodar qualquer teste: `Error: Cannot find module 'jest-util'`,
stack apontando para `ts-jest/dist/legacy/config/config-set.js` → `@jest/core/node_modules/jest-util`.
`npm install` e `npm ci` (Windows, npm 10) terminam sem erro, mas `node_modules/jest-util` (raiz)
não existe — só cópias aninhadas em `node_modules/<pacote>/node_modules/jest-util`, todas na mesma
versão (29.7.0). CI (Linux) não reproduz.
**Context:** Windows + npm 10, `package-lock.json` (lockfileVersion 3) gerado originalmente em
ambiente Linux/CI; `jest-expo@57` + `jest@~29.7.0` + várias deps transitivas do Expo/Metro pedem
`jest-util@29.7.0` mas nenhuma delas é a raiz do grafo, então o resolver do npm nesse SO/versão não
promove nenhuma cópia para `node_modules/jest-util`. `ts-jest` faz `require('jest-util')` direto
(não é dependência declarada dele, conta com hoisting) — quebra quando não há cópia na raiz.
**Root cause:** hoisting do npm é heurístico e não determinístico entre plataformas/versões do npm
para o mesmo lockfile; aqui todas as cópias ficaram aninhadas em vez de uma ser promovida à raiz.
**Fix strategy:** copiar uma cópia existente para a raiz resolve localmente sem tocar em código ou
lockfile: `cp -r node_modules/@jest/core/node_modules/jest-util node_modules/jest-util`, depois
`npm test` roda normalmente (141/141 testes). Não editar `package.json`/lockfile para isso — o CI já
passa com o lockfile atual, então o problema é do resolver local, não da árvore de dependências.
**Prevention:** se `npm test` falhar com "Cannot find module 'jest-util'" (ou outro pacote que só
aparece aninhado) logo após um `npm install`/`npm ci` no Windows, primeiro rodar
`npm ls jest-util` para confirmar que só há cópias aninhadas, depois aplicar o mesmo workaround de
cópia manual em vez de tentar mexer em versões/overrides.

## TRB-003: Gradle/`java.nio.channels.Selector.open()` falha só dentro das ferramentas Bash/PowerShell do Claude Code no Windows — build Android precisa rodar no terminal do usuário

- **Date:** 2026-07-03 · **Related:** CHG-002 (build dev client Android), sem FIX (ambiente do agente, não código do projeto) · **Status:** resolved

**Sintoma:** `npx expo run:android` (e `gradlew.bat` isolado, com `--no-daemon`/`--stacktrace`) falha sempre
com `java.io.IOException: Unable to establish loopback connection`, causa
`java.net.SocketException: Invalid argument: connect` em `sun.nio.ch.UnixDomainSockets.connect0`, dentro
de `PipeImpl$Initializer$LoopbackConnector` → `WEPollSelectorImpl` → `Selector.open()`. Reproduz
identicamente com 3 JDKs diferentes (JBR do Android Studio, Eclipse Temurin 21, Eclipse Temurin 17),
mesmo com `-Djava.net.preferIPv4Stack=true`/`preferIPv4Addresses=true` via `JAVA_TOOL_OPTIONS`, com o
driver `afunix` confirmado `Running`, sem regra de firewall bloqueando `java`/`gradle`, com Controlled
Folder Access desligado, e com `NlaSvc` (Network Location Awareness) reiniciado.
**Context:** Windows 11, executando comandos via as ferramentas Bash/PowerShell do Claude Code (mesmo
com `dangerouslyDisableSandbox: true` numa chamada isolada). Um pequeno programa Java standalone
(`Selector.open()`) reproduz a falha só quando lançado a partir dessas ferramentas; o **mesmo binário
java.exe, o mesmo classpath**, executado pelo usuário num PowerShell aberto manualmente (fora do Claude
Code), funciona (`Selector.open() SUCCESS`).
**Causa:** O harness do Claude Code roda a árvore de processos filhos (Bash/PowerShell tool) sob alguma
restrição do SO (provavelmente job object/token restrito acima do nível de uma única chamada de
ferramenta — `dangerouslyDisableSandbox` numa chamada não foi suficiente) que impede o pipe interno de
loopback do JDK baseado em Unix Domain Socket (recurso adicionado no JDK 16+ para `Selector.open()` no
Windows) de completar o `connect()`. Não é bug do projeto, do JDK, do Gradle, nem da rede/firewall da
máquina do usuário.
**Solução:** Pedir para o usuário rodar `npx expo prebuild`/`npx expo run:android`/`gradlew` **no
terminal dele, fora das ferramentas do agente** — o agente pode preparar tudo (prebuild, variáveis de
ambiente, diagnóstico) e entregar o comando exato, mas a execução final do build Gradle precisa ser
iniciada pelo usuário. O que **não** resolveu: trocar de JDK (JBR/Temurin 21/Temurin 17 falham igual),
`-Djava.net.preferIPv4Stack=true`, reiniciar `NlaSvc`, confirmar `afunix` rodando, checar regras de
firewall/Controlled Folder Access — nenhum desses é a causa real.
**Prevention:** Se `Selector.open()`/Gradle falhar com "Unable to establish loopback connection" +
`UnixDomainSockets.connect0` **enquanto rodando via ferramentas do Claude Code no Windows**, não
gastar tempo investigando rede/firewall/JDK primeiro — testar rapidamente um programinha Java mínimo
(`Selector.open()`) fora do Claude Code (terminal manual do usuário) para confirmar/descartar a
sandbox do agente como causa antes de qualquer outra investigação.

## TRB-004: Build Android (`ld.lld: error: undefined symbol` em libc++) em usuário Windows com espaço no nome

- **Date:** 2026-07-03 · **Related:** CHG-002 (build dev client Android) · **Status:** resolved

**Sintoma:** `npx expo run:android` falha na fase de link C++ (CMake/ninja) de módulos nativos
diferentes a cada tentativa (`react-native-screens`, depois `react-native-worklets`) com dezenas de
`ld.lld: error: undefined symbol` para símbolos básicos da libc++ (`std::terminate()`,
`__cxa_begin_catch`, `std::__ndk1::mutex::~mutex()`, `operator new`, `std::__ndk1::__shared_weak_count`
etc.). Limpar `.cxx`/`build` não resolve — o próximo módulo que compila falha do mesmo jeito.
**Context:** Windows, perfil de usuário com **espaço no nome** (`C:\Users\Lucas Santos\...`), NDK
27.1.12297006 instalado dentro do perfil do usuário (caminho padrão do Android Studio), New
Architecture habilitada (`newArchEnabled=true`, obrigatório para `react-native-reanimated`/`worklets`
4.x). Bug reportado e confirmado em software-mansion/react-native-reanimated#8269.
**Causa:** O build system CMake/ninja do React Native, ao encontrar espaço no caminho do Windows,
converte o caminho do `clang++.exe` do NDK para o nome curto 8.3 (`CLANG_~1.EXE`) para evitar
problemas de aspas. O Clang decide se compila como C ou C++ **só pelo nome do executável** — sem o
sufixo `++`, ele assume C puro e descarta silenciosamente a libc++ (`libc++_shared.so`) do link,
gerando os símbolos indefinidos.
**Solução:** Copiar a pasta do NDK para um caminho sem espaços (ex.: `C:\ndk\27.1.12297006`) e apontar
`android/local.properties` (arquivo de máquina, já no `.gitignore`) para lá via
`ndk.dir=C\:\\ndk\\27.1.12297006`, depois `.cxx`/`build` limpos e rebuild. **O que não funcionou:**
criar um symlink/junction (`mklink /J`) para um caminho sem espaço — o CMake resolve `REALPATH` e volta
pro caminho original com espaço; limpar apenas o cache do módulo que falhou por último (o próximo
módulo simplesmente falha igual, porque a causa é o compilador, não o cache).
**Prevention:** Em qualquer build Android/CMake de React Native no Windows, se o usuário tiver espaço
no nome da conta, configurar `ndk.dir` num caminho sem espaços **antes** do primeiro `expo run:android`
— evita perder tempo com erros de linker que parecem aleatórios (módulo diferente falha a cada run).

## TRB-005: Upload de áudio (STT) falha em runtime Android com "Unsupported FormDataPart implementation"

- **Date:** 2026-07-03 · **Related:** CHG-002 (smoke test em aparelho), commit desta sessão · **Status:** resolved

**Sintoma:** No aparelho físico, "Refinar agora" falha com `[Error: Unsupported FormDataPart
implementation]` ao tentar enviar o áudio gravado para o provedor de STT (ElevenLabs). Só afeta a
chamada de upload de áudio (`FormData` com `{uri, name, type}`); chamadas JSON (LLM) funcionam
normalmente. Não reproduz em nenhum teste do CI (141 testes, 99% cobertura) — só aparece com o
bridge nativo real do Android, por isso só foi pego no smoke test em aparelho (spike da Fatia D).
**Context:** `src/expo/container.ts` montava o `HttpClient` como um passthrough direto de
`globalThis.fetch`. `node_modules/react-native/Libraries/Network/fetch.js` importa o pacote
`whatwg-fetch` e sobrescreve `global.fetch` com essa implementação "spec-compliant". A classe
`FormData` do React Native (`Libraries/Network/FormData.js`) aceita partes de arquivo no formato
`{uri, name, type}` (não é Blob/File real) — convenção histórica do RN para upload nativo. O `fetch`
do `whatwg-fetch`, ao serializar o corpo da requisição, só sabe lidar com Blob/File reais e rejeita
esse formato com a mensagem acima.
**Causa:** incompatibilidade entre o polyfill `whatwg-fetch` (usado pelo `fetch` global do RN) e a
convenção de `FormData` do próprio React Native para uploads de arquivo nativo — bug de terceiros
conhecido (issues abertas em `facebook/react-native` e `expo/expo`), não específico deste projeto.
**Solução:** `createHttpClient` (`src/adapters/http.ts`) detecta corpo `FormData` e nesse caso envia
via `XMLHttpRequest` (que ainda roteia pelo bridge nativo do RN e entende `{uri,name,type}`) em vez de
`fetch`; corpos não-`FormData` (JSON) continuam por `fetch` normalmente. Testado com XHR fake
injetado (`tests/integration/http-client.test.ts`) — sem depender do bridge nativo real. **O que não
resolveu:** nada foi tentado antes de identificar a causa via busca do texto exato do erro (a mensagem
não existe em nenhum arquivo-fonte JS do projeto nem do `react-native` publicado — vem de um módulo
nativo/bundled do `whatwg-fetch`, então grep local não encontra).
**Prevention:** qualquer upload de arquivo nativo (`FormData` com `{uri,name,type}`) no RN deve passar
por `XMLHttpRequest`, nunca por `fetch` — documentar essa regra no `HttpClient` do projeto
(`createHttpClient`) para não reintroduzir o bug ao "simplificar" para fetch puro no futuro.

## TRB-006: Ata/requisitos quase vazios — validação de âncora exata derruba pontos legítimos do LLM

- **Date:** 2026-07-03 · **Related:** CHG-002 (qualidade de extração), REQ-05 · **Status:** resolved

**Sintoma:** A ata e os requisitos saem quase vazios (poucos ou nenhum bullet) mesmo com transcrição
boa e reunião com bastante conteúdo. O LLM (testado com OpenAI GPT) responde pontos, mas quase todos
somem antes de virar ata.
**Context:** `anchorPoint` (`src/domain/extracted-point.ts`) validava cada ponto extraído exigindo
que `anchor.quote` estivesse contido via `String.includes` **exato** no segmento cujo id o LLM
informou (`anchor.segmentId`). Cada ponto que falhava era descartado silenciosamente (no `LiveAssist`
conta em `dropped`; no lote do `RefinementService`, sumia sem rastro).
**Causa:** o casamento exato é frágil demais para saída de LLM: (1) o modelo normaliza a citação
(capitalização, espaços, aspas/ponto final ao redor) e o `includes` sensível a isso falha; (2) o
modelo erra o `segmentId` (aponta o segmento vizinho) mesmo quando a citação é real noutro segmento.
Nos dois casos o ponto era legítimo (não-alucinado) mas caía, esvaziando a ata.
**Solução:** `anchorPoint` passou a (a) normalizar citação e texto do segmento para comparar
(minúsculas, espaços colapsados, pontuação de borda removida — acentos preservados) e (b) procurar a
citação em TODOS os segmentos, re-ancorando o ponto ao segmento que de fato a contém. A garantia
anti-alucinação (REQ-05) é preservada: se a citação não existe em segmento nenhum, o ponto ainda é
rejeitado. Prompt de extração também reforçado (pedir citação curta 5–15 palavras literal + ser
abrangente). **O que NÃO era a causa:** o LLM em si / o provedor — a extração vinha ok, o filtro é que
descartava; trocar de modelo não resolveria.
**Prevention:** ao validar saída de LLM contra um texto-fonte (âncora, citação, grounding), nunca usar
comparação exata sensível a caso/espaço/pontuação nem confiar num índice/id que o modelo informou —
normalizar e buscar no corpo inteiro. Match exato aparece como "resultado quase vazio", não como erro.

<!--
Template — copy this block, replace TRB-NNN with the next sequential number, and fill in:

## TRB-001: Build fails with "ENOSPC: no space left on device" during CI

- **Date:** 2026-01-15 · **Related:** FIX-007, commit 1a2b3c4 · **Status:** resolved

**Symptom:** CI job dies mid-build with `ENOSPC` even though the host disk shows free space.
**Context:** Node build on the shared CI runner; only reproduces when the inotify watcher count is low.
**Root cause:** The test watcher exhausted `fs.inotify.max_user_watches`, not actual disk space.
**Fix strategy:** Raised the watch limit in the runner image; running tests once (no watch) in CI also
avoids it. Bumping the disk did NOT help — that was the wrong lead.
**Prevention:** CI runs tests in single-run mode; the watch limit is pinned in the runner Dockerfile.
-->

---

## Agent Instructions

When you hit a non-trivial problem:

1. **Before debugging** — grep this file for the symptom/error string. Reuse the recorded strategy if found.
2. **After resolving** — if the fix took real investigation, run the `record-troubleshooting` skill
   (`"registrar troubleshooting"` / `"record troubleshooting"`) to append a well-formed `TRB-NN` entry.
3. **On bugfix specs** — when archiving a `bugfix-spec.md`, compile its lesson into one `TRB-NN` entry
   here and link back with the `FIX-NN` id. The spec is the event; this is the memory.
4. **Keep links live** — always reference the spec, commit, or PR so the full context is one hop away.

---

## References

- `.claude/skills/record-troubleshooting/SKILL.md` — the skill that appends entries here
- `.specs/memory/log.md` — append-only working journal (chronological; this file is topical)
- `.specs/memory/component-catalog.md` — the reuse counterpart to this failure memory
- `.specs/templates/bugfix-spec.md` — per-incident spec that an entry here is compiled from
- `scripts/check-consistency.mjs` — validates that entries follow the required-field schema
