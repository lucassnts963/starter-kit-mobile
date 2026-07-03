import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { colors } from './theme';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle;
}

/** Divisória fina entre seções — porta do `Separator` (Radix) do design system elucas.dev. */
export function Separator({ orientation = 'horizontal', style }: SeparatorProps) {
  const dimension: ViewStyle =
    orientation === 'vertical' ? { width: 1, alignSelf: 'stretch' } : { height: 1, width: '100%' };
  return <View testID="separator" style={[{ backgroundColor: colors.border }, dimension, style]} />;
}
