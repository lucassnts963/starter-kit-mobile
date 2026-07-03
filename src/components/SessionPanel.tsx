import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MeetingType } from '../domain/meeting-type';
import type { Coverage, QuestionSuggestion } from '../domain/coverage';
import { colors, fonts, radii, spacing, typeScale } from './ui/theme';

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
            <Text style={styles.controlTextGhost}>Pausar</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.control} onPress={props.onResume}>
            <Text style={styles.controlTextGhost}>Retomar</Text>
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
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recording: { color: colors.primary, fontFamily: fonts.sansSemiBold, fontSize: typeScale.h3 },
  paused: { color: colors.mutedForeground, fontFamily: fonts.sansSemiBold, fontSize: typeScale.h3 },
  banner: { backgroundColor: colors.accentTint, borderRadius: radii.sm, padding: spacing.sm + 2, marginTop: spacing.md },
  bannerText: { color: colors.accentSoft, fontFamily: fonts.sans, fontSize: typeScale.bodySm },
  body: { flex: 1, marginTop: spacing.md },
  draft: { color: colors.secondaryForeground, fontFamily: fonts.sans, fontStyle: 'italic', marginBottom: spacing.md },
  emptyTitle: { color: colors.foreground, fontFamily: fonts.sansSemiBold, marginBottom: spacing.sm },
  sectionCovered: { color: colors.foreground, fontFamily: fonts.sansSemiBold, marginBottom: spacing.xs },
  sectionPending: { color: colors.mutedForeground, fontFamily: fonts.sans, marginBottom: spacing.xs },
  suggestion: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.sm + 2, marginTop: spacing.sm },
  suggestionSection: { fontSize: typeScale.eyebrow, color: colors.mutedForeground, fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionQuestion: { fontSize: typeScale.body, color: colors.cardForeground, fontFamily: fonts.sans, marginTop: spacing.xs },
  dismiss: { color: colors.accentSoft, fontFamily: fonts.sansMedium, marginTop: spacing.sm - 2 },
  controls: { flexDirection: 'row', gap: spacing.sm + 4, marginTop: spacing.md },
  control: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.md - 2,
    alignItems: 'center',
  },
  end: { backgroundColor: colors.primary, borderColor: colors.primary },
  controlText: { color: colors.primaryForeground, fontFamily: fonts.sansSemiBold },
  controlTextGhost: { color: colors.foreground, fontFamily: fonts.sansSemiBold },
});
