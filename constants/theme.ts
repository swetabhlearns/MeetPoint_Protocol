/**
 * MeetPoint Protocol - Design System
 * "Code meets Vogue" - High-Contrast Editorial aesthetic
 */

export const colors = {
  // Backgrounds
  background: '#050505',
  surface: '#121212',
  surfaceElevated: '#1a1a1a',

  // Text
  textPrimary: '#EAEAEA',
  textSecondary: '#666',
  textMuted: '#444',

  // Accents
  accent: '#E07A5F',      // Terracotta - primary action
  accentCyan: '#00F0FF',  // Cyan - AI/tech elements
  accentPurple: '#9D00FF', // Purple - "their" location
  accentGreen: '#00FF9D', // Green - success/open
  accentRed: '#FF006E',   // Red - error

  // Borders
  border: '#333',
  borderLight: '#444',
} as const;

export const fonts = {
  // Headers - Editorial serif
  displayRegular: 'PlayfairDisplay_400Regular',
  displayBoldItalic: 'PlayfairDisplay_700Bold_Italic',

  // Data/UI - Monospace
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fab: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
} as const;

export type Colors = typeof colors;
export type Fonts = typeof fonts;

// Backwards compatibility for existing theme hooks
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: colors.accent,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: colors.accent,
  },
  dark: {
    text: colors.textPrimary,
    background: colors.background,
    tint: colors.accent,
    icon: colors.textSecondary,
    tabIconDefault: colors.textSecondary,
    tabIconSelected: colors.accent,
  },
};
