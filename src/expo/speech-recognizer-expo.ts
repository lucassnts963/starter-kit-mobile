import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import type { SpeechRecognizerPort } from '../services/recording-ports';

/**
 * SpeechRecognizerPort sobre expo-speech-recognition (Android SpeechRecognizer /
 * iOS SFSpeechRecognizer). O auto-restart quando a sessão nativa expira fica no
 * LiveTranscriptionService — aqui é só passthrough de eventos.
 * SPIKE (Fatia D, A-02): validar qualidade pt-BR em reunião real no Android.
 */
export function createExpoSpeechRecognizer(): SpeechRecognizerPort {
  let subscriptions: { remove(): void }[] = [];
  return {
    async available() {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) return false;
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    },
    async start(options, callbacks) {
      subscriptions.forEach((s) => s.remove());
      subscriptions = [
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const transcript = event.results?.[0]?.transcript ?? '';
          if (transcript !== '') callbacks.onResult({ text: transcript, isFinal: event.isFinal ?? false });
        }),
        ExpoSpeechRecognitionModule.addListener('end', () => callbacks.onEnd()),
        ExpoSpeechRecognitionModule.addListener('error', (event) =>
          callbacks.onError(event.message ?? event.error ?? 'erro de reconhecimento'),
        ),
      ];
      ExpoSpeechRecognitionModule.start({
        lang: options.language,
        interimResults: true,
        continuous: true,
      });
    },
    async stop() {
      ExpoSpeechRecognitionModule.stop();
      subscriptions.forEach((s) => s.remove());
      subscriptions = [];
    },
  };
}
