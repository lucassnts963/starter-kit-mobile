/** Ports de infraestrutura injetados nos services — determinísticos nos testes. */

export interface Clock {
  nowIso(): string;
}

export interface IdGenerator {
  newId(): string;
}

/** Armazenamento de arquivos de áudio (produção: expo-file-system). */
export interface AudioFileStore {
  deleteFiles(paths: string[]): Promise<void>;
  /**
   * Copia um arquivo (gravação em cache ou URI importada content://) para a pasta durável do app
   * e devolve o caminho persistente — garante que o áudio continue tocável meses depois (REQ-10
   * só apaga na exclusão da reunião). Idempotente: um caminho já durável é devolvido como está.
   */
  persist(uri: string, meetingId: string): Promise<string>;
}
