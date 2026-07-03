import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from './theme';

export interface AvatarProps {
  size?: number;
  source?: { uri: string } | null;
  /** 1–2 iniciais mostradas enquanto a imagem carrega ou se ela falhar. */
  fallback: string;
}

/** Imagem circular de usuário/marca com fallback textual — porta do `Avatar` (Radix). */
export function Avatar({ size = 40, source, fallback }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (!source || failed) {
    return (
      <View style={[styles.fallback, dimension]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>{fallback.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }

  return <Image source={source} style={dimension} onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { fontFamily: fonts.sansMedium, color: colors.mutedForeground },
});
