import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useServices } from '../src/expo/services-context';
import { listProviders, type ProviderCapability } from '../src/adapters/provider-catalog';
import { secureKeyStore } from '../src/expo/secure-key-store';
import { Card } from '../src/components/ui/Card';
import { colors, fonts, radii, spacing, typeScale } from '../src/components/ui/theme';

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
            <Card key={provider.id} style={styles.provider}>
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
              {provider.requiresApiKey === false ? null : (
                <View style={styles.keyRow}>
                  <TextInput
                    style={styles.keyInput}
                    placeholder="Chave de API (fica no aparelho, em armazenamento seguro)"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    value={keys[provider.id] ?? ''}
                    onChangeText={(v) => setKeys((k) => ({ ...k, [provider.id]: v }))}
                  />
                  <Pressable style={styles.keyButton} onPress={() => saveKey(provider.id)}>
                    <Text style={styles.keyButtonText}>{savedFlash === provider.id ? 'Salva ✓' : 'Salvar'}</Text>
                  </Pressable>
                </View>
              )}
            </Card>
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
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  section: { marginBottom: spacing.lg - 4 },
  sectionTitle: { fontFamily: fonts.sansSemiBold, fontSize: typeScale.body, color: colors.foreground, marginBottom: spacing.sm },
  provider: { marginBottom: spacing.sm + 2, padding: spacing.sm + 4 },
  providerHeader: { borderRadius: radii.sm },
  providerSelected: {},
  providerName: { color: colors.foreground, fontFamily: fonts.sansMedium },
  providerNameSelected: { color: colors.accentSoft, fontFamily: fonts.sansSemiBold },
  capability: { color: colors.mutedForeground, fontSize: typeScale.eyebrow, fontFamily: fonts.mono, marginTop: 2 },
  keyRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm - 2 },
  keyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    color: colors.foreground,
    fontFamily: fonts.sans,
    backgroundColor: colors.background,
  },
  keyButton: { backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: spacing.md - 2, justifyContent: 'center' },
  keyButtonText: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  note: { color: colors.mutedForeground, fontSize: typeScale.bodySm, fontFamily: fonts.sans, marginBottom: spacing.xl - 8 },
});
