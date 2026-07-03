import type { SttBatchProvider, SttResultSegment, SttTranscribeOptions } from '../provider-ports';
import type { HttpClient } from '../http';
import type { ApiKeyStore } from '../secure-keys';
import { MissingApiKeyError, ProviderApiError } from '../errors';

export interface SttAdapterDeps {
  http: HttpClient;
  keys: ApiKeyStore;
  /** Constrói a parte de arquivo do multipart (produção RN: `{ uri, name, type }`). */
  audioPart: (path: string) => Promise<unknown>;
}

interface ScribeWord {
  text: string;
  start: number;
  end: number;
  type: 'word' | 'spacing' | 'audio_event';
  speaker_id?: string;
}

interface ScribeResponse {
  language_code: string;
  text: string;
  words: ScribeWord[];
}

/** "speaker_0" → "Falante 1" (rótulo inicial renomeável pelo condutor, REQ-12). */
function speakerLabel(speakerId: string | undefined): string | undefined {
  if (speakerId === undefined) return undefined;
  const n = Number(speakerId.split('_').pop());
  return Number.isNaN(n) ? speakerId : `Falante ${n + 1}`;
}

/** Agrupa palavras consecutivas do mesmo falante em segmentos com timestamps em ms. */
function toSegments(response: ScribeResponse): SttResultSegment[] {
  const segments: SttResultSegment[] = [];
  let current: { words: string[]; startMs: number; endMs: number; speaker?: string } | null = null;

  for (const word of response.words) {
    if (word.type !== 'word') continue;
    const speaker = speakerLabel(word.speaker_id);
    if (current === null || current.speaker !== speaker) {
      if (current) segments.push(flush(current));
      current = { words: [], startMs: Math.round(word.start * 1000), endMs: 0, speaker };
    }
    current.words.push(word.text);
    current.endMs = Math.round(word.end * 1000);
  }
  if (current) segments.push(flush(current));
  return segments;
}

function flush(group: { words: string[]; startMs: number; endMs: number; speaker?: string }): SttResultSegment {
  return {
    text: group.words.join(' '),
    startMs: group.startMs,
    endMs: group.endMs,
    ...(group.speaker !== undefined ? { speaker: group.speaker } : {}),
  };
}

/**
 * ElevenLabs Scribe — STT em lote com diarização (ADR-004/005, REQ-03/12/13).
 * Docs: POST /v1/speech-to-text (multipart), header `xi-api-key`.
 */
export class ElevenLabsScribeProvider implements SttBatchProvider {
  readonly id = 'elevenlabs-scribe';
  readonly supportsDiarization = true;

  constructor(private readonly deps: SttAdapterDeps) {}

  async transcribe(audioFiles: string[], options: SttTranscribeOptions): Promise<SttResultSegment[]> {
    const key = await this.deps.keys.getKey(this.id);
    if (key === null) throw new MissingApiKeyError(this.id);

    const out: SttResultSegment[] = [];
    let offsetMs = 0;
    for (const file of audioFiles) {
      const form = new FormData();
      form.append('file', (await this.deps.audioPart(file)) as never);
      form.append('model_id', 'scribe_v1');
      form.append('diarize', 'true');
      form.append('language_code', options.language);

      const res = await this.deps.http('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': key },
        body: form,
      });
      if (!res.ok) throw new ProviderApiError(this.id, res.status, await res.text());

      const body = (await res.json()) as ScribeResponse;
      const mapped = toSegments(body).map((s) => ({
        ...s,
        startMs: s.startMs + offsetMs,
        endMs: s.endMs + offsetMs,
      }));
      out.push(...mapped);
      if (out.length > 0) offsetMs = out[out.length - 1]!.endMs;
    }
    return out;
  }
}
