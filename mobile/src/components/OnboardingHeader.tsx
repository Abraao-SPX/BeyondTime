import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { ChevronLeftIcon, MoonIcon, SunIcon } from './Icons';

interface OnboardingHeaderProps {
  onBack: () => void;
  backLabel?: string;
  stepCurrent?: number;
  stepTotal?: number;
  showThemeToggle?: boolean;
}

/**
 * Cabeçalho padronizado de navegação (RF-06 & RF-09):
 * - Botão Voltar sempre com ícone + rótulo visível (>= 48dp).
 * - Indicador claro de progresso por etapas.
 */
export function OnboardingHeader({
  onBack,
  backLabel = 'Voltar',
  stepCurrent,
  stepTotal,
  showThemeToggle = false,
}: OnboardingHeaderProps) {
  const { palette, isDark, toggleTheme, fs } = useTheme();
  const progressRatio =
    stepCurrent && stepTotal ? Math.min(1, Math.max(0, stepCurrent / stepTotal)) : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={styles.backButton}
        >
          <ChevronLeftIcon size={22} color={palette.textPrimary} />
          <Text
            style={[
              styles.backText,
              { color: palette.textPrimary, fontSize: fs(16) },
            ]}
          >
            {backLabel}
          </Text>
        </TouchableOpacity>

        <View style={styles.rightArea}>
          {stepCurrent && stepTotal ? (
            <Text
              style={[
                styles.stepText,
                { color: palette.textSecondary, fontSize: fs(15) },
              ]}
            >
              Passo {stepCurrent} de {stepTotal}
            </Text>
          ) : null}

          {showThemeToggle ? (
            <TouchableOpacity
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Ativar tema claro' : 'Ativar modo noturno'}
              style={[
                styles.themeButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              {isDark ? (
                <SunIcon size={18} color={palette.textPrimary} />
              ) : (
                <MoonIcon size={18} color={palette.textPrimary} />
              )}
              <Text
                style={[
                  styles.themeText,
                  { color: palette.textPrimary, fontSize: fs(13) },
                ]}
              >
                {isDark ? 'Claro' : 'Escuro'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {stepCurrent && stepTotal ? (
        <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: palette.primary,
                width: `${Math.round(progressRatio * 100)}%`,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minHeight: TOUCH_TARGET_MIN,
    minWidth: TOUCH_TARGET_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 12,
  },
  backText: {
    fontWeight: '700',
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontWeight: '600',
  },
  themeButton: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeText: {
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
