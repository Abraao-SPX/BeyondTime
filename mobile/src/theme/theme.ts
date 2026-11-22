export const SUPPORT_EMAIL = 'suporte.beyondtime@gmail.com';

export interface BeyondTimePalette {
  background: string;
  surface: string;
  surfaceSoft: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryHover: string;
  primaryText: string;
  primarySoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  verifiedText: string;
  verifiedBg: string;
  errorText: string;
  errorBg: string;
  cameraPreviewBg: string;
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
  borderStrong: '#A90025',
  primary: '#A90025',      // Carmim 600 institucional (contraste 7.37:1 com branco — AAA)
  primaryHover: '#84001D', // Carmim 700
  primaryText: '#A90025',  // Texto/link carmim sobre fundos claros (> 6.4:1 AA/AAA)
  primarySoft: '#FDEBF1',
  textPrimary: '#2A1A20',
  textSecondary: '#5E4850',
  textMuted: '#6E5A62',
  textOnPrimary: '#FFFFFF',
  verifiedText: '#1F633B',
  verifiedBg: '#E6F2EA',
  errorText: '#9E1C2B',
  errorBg: '#FDECEF',
  cameraPreviewBg: '#1E1519',
  overlay: 'rgba(28, 16, 20, 0.72)',
  isDark: false,
};

export const DARK_PALETTE: BeyondTimePalette = {
  background: '#141012',
  surface: '#1F181B',
  surfaceSoft: '#2E1C23',
  border: '#3F2D34',
  borderStrong: '#FF94AC',
  primary: '#A90025',      // Fundo de botão primário (7.37:1 com branco — AAA)
  primaryHover: '#84001D',
  primaryText: '#FF94AC',  // Texto/link rosado claro sobre fundos escuros (> 7.1:1 AAA)
  primarySoft: '#351B24',
  textPrimary: '#FAF5F6',
  textSecondary: '#DECED3',
  textMuted: '#BCA9B0',
  textOnPrimary: '#FFFFFF',
  verifiedText: '#7AE2A6',
  verifiedBg: '#163222',
  errorText: '#FF8A97',
  errorBg: '#3A1920',
  cameraPreviewBg: '#1E1519',
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
export const BUTTON_HEIGHT_PRIMARY = 60;
export const BUTTON_RADIUS = 18;
