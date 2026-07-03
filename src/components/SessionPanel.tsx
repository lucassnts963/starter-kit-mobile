import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MeetingType } from '../domain/meeting-type';
import type { Coverage, QuestionSuggestion } from '../domain/coverage';

export interface SessionPanelProps {
  type: MeetingType;
  status: 'recording' | 'paused';
  /** Motivo da degradação para somente-gravação (NFR-06); null quando tudo opera. */
  degradedReason: string | null;
  draftText: string;
  assistLoading: boolean;
  coverage: Coverage;
  suggestions: QuestionSuggestion[];
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onDismissQuestion: (question: string) => void;
}

/**
 * Painel de condução da sessão (REQ-04/10, NFR-05): indicador de gravação SEMPRE
 * visível, cobertura de seções, perguntas sugeridas descartáveis e banner
 * não-bloqueante no modo somente-gravação.
 */
export function SessionPanel(props: SessionPanelProps) {
  const sectionTitle = (id: string) => props.type.sections.find((s) => s.id === id)?.title ?? id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text testID="recording-indicator" style={props.status === 'recording' ? styles.recording : styles.paused}>
          {props.status === 'recording' ? '● Gravando' : '❚❚ Pausado'}
        </Text>
        {props.assistLoading ? <ActivityIndicator testID="assist-loading" size="small" /> : null}
      </View>

      {props.degradedReason !== null ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Modo somente gravação: {props.degradedReason}. O áudio continua sendo gravado.
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.body}>
        {props.draftText !== '' ? <Text style={styles.draft}>{props.draftText}</Text> : null}

        {props.coverage.covered.length === 0 ? (
          <View>
            <Text style={styles.emptyTitle}>Nenhum ponto extraído ainda — roteiro da reunião:</Text>
            {props.type.sections.map((section) => (
              <Text key={section.id} style={styles.sectionPending}>
                {section.title}
              </Text>
            ))}
          </View>
        ) : (
          <View>
            {props.coverage.covered.map((id) => (
              <Text key={id} style={styles.sectionCovered}>
                ✓ {sectionTitle(id)} — coberta
              </Text>
            ))}
            {props.coverage.pending.map((id) => (
              <Text key={id} style={styles.sectionPending}>
                {sectionTitle(id)} — pendente
              </Text>
            ))}
          </View>
        )}

        {props.suggestions.map((suggestion) => (
          <View key={suggestion.question} style={styles.suggestion}>
            <Text style={styles.suggestionSection}>{suggestion.sectionTitle}</Text>
            <Text style={styles.suggestionQuestion}>{suggestion.question}</Text>
            <Pressable onPress={() => props.onDismissQuestion(suggestion.question)}>
              <Text style={styles.dismiss}>Descartar</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        {props.status === 'recording' ? (
          <Pressable style={styles.control} onPress={props.onPause}>
            <Text style={styles.controlText}>Pausar</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.control} onPress={props.onResume}>
            <Text style={styles.controlText}>Retomar</Text>
          </Pressable>
        )}
        <Pressable style={[styles.control, styles.end]} onPress={props.onEnd}>
          <Text style={styles.controlText}>Encerrar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recording: { color: '#c0392b', fontWeight: 'bold', fontSize: 16 },
  paused: { color: '#7f8c8d', fontWeight: 'bold', fontSize: 16 },
  banner: { backgroundColor: '#fdf3d0', borderRadius: 8, padding: 10, marginTop: 12 },
  bannerText: { color: '#7a5d00' },
  body: { flex: 1, marginTop: 12 },
  draft: { color: '#555', fontStyle: 'italic', marginBottom: 12 },
  emptyTitle: { fontWeight: 'bold', marginBottom: 8 },
  sectionCovered: { color: '#1e8449', marginBottom: 4 },
  sectionPending: { color: '#666', marginBottom: 4 },
  suggestion: { backgroundColor: '#eef3f8', borderRadius: 8, padding: 10, marginTop: 8 },
  suggestionSection: { fontSize: 12, color: '#5d6d7e' },
  suggestionQuestion: { fontSize: 15, marginTop: 2 },
  dismiss: { color: '#2471a3', marginTop: 6 },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  control: { flex: 1, backgroundColor: '#2c3e50', borderRadius: 8, padding: 14, alignItems: 'center' },
  end: { backgroundColor: '#c0392b' },
  controlText: { color: 'white', fontWeight: 'bold' },
});
