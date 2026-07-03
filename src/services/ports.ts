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
}
