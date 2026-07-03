/**
 * Interfaces de provedor de IA (ADR-005, REQ-13). Implementações concretas
 * (ElevenLabs Scribe, OpenAI, Anthropic, …) vivem em `src/adapters/` — Fatia C.
 * Nenhum código fora de adapters conhece HTTP/SDKs de provedor.
 */

export interface SttResultSegment {
  text: string;
  startMs: number;
  endMs: number;
  /** Rótulo de diarização (ex.: "Falante 1") — ausente se o provedor não diariza. */
  speaker?: string;
}

export interface SttTranscribeOptions {
  language: string;
}

export interface SttBatchProvider {
  readonly id: string;
  /** Capability flag (US-10.3): sem diarização, o app avisa antes da reunião. */
  readonly supportsDiarization: boolean;
  transcribe(audioFiles: string[], options: SttTranscribeOptions): Promise<SttResultSegment[]>;
}
