import type { SttBatchProvider, SttResultSegment, SttTranscribeOptions } from '../provider-ports';
import { MissingApiKeyError, ProviderApiError } from '../errors';
import type { SttAdapterDeps } from './elevenlabs-scribe';

export interface OpenAiCompatibleWhisperConfig {
  id: string;
  baseUrl: string;
  model: string;
}

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
 * STT em lote SEM diarização, compatível com o endpoint /audio/transcriptions da OpenAI
 * (REQ-13 amendment) — Groq hospeda Whisper large-v3 gratuito/muito barato nesse mesmo formato;
 * um adapter parametrizado evita duplicar `OpenAiWhisperProvider`.
 */
export class OpenAiCompatibleWhisperProvider implements SttBatchProvider {
  readonly id: string;
  readonly supportsDiarization = false;

  constructor(
    private readonly deps: SttAdapterDeps,
    private readonly config: OpenAiCompatibleWhisperConfig,
  ) {
    this.id = config.id;
  }

  async transcribe(audioFiles: string[], options: SttTranscribeOptions): Promise<SttResultSegment[]> {
    const key = await this.deps.keys.getKey(this.id);
    if (key === null) throw new MissingApiKeyError(this.id);

    const out: SttResultSegment[] = [];
    let offsetMs = 0;
    for (const file of audioFiles) {
      const form = new FormData();
      form.append('file', (await this.deps.audioPart(file)) as never);
      form.append('model', this.config.model);
      form.append('response_format', 'verbose_json');
      form.append('language', options.language);

      const res = await this.deps.http(this.config.baseUrl, {
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
