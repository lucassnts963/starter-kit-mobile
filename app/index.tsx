import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useServices } from '../src/expo/services-context';
import { filterMeetings } from '../src/services/history-filter';
import { Card } from '../src/components/ui/Card';
import { colors, fonts, radii, spacing, typeScale } from '../src/components/ui/theme';
import type { MeetingRecord } from '../src/db/repository/meeting-repository';

/** Home: histórico com busca (REQ-09) + nova reunião. Hook fino — lógica nos services. */
export default function HomeScreen() {
  const { meetings } = useServices();
  const [all, setAll] = useState<MeetingRecord[]>([]);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      meetings.list().then(setAll);
    }, [meetings]),
  );

  const filtered = useMemo(() => filterMeetings(all, search), [all, search]);

  const open = (meeting: MeetingRecord) => {
    if (meeting.status === 'done' || meeting.status === 'ended' || meeting.status === 'refining') {
      router.push({ pathname: '/results/[id]', params: { id: meeting.id } });
    } else {
      router.push({ pathname: '/session/[id]', params: { id: meeting.id } });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar por título ou data (YYYY-MM-DD)"
        placeholderTextColor={colors.mutedForeground}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {all.length === 0 ? 'Nenhuma reunião ainda. Crie a primeira!' : 'Nada encontrado.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)}>
            <Card style={styles.item}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>
                {item.createdAt.slice(0, 10)} · {statusLabel(item.status)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Pressable style={styles.secondary} onPress={() => router.push('/settings')}>
          <Text style={styles.secondaryText}>Configurações</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push('/import-audio')}>
          <Text style={styles.secondaryText}>Importar áudio</Text>
        </Pressable>
        <Pressable style={styles.primary} onPress={() => router.push('/new-meeting')}>
          <Text style={styles.primaryText}>Nova reunião</Text>
        </Pressable>
      </View>
    </View>
  );
}

function statusLabel(status: MeetingRecord['status']): string {
  const labels: Record<MeetingRecord['status'], string> = {
    idle: 'não iniciada',
    recording: 'gravando',
    paused: 'pausada',
    ended: 'aguardando refinamento',
    refining: 'refinando…',
    done: 'concluída',
  };
  return labels[status];
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    color: colors.foreground,
    fontFamily: fonts.sans,
    backgroundColor: colors.card,
  },
  empty: { textAlign: 'center', color: colors.mutedForeground, marginTop: 40, fontFamily: fonts.sans },
  item: { padding: spacing.md },
  itemTitle: { fontSize: typeScale.body, fontFamily: fonts.sansSemiBold, color: colors.cardForeground },
  itemMeta: { color: colors.mutedForeground, marginTop: 2, fontFamily: fonts.mono, fontSize: typeScale.eyebrow },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    padding: spacing.md - 2,
    alignItems: 'center',
  },
  primaryText: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.md - 2,
    alignItems: 'center',
  },
  secondaryText: { color: colors.foreground, fontFamily: fonts.sansSemiBold },
});
