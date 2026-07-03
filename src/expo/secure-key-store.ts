import * as SecureStore from 'expo-secure-store';
import type { ApiKeyStore } from '../adapters/secure-keys';

/** Chaves ficam no Keychain/Keystore (REQ-11, NFR-04) — uma por provedor, nunca em logs. */
export const secureKeyStore: ApiKeyStore = {
  async getKey(providerId) {
    return SecureStore.getItemAsync(keyName(providerId));
  },
  async setKey(providerId, key) {
    await SecureStore.setItemAsync(keyName(providerId), key);
  },
  async deleteKey(providerId) {
    await SecureStore.deleteItemAsync(keyName(providerId));
  },
};

/** SecureStore aceita apenas [A-Za-z0-9._-] em nomes de chave. */
function keyName(providerId: string): string {
  return `apikey.${providerId.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}
