import { AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import type { RecorderPort } from '../services/recording-ports';

/**
 * RecorderPort sobre expo-audio: cada start/stop produz um segmento .m4a.
 * SPIKE (Fatia D, NFR-01): validar em aparelho Android gravação ≥ 2h em background
 * (foreground service + permissões em app.json). Passthrough sem lógica de negócio.
 */
export function createExpoRecorder(): RecorderPort {
  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  return {
    async start() {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Permissão de microfone negada');
      await setAudioModeAsync({ allowsRecording: true, shouldPlayInBackground: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    },
    async stop() {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('Gravador não produziu arquivo');
      return uri;
    },
  };
}
