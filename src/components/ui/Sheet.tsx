import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';
import { colors, fonts, radii, spacing, typeScale } from './theme';

export type SheetSide = 'bottom' | 'top' | 'left' | 'right';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: SheetSide;
  children: React.ReactNode;
}

const SIDE_STYLE: Record<SheetSide, object> = {
  bottom: { justifyContent: 'flex-end' },
  top: { justifyContent: 'flex-start' },
  left: { justifyContent: 'flex-start', flexDirection: 'row' },
  right: { justifyContent: 'flex-end', flexDirection: 'row' },
};

const PANEL_SHAPE: Record<SheetSide, object> = {
  bottom: { width: '100%', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  top: { width: '100%', borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  left: { height: '100%', width: '75%', maxWidth: 384 },
  right: { height: '100%', width: '75%', maxWidth: 384 },
};

/**
 * Painel deslizante ancorado a uma borda da tela — porta do `Sheet` (Radix Dialog) do
 * design system elucas.dev. No mobile, `side="bottom"` é o padrão mais natural (menu/detalhe).
 */
export function Sheet({ open, onOpenChange, side = 'bottom', children }: SheetProps) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <View style={[styles.overlayContainer, SIDE_STYLE[side]]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onOpenChange(false)} accessibilityLabel="Fechar" />
        <View style={[styles.panel, PANEL_SHAPE[side]]}>{children}</View>
      </View>
    </Modal>
  );
}

export function SheetHeader({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.header, style]} />;
}

export function SheetTitle({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.title, style]} />;
}

export function SheetDescription({ style, ...props }: TextProps) {
  return <Text {...props} style={[styles.description, style]} />;
}

export function SheetFooter({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.footer, style]} />;
}

export function SheetClose({ onPress, ...props }: { onPress: () => void; children: React.ReactNode }) {
  return <Pressable onPress={onPress} style={styles.close} {...props} />;
}

const styles = StyleSheet.create({
  overlayContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  title: { fontFamily: fonts.sansSemiBold, fontSize: typeScale.h3, color: colors.cardForeground },
  description: { fontFamily: fonts.sans, fontSize: typeScale.bodySm, color: colors.mutedForeground },
  footer: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  close: { alignSelf: 'flex-end' },
});
