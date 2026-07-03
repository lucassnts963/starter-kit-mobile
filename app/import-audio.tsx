import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useServices } from '../src/expo/services-context';
import { requirementsElicitationTemplate } from '../src/domain/templates/requirements-elicitation';
import { genericMeetingTemplate } from '../src/domain/templates/generic-meeting';
import { colors, fonts, radii, spacing } from '../src/components/ui/theme';

const TYPES = [requirementsElicitationTemplate, genericMeetingTemplate];

/** Importa uma reunião já gravada (arquivo de áudio existente) para refinamento — sem gravação ao vivo. */
export default function ImportAudioScreen() {
  const { session, recording } = useServices();
  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState<string>(TYPES[0]!.id);
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (result.canceled || result.assets.length === 0) return;
    const picked = result.assets[0]!;
    setFile({ uri: picked.uri, name: picked.name });
    if (title.trim() === '') setTitle(picked.name.replace(/\.[^.]+$/, ''));
  };

  const importAndOpen = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const meeting = await session.createMeeting(title.trim() || file.name, typeId, consent);
      await recording.importAudio(meeting.id, file.uri);
      router.replace({ pathname: '/results/[id]', params: { id: meeting.id } });
    } catch (error) {
      Alert.alert('Falha ao importar', error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  };

  const canImport = consent && file !== null && !importing;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Arquivo de áudio</Text>
      <Pressable style={styles.picker} onPress={pickFile}>
        <Text style={styles.pickerText}>{file ? file.name : 'Selecionar arquivo (.m4a, .mp3, .wav…)'}</Text>
      </Pressable>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex.: Reunião de kickoff (gravada)"
        placeholderTextColor={colors.mutedForeground}
      />

      <Text style={styles.label}>Tipo de reunião</Text>
      {TYPES.map((t) => (
        <Pressable
          key={t.id}
          style={[styles.type, typeId === t.id && styles.typeSelected]}
          onPress={() => setTypeId(t.id)}
        >
          <Text style={typeId === t.id ? styles.typeTextSelected : styles.typeText}>{t.name}</Text>
        </Pressable>
      ))}

      <View style={styles.consentRow}>
        <Switch
          value={consent}
          onValueChange={setConsent}
          trackColor={{ false: colors.secondary, true: colors.primary }}
          thumbColor={colors.foreground}
        />
        <Text style={styles.consentText}>
          Confirmei com todos os participantes que esta gravação será transcrita (LGPD).
        </Text>
      </View>

      <Pressable style={[styles.primary, !canImport && styles.disabled]} disabled={!canImport} onPress={importAndOpen}>
        <Text style={styles.primaryText}>{importing ? 'Importando…' : 'Importar e refinar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.background },
  label: { fontFamily: fonts.sansSemiBold, color: colors.foreground, marginTop: spacing.sm },
  picker: {
    borderWidth: 1,
    borderColor: colors.accentTintBorder,
    borderRadius: radii.sm,
    padding: spacing.sm + 4,
    backgroundColor: colors.accentTint,
  },
  pickerText: { color: colors.accentSoft, fontFamily: fonts.sansMedium },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm + 2,
    color: colors.foreground,
    fontFamily: fonts.sans,
    backgroundColor: colors.card,
  },
  type: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm + 4,
    marginTop: spacing.xs,
    backgroundColor: colors.card,
  },
  typeSelected: { borderColor: colors.primary, backgroundColor: colors.accentTint },
  typeText: { color: colors.foreground, fontFamily: fonts.sans },
  typeTextSelected: { color: colors.accentSoft, fontFamily: fonts.sansSemiBold },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginTop: spacing.md },
  consentText: { flex: 1, color: colors.secondaryForeground, fontFamily: fonts.sans, fontSize: 13 },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    padding: spacing.md - 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryText: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  disabled: { opacity: 0.4 },
});
