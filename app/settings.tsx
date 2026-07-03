import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useServices } from '../src/expo/services-context';
import { listProviders, type ProviderCapability } from '../src/adapters/provider-catalog';
import { secureKeyStore } from '../src/expo/secure-key-store';

const CAPABILITIES: { capability: ProviderCapability; title: string }[] = [
  { capability: 'stt-batch', title: 'Transcrição (pós-reunião)' },
  { capability: 'llm', title: 'Assistente (perguntas e extração)' },
];

/** Configurações (REQ-11/13): provedor por capacidade + chave de API por provedor. */
export default function SettingsScreen() {
  const { settings } = useServices();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sel: Record<string, string> = {};
      for (const { capability } of CAPABILITIES) {
        sel[capability] = await settings.getSelectedProvider(capability);
      }
      setSelected(sel);
    })();
  }, [settings]);

  const select = async (capability: ProviderCapability, providerId: string) => {
    await settings.setSelectedProvider(capability, providerId);
    setSelected((s) => ({ ...s, [capability]: providerId }));
  };

  const saveKey = async (providerId: string) => {
    const key = keys[providerId]?.trim();
    if (!key) return;
    await secureKeyStore.setKey(providerId, key);
    setKeys((k) => ({ ...k, [providerId]: '' }));
    setSavedFlash(providerId);
    setTimeout(() => setSavedFlash(null), 2000);
  };

  return (
    <ScrollView style={styles.container}>
      {CAPABILITIES.map(({ capability, title }) => (
        <View key={capability} style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {listProviders(capability).map((provider) => (
            <View key={provider.id} style={styles.provider}>
              <Pressable
                style={[styles.providerHeader, selected[capability] === provider.id && styles.providerSelected]}
                onPress={() => select(capability, provider.id)}
              >
                <Text style={selected[capability] === provider.id ? styles.providerNameSelected : styles.providerName}>
                  {provider.label}
                  {selected[capability] === provider.id ? '  ✓' : ''}
                </Text>
                {provider.capability === 'stt-batch' ? (
                  <Text style={styles.capability}>
                    {provider.supportsDiarization ? 'identifica falantes' : 'não identifica falantes'}
                  </Text>
                ) : null}
              </Pressable>
              <View style={styles.keyRow}>
                <TextInput
                  style={styles.keyInput}
                  placeholder="Chave de API (fica no aparelho, em armazenamento seguro)"
                  secureTextEntry
                  value={keys[provider.id] ?? ''}
                  onChangeText={(v) => setKeys((k) => ({ ...k, [provider.id]: v }))}
                />
                <Pressable style={styles.keyButton} onPress={() => saveKey(provider.id)}>
                  <Text style={styles.keyButtonText}>{savedFlash === provider.id ? 'Salva ✓' : 'Salvar'}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}
      <Text style={styles.note}>
        Cada usuário usa as próprias chaves. As chaves ficam no Keychain/Keystore do aparelho e nunca
        saem dele, exceto nas chamadas diretas ao provedor escolhido.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  provider: { marginBottom: 10 },
  providerHeader: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  providerSelected: { borderColor: '#2c3e50', backgroundColor: '#eef3f8' },
  providerName: { color: '#333', fontWeight: '600' },
  providerNameSelected: { color: '#2c3e50', fontWeight: 'bold' },
  capability: { color: '#777', fontSize: 12, marginTop: 2 },
  keyRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  keyInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8 },
  keyButton: { backgroundColor: '#2c3e50', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  keyButtonText: { color: 'white' },
  note: { color: '#777', fontSize: 12, marginBottom: 24 },
});
