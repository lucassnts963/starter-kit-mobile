import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useServices } from '../../src/expo/services-context';
import { shareMarkdown } from '../../src/expo/share-markdown';
import { labeledText } from '../../src/domain/transcript';
import { colors, fonts, radii, spacing, typeScale } from '../../src/components/ui/theme';
import type { MeetingRecord } from '../../src/db/repository/meeting-repository';

type Tab = 'minutes' | 'requirements' | 'transcript';

/** Resultados: ata / requisitos / transcrição, renomear falantes (REQ-12) e export (REQ-09). */
export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const services = useServices();
  const [meeting, setMeeting] = useState<MeetingRecord | null>(null);
  const [tab, setTab] = useState<Tab>('minutes');
  const [minutes, setMinutes] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setMeeting(await services.meetings.findById(id));
    setMinutes((await services.artifacts.findByMeetingAndKind(id, 'minutes'))?.markdown ?? null);
    setRequirements((await services.artifacts.findByMeetingAndKind(id, 'requirements'))?.markdown ?? null);
    const segments = await services.transcripts.listByMeeting(id);
    setTranscript(labeledText(segments, 'final') || labeledText(segments, 'draft'));
    setSpeakers(await services.speakers.listSpeakers(id));
  }, [id, services]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refine = async () => {
    setRefreshing(true);
    try {
      const refinement = await services.createRefinement();
      const results = await refinement.processQueue();
      const mine = results.find((r) => r.meetingId === id);
      if (mine && !mine.ok) Alert.alert('Refinamento falhou', mine.error ?? 'erro desconhecido');
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const rename = async () => {
    if (!renaming || renaming.to.trim() === '') return;
    await services.speakers.rename(id!, renaming.from, renaming.to.trim());
    setRenaming(null);
    await load();
  };

  const exportCurrent = async () => {
    const content = tab === 'minutes' ? minutes : tab === 'requirements' ? requirements : transcript;
    if (!content) return;
    const names: Record<Tab, string> = {
      minutes: 'ata.md',
      requirements: 'requirements.md',
      transcript: 'transcricao.md',
    };
    await shareMarkdown(names[tab], content);
  };

  const needsRefinement = meeting?.status === 'ended' || meeting?.status === 'refining';
  const content = tab === 'minutes' ? minutes : tab === 'requirements' ? requirements : transcript;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['minutes', 'requirements', 'transcript'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={tab === t ? styles.tabTextActive : styles.tabText}>
              {t === 'minutes' ? 'Ata' : t === 'requirements' ? 'Requisitos' : 'Transcrição'}
            </Text>
          </Pressable>
        ))}
      </View>

      {needsRefinement ? (
        <Pressable style={styles.refine} onPress={refine} disabled={refreshing}>
          <Text style={styles.refineText}>
            {refreshing ? 'Refinando…' : 'Refinar agora (re-transcrição + ata + requisitos)'}
          </Text>
        </Pressable>
      ) : null}

      <ScrollView style={styles.content}>
        <Text style={styles.markdown}>{content ?? 'Ainda não gerado — rode o refinamento.'}</Text>
      </ScrollView>

      {speakers.length > 0 ? (
        <View style={styles.speakers}>
          <Text style={styles.speakersTitle}>Falantes (toque para renomear):</Text>
          <View style={styles.speakerRow}>
            {speakers.map((s) => (
              <Pressable
                key={s}
                style={[styles.speakerChip, renaming?.from === s && styles.speakerChipActive]}
                onPress={() => setRenaming({ from: s, to: '' })}
              >
                <Text style={renaming?.from === s ? styles.speakerChipTextActive : styles.speakerChipText}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
          {renaming ? (
            <View style={styles.renameRow}>
              <TextInput
                style={styles.renameInput}
                placeholder={`Novo nome para "${renaming.from}"`}
                placeholderTextColor={colors.mutedForeground}
                value={renaming.to}
                onChangeText={(to) => setRenaming({ ...renaming, to })}
                autoFocus
              />
              <Pressable style={styles.renameButton} onPress={rename}>
                <Text style={styles.renameButtonText}>Renomear</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable style={styles.export} onPress={exportCurrent}>
        <Text style={styles.exportText}>Exportar / compartilhar (Markdown)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    padding: spacing.sm + 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.secondaryForeground, fontFamily: fonts.sans },
  tabTextActive: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  refine: { backgroundColor: colors.primary, borderRadius: radii.sm, padding: spacing.sm + 4, alignItems: 'center', marginTop: spacing.sm + 4 },
  refineText: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  content: { flex: 1, marginTop: spacing.sm + 4 },
  markdown: { fontFamily: fonts.mono, fontSize: typeScale.bodySm, color: colors.foreground },
  speakers: { marginTop: spacing.sm + 4 },
  speakersTitle: { fontFamily: fonts.sansSemiBold, color: colors.foreground, marginBottom: spacing.xs + 2 },
  speakerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  speakerChip: { backgroundColor: colors.accentTint, borderRadius: radii.full, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, borderWidth: 1, borderColor: colors.accentTintBorder },
  speakerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  speakerChipText: { color: colors.accentSoft, fontFamily: fonts.mono, fontSize: typeScale.bodySm },
  speakerChipTextActive: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  renameRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  renameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    color: colors.foreground,
    fontFamily: fonts.sans,
    backgroundColor: colors.card,
  },
  renameButton: { backgroundColor: colors.primary, borderRadius: radii.sm, padding: spacing.sm + 2, justifyContent: 'center' },
  renameButtonText: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  export: { backgroundColor: colors.secondary, borderRadius: radii.sm, padding: spacing.md - 2, alignItems: 'center', marginTop: spacing.sm + 4, borderWidth: 1, borderColor: colors.border },
  exportText: { color: colors.foreground, fontFamily: fonts.sansSemiBold },
});
