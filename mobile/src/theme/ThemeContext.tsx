import React, { createContext, useContext, useMemo, useState } from 'react';
import { BeyondTimePalette, DARK_PALETTE, LIGHT_PALETTE } from './theme';

export type FontScaleOption = 1 | 1.15 | 1.3;

interface ThemeContextValue {
  palette: BeyondTimePalette;
  isDark: boolean;
  fontScale: FontScaleOption;
  toggleTheme: () => void;
  cycleFontScale: () => void;
  fs: (baseSize: number) => number;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [fontScale, setFontScale] = useState<FontScaleOption>(1);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const cycleFontScale = () => {
    setFontScale((prev) => {
      if (prev === 1) return 1.15;
      if (prev === 1.15) return 1.3;
      return 1;
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      palette: isDark ? DARK_PALETTE : LIGHT_PALETTE,
      isDark,
      fontScale,
      toggleTheme,
      cycleFontScale,
      fs: (baseSize: number) => Math.round(baseSize * fontScale),
    }),
    [isDark, fontScale]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return ctx;
}
