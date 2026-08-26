/**
 * V-Care Ultra-Premium Design System & Global Theme Tokens
 * Mobile Architecture Standard
 */

export const COLORS = {
  // Brand Primary: Crimson Blood Red
  primary: '#D32F2F',
  primaryLight: '#E53935',
  primaryDark: '#9A0007',
  primaryContainer: '#FFEBEE',
  primaryOnContainer: '#B71C1C',

  // Brand Secondary: Deep Royal Navy
  secondary: '#1E3A8A',
  secondaryLight: '#2563EB',
  secondaryDark: '#1E293B',
  secondaryContainer: '#EFF6FF',
  secondaryOnContainer: '#1E40AF',

  // Brand Tertiary / Accent: Warm Amber Gold
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentContainer: '#FEF3C7',
  accentOnContainer: '#B45309',

  // Status & Feedback
  success: '#10B981',
  successContainer: '#D1FAE5',
  warning: '#F59E0B',
  warningContainer: '#FEF3C7',
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  info: '#3B82F6',

  // Neutrals & Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  // Text Hierarchy
  textMain: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  textLight: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#F1F5F9',

  // Overlay / Glassmorphism
  overlay: 'rgba(15, 23, 42, 0.4)',
  glassBackground: 'rgba(255, 255, 255, 0.85)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryGlow: {
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: COLORS.textMain,
  },
  h2: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: COLORS.textMain,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: COLORS.textMain,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: COLORS.textMain,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    color: COLORS.textMain,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  button: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
};

const theme = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  typography: TYPOGRAPHY,
};

export default theme;
