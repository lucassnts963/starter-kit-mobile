import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors, fonts, radii, spacing, typeScale } from '../components/ui/theme';

/**
 * Player de áudio da reunião (ouvir depois). Passthrough fino sobre expo-audio — sem lógica de
 * negócio, validado em aparelho (fora do coverage de CI, como os demais adapters em `src/expo/`).
 * Toca os segmentos em sequência, avançando automaticamente quando um termina.
 */
export function AudioPlayer({ segments }: { segments: string[] }) {
  const [index, setIndex] = useState(0);
  const player = useAudioPlayer(segments[index] ?? null);
  const status = useAudioPlayerStatus(player);

  // avança para o próximo segmento quando o atual termina
  useEffect(() => {
    if (status.didJustFinish && index < segments.length - 1) {
      setIndex((i) => i + 1);
    }
  }, [status.didJustFinish, index, segments.length]);

  useEffect(() => {
    // ao trocar de segmento, começa a tocar automaticamente se já estávamos tocando
    if (index > 0) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (segments.length === 0) return null;

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const toggle = () => (status.playing ? player.pause() : player.play());

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable style={styles.playBtn} onPress={toggle}>
          <Text style={styles.playIcon}>{status.playing ? '❚❚' : '▶'}</Text>
        </Pressable>
        <View style={styles.info}>
          <Text style={styles.label}>
            Áudio da reunião{segments.length > 1 ? ` — parte ${index + 1}/${segments.length}` : ''}
          </Text>
          <Text style={styles.time}>
            {fmt(status.currentTime)} / {fmt(status.duration)}
          </Text>
        </View>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.sm + 4,
    marginTop: spacing.sm + 4,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: colors.primaryForeground, fontFamily: fonts.sansBold, fontSize: typeScale.body },
  info: { flex: 1 },
  label: { color: colors.foreground, fontFamily: fonts.sansMedium, fontSize: typeScale.bodySm },
  time: { color: colors.mutedForeground, fontFamily: fonts.mono, fontSize: typeScale.eyebrow, marginTop: 2 },
  track: { height: 4, backgroundColor: colors.secondary, borderRadius: radii.full, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.primary },
});
