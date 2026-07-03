export type SqlParam = string | number | null;

/**
 * Port de banco com a assinatura do expo-sqlite (`SQLiteDatabase`):
 * `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`.
 * Produção: wrapper trivial sobre `expo-sqlite` (Fatia D/E).
 * Testes: implementação sobre `node:sqlite` em `tests/helpers/`.
 */
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlParam[]): Promise<void>;
  getAllAsync<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
}
