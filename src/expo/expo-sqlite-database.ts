import { openDatabaseAsync } from 'expo-sqlite';
import type { SqlDatabase } from '../db/database';

/**
 * Adapter fino (passthrough): o expo-sqlite já expõe exatamente a assinatura do port
 * `SqlDatabase` (execAsync/runAsync/getAllAsync/getFirstAsync). Validado no spike Android.
 */
export async function openEscribaDatabase(name = 'escriba.db'): Promise<SqlDatabase> {
  const db = await openDatabaseAsync(name);
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      await db.runAsync(sql, params);
    },
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params),
  };
}
