/**
 * Port de chaves de API — **uma chave por provedor** (REQ-11).
 * Produção: implementação sobre expo-secure-store (Keychain/Keystore) na Fatia E.
 * Nunca logar valores de chave.
 */
export interface ApiKeyStore {
  getKey(providerId: string): Promise<string | null>;
  setKey(providerId: string, key: string): Promise<void>;
  deleteKey(providerId: string): Promise<void>;
}
