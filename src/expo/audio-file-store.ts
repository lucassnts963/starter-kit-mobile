import { Directory, File, Paths } from 'expo-file-system';
import type { AudioFileStore } from '../services/ports';

/**
 * Armazenamento durável dos áudios: o gravador (expo-audio) escreve em cache — que o SO pode
 * limpar — e áudios importados vêm como `content://` transitório. `persist` copia para
 * `document/audio/<meetingId>/`, seguro até o usuário apagar a reunião (REQ-10).
 */
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

  async persist(uri, meetingId) {
    const dir = new Directory(Paths.document, 'audio', meetingId);
    try {
      dir.create({ intermediates: true });
    } catch {
      // já existe — segue
    }
    const source = new File(uri);
    const name = source.name || `segmento-${Date.now()}.m4a`;
    const dest = new File(dir, name);
    // idempotente: se já está no destino durável, devolve como está
    if (uri === dest.uri) return uri;
    try {
      if (dest.exists) dest.delete();
    } catch {
      // ignora
    }
    await source.copy(dest);
    return dest.uri;
  },
};
