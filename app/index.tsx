import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useServices } from '../src/expo/services-context';
import { filterMeetings } from '../src/services/history-filter';
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
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {all.length === 0 ? 'Nenhuma reunião ainda. Crie a primeira!' : 'Nada encontrado.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => open(item)}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemMeta}>
              {item.createdAt.slice(0, 10)} · {statusLabel(item.status)}
            </Text>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Pressable style={styles.secondary} onPress={() => router.push('/settings')}>
          <Text style={styles.secondaryText}>Configurações</Text>
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
  container: { flex: 1, padding: 16 },
  search: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
  empty: { textAlign: 'center', color: '#777', marginTop: 40 },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemMeta: { color: '#777', marginTop: 2 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 12 },
  primary: { flex: 1, backgroundColor: '#2c3e50', borderRadius: 8, padding: 14, alignItems: 'center' },
  primaryText: { color: 'white', fontWeight: 'bold' },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#2c3e50', borderRadius: 8, padding: 14, alignItems: 'center' },
  secondaryText: { color: '#2c3e50', fontWeight: 'bold' },
});
