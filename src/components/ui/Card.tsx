import React from 'react';
import { StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';
import { colors, fonts, radii, spacing, typeScale } from './theme';

/** Superfície de container — porta do `Card` (shadcn/Radix) do design system elucas.dev. */
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

export function CardHeader({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.header, style]} />;
}

export function CardTitle({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.title, style]} />;
}

export function CardDescription({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.description, style]} />;
}

export function CardContent({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.content, style]} />;
}

export function CardFooter({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.footer, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { padding: spacing.md, gap: spacing.xs },
  title: { fontFamily: fonts.sansSemiBold, fontSize: typeScale.h3, color: colors.cardForeground },
  description: { fontFamily: fonts.sans, fontSize: typeScale.bodySm, color: colors.mutedForeground },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
