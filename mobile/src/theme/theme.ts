export const SUPPORT_EMAIL = 'suporte.beyondtime@gmail.com';

export interface BeyondTimePalette {
  background: string;
  surface: string;
  surfaceSoft: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  verifiedText: string;
  verifiedBg: string;
  errorText: string;
  errorBg: string;
  overlay: string;
  isDark: boolean;
}

/**
 * Paleta Institucional Onda 1 — BeyondTime (50+)
 * Contraste WCAG 2.1 AA/AAA em tema claro e modo noturno.
 */
export const LIGHT_PALETTE: BeyondTimePalette = {
  background: '#FFF9F8',
  surface: '#FFFFFF',
  surfaceSoft: '#FDEBF1',
  border: '#EBD9DE',
  borderStrong: '#8B263E',
  primary: '#8B263E',      // Vinho/Bordô institucional (contraste > 7.5:1 com branco)
  primaryHover: '#6B1D2F', // Vinho profundo
  primarySoft: '#FDEBF1',
  textPrimary: '#2A1A20',
  textSecondary: '#5E4850',
  textMuted: '#6E5A62',
  textOnPrimary: '#FFFFFF',
  verifiedText: '#1F633B',
  verifiedBg: '#E6F2EA',
  errorText: '#9E1C2B',
  errorBg: '#FDECEF',
  overlay: 'rgba(28, 16, 20, 0.72)',
  isDark: false,
};

export const DARK_PALETTE: BeyondTimePalette = {
  background: '#141012',
  surface: '#1F181B',
  surfaceSoft: '#2E1C23',
  border: '#3F2D34',
  borderStrong: '#E88DA1',
  primary: '#B53352',      // Vinho luminoso para contraste AAA no escuro
  primaryHover: '#8B263E',
  primarySoft: '#351B24',
  textPrimary: '#FAF5F6',
  textSecondary: '#DECED3',
  textMuted: '#BCA9B0',
  textOnPrimary: '#FFFFFF',
  verifiedText: '#7AE2A6',
  verifiedBg: '#163222',
  errorText: '#FF8A97',
  errorBg: '#3A1920',
  overlay: 'rgba(0, 0, 0, 0.84)',
  isDark: true,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const TOUCH_TARGET_MIN = 48;
