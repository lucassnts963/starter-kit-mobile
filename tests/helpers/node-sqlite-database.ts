import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase, SqlParam } from '../../src/db/database';

/**
 * Implementação do port `SqlDatabase` sobre o SQLite nativo do Node (node:sqlite),
 * usada SOMENTE em testes. Em produção o mesmo port é implementado por expo-sqlite
 * (assinaturas idênticas: execAsync/runAsync/getAllAsync/getFirstAsync).
 */
export function createTestDatabase(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(sql: string): Promise<void> {
      db.exec(sql);
    },
    async runAsync(sql: string, params: SqlParam[] = []): Promise<void> {
      db.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
  };
}
