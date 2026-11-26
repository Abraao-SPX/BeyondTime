import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { BeyondTimePalette, DARK_PALETTE, LIGHT_PALETTE } from './theme';

export type FontScaleOption = 1 | 1.15 | 1.3 | 1.45 | 1.6;

const VALID_FONT_SCALES: FontScaleOption[] = [1, 1.15, 1.3, 1.45, 1.6];
const STORAGE_FONT_SCALE_KEY = 'beyondtime_rf09_font_scale_v1';
const STORAGE_DARK_MODE_KEY = 'beyondtime_rf09_dark_mode_v1';

interface ThemeContextValue {
  palette: BeyondTimePalette;
  isDark: boolean;
  fontScale: FontScaleOption;
  toggleTheme: () => void;
  cycleFontScale: () => void;
  fs: (baseSize: number) => number;
  lh: (baseLineHeight: number) => number;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [fontScale, setFontScale] = useState<FontScaleOption>(1);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [savedScale, savedDark] = await Promise.all([
          AsyncStorage.getItem(STORAGE_FONT_SCALE_KEY),
          AsyncStorage.getItem(STORAGE_DARK_MODE_KEY),
        ]);
        if (!active) return;
        if (savedScale) {
          const parsed = Number(savedScale) as FontScaleOption;
          if (VALID_FONT_SCALES.includes(parsed)) {
            setFontScale(parsed);
          }
        }
        if (savedDark === 'true' || savedDark === 'false') {
          setIsDark(savedDark === 'true');
        }
      } catch {
        // mantém padrão seguro se storage local falhar
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(STORAGE_DARK_MODE_KEY, String(next)).catch(() => undefined);
      return next;
    });
  };

  const cycleFontScale = () => {
    setFontScale((prev) => {
      const idx = VALID_FONT_SCALES.indexOf(prev);
      const next = VALID_FONT_SCALES[(idx + 1) % VALID_FONT_SCALES.length];
      void AsyncStorage.setItem(STORAGE_FONT_SCALE_KEY, String(next)).catch(() => undefined);
      return next;
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
      lh: (baseLineHeight: number) => Math.round(baseLineHeight * fontScale),
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
