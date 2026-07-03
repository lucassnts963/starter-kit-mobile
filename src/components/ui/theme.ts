/**
 * Tokens do design system elucas.dev (handoff via claude.ai/design, portfolio-one).
 * Fonte da verdade: `--ds tokens` (HSL) do bundle do design system. Dark-only, um único
 * acento vermelho — nunca introduzir azul/verde/roxo paralelo (ver README do handoff).
 */
export const colors = {
  background: '#0C0C0F',
  foreground: '#ECECEF',
  card: '#16161A',
  cardForeground: '#ECECEF',
  secondary: '#1E1E23',
  secondaryForeground: '#B4B4BC',
  muted: '#16161A',
  mutedForeground: '#87878F',
  border: 'rgba(255,255,255,0.08)',
  primary: '#E5484D',
  primaryForeground: '#FFFFFF',
  accentTint: 'rgba(229,72,77,0.12)',
  accentTintBorder: 'rgba(229,72,77,0.30)',
  accentSoft: '#F08A8D',
  accentHover: '#F25A5F',
} as const;

export const radii = {
  sm: 8,
  lg: 12,
  full: 999,
} as const;

/** Grid de 8pt (gap-2=8, gap-4=16, p-6=24, p-12=48). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fonts = {
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemiBold: 'IBMPlexSans_600SemiBold',
  sansBold: 'IBMPlexSans_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

/** Escala tipográfica modular ~1.25, adaptada de tamanhos web para mobile. */
export const typeScale = {
  display: 32,
  h1: 26,
  h2: 22,
  h3: 18,
  body: 15,
  bodySm: 13,
  eyebrow: 11,
} as const;
