import { File } from 'expo-file-system';
import type { AudioFileStore } from '../services/ports';

/** Exclusão definitiva dos áudios (REQ-10). Arquivo inexistente não interrompe a limpeza. */
export const audioFileStore: AudioFileStore = {
  async deleteFiles(paths) {
    for (const path of paths) {
      try {
        new File(path).delete();
      } catch {
        // já removido ou URI inválida — a exclusão do restante continua
      }
    }
  },
};
