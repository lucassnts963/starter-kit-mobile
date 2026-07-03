import type { SttBatchProvider, SttResultSegment, SttTranscribeOptions } from '../provider-ports';
import { MissingApiKeyError, ProviderApiError } from '../errors';
import type { SttAdapterDeps } from './elevenlabs-scribe';

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
}

/**
 * OpenAI Whisper — STT em lote SEM diarização (capability flag false → aviso US-10.3).
 * Docs: POST /v1/audio/transcriptions (multipart, response_format=verbose_json).
 */
export class OpenAiWhisperProvider implements SttBatchProvider {
  readonly id = 'openai-whisper';
  readonly supportsDiarization = false;

  constructor(private readonly deps: SttAdapterDeps) {}

  async transcribe(audioFiles: string[], options: SttTranscribeOptions): Promise<SttResultSegment[]> {
    const key = await this.deps.keys.getKey(this.id);
    if (key === null) throw new MissingApiKeyError(this.id);

    const out: SttResultSegment[] = [];
    let offsetMs = 0;
    for (const file of audioFiles) {
      const form = new FormData();
      form.append('file', (await this.deps.audioPart(file)) as never);
      form.append('model', 'whisper-1');
      form.append('response_format', 'verbose_json');
      form.append('language', options.language);

      const res = await this.deps.http('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      if (!res.ok) throw new ProviderApiError(this.id, res.status, await res.text());

      const body = (await res.json()) as WhisperResponse;
      const mapped = body.segments.map((s) => ({
        text: s.text.trim(),
        startMs: Math.round(s.start * 1000) + offsetMs,
        endMs: Math.round(s.end * 1000) + offsetMs,
      }));
      out.push(...mapped);
      if (out.length > 0) offsetMs = out[out.length - 1]!.endMs;
    }
    return out;
  }
}
