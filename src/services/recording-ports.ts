/**
 * Ports da Fatia D — implementados por adapters finos em `src/expo/` (expo-audio,
 * expo-speech-recognition) e por fakes determinísticos nos testes.
 */

/** Gravador de áudio segmentado: cada start/stop produz um arquivo (m4a). */
export interface RecorderPort {
  start(): Promise<void>;
  /** Encerra o segmento atual e devolve o caminho do arquivo persistido. */
  stop(): Promise<string>;
}

export interface SpeechRecognizerCallbacks {
  onResult(result: { text: string; isFinal: boolean }): void;
  /** Sessão nativa terminou (limite ~1min no iOS, silêncio) — candidata a auto-restart. */
  onEnd(): void;
  onError(message: string): void;
}

export interface SpeechRecognizerPort {
  available(): Promise<boolean>;
  start(options: { language: string }, callbacks: SpeechRecognizerCallbacks): Promise<void>;
  stop(): Promise<void>;
}

/** Relógio monotônico em ms para timestamps do rascunho ao vivo. */
export interface Monotonic {
  nowMs(): number;
}
