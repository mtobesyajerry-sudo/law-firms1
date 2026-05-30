// Shared design tokens consumed by CreateClientForm and other donor components.
// These values mirror the existing dashboard aesthetic (neutral blues, 8px grid).

export const colors = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  secondary: '#64748b',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderFocus: '#2563eb',
  textPrimary: '#1a202c',
  textSecondary: '#4a5568',
  textMuted: '#718096',
  textInverse: '#ffffff',
  // Risk level colours
  riskLow: '#059669',
  riskMedium: '#d97706',
  riskHigh: '#dc2626',
  riskVeryHigh: '#7f1d1d',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 2px 8px rgba(0,0,0,0.10)',
  lg: '0 4px 16px rgba(0,0,0,0.12)',
};

export const contentCard = {
  background: colors.surface,
  borderRadius: borderRadius.lg,
  border: `1px solid ${colors.border}`,
  boxShadow: shadows.sm,
  padding: spacing.xl,
};

export const primaryButton = {
  padding: '10px 20px',
  background: colors.primary,
  color: colors.textInverse,
  border: 'none',
  borderRadius: borderRadius.md,
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background 0.2s',
};
