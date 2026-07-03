# Escriba

App mobile de apoio a reuniões e levantamento de requisitos: grava o áudio da reunião, transcreve
(rascunho ao vivo + refinamento pós-reunião), sugere perguntas em tempo real guiadas pela metodologia
spec-driven do [starter-kit](https://github.com/lucassnts963/starter-kit) — evitando questões em
aberto — e, ao encerrar, entrega a **ata da reunião** e o **documento de requisitos** já estruturado.

> **Dogfooding:** este app é desenvolvido usando a própria metodologia para a qual foi criado.
> Comece por `.specs/requirements/002-assistente-reunioes/requirements.md` e `METHODOLOGY.md`.

## Stack

React Native + Expo (TypeScript) · expo-sqlite (local-first) · Adapters para STT/LLM · Jest (TDD)

## Desenvolvimento

| Comando | Descrição |
|---|---|
| `npm run start` | Dev server (Expo) |
| `npm run test` | Testes (TDD obrigatório) |
| `npm run check` | Consistência da metodologia |
| `npm run session` | "Onde paramos" — contexto da sessão |
