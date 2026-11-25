import React, { useRef } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { BUTTON_HEIGHT_PRIMARY, BUTTON_RADIUS } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const DOUBLE_TAP_GUARD_MS = 400;

/**
 * Botão acessível 50+ (RF-06 & RF-09):
 * - Altura mínima de 60dp (>= 48dp), raio 18dp.
 * - Proteção contra toque duplo acidental (400ms).
 * - Sempre exibe legenda textual visível (nunca ícone isolado).
 */
export function AccessibleButton({
  label,
  onPress,
  variant = 'primary',
  iconLeft,
  iconRight,
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: AccessibleButtonProps) {
  const { palette, fs } = useTheme();
  const lastPressRef = useRef<number>(0);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastPressRef.current < DOUBLE_TAP_GUARD_MS) {
      return;
    }
    lastPressRef.current = now;
    onPress();
  };

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: palette.primary,
          border: palette.primary,
          text: palette.textOnPrimary,
        };
      case 'secondary':
        return {
          bg: palette.primarySoft,
          border: palette.border,
          text: palette.primaryText,
        };
      case 'outline':
        return {
          bg: palette.surface,
          border: palette.borderStrong,
          text: palette.textPrimary,
        };
      case 'danger':
        return {
          bg: palette.errorBg,
          border: palette.errorText,
          text: palette.errorText,
        };
      case 'ghost':
      default:
        return {
          bg: 'transparent',
          border: 'transparent',
          text: palette.primaryText,
        };
    }
  };

  const colors = getColors();

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.button,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: variant === 'ghost' ? 0 : 1.5,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <View style={styles.content}>
          {iconLeft ? <View style={styles.iconSlot}>{iconLeft}</View> : null}
          <Text
            style={[
              styles.label,
              {
                color: colors.text,
                fontSize: fs(17),
              },
            ]}
          >
            {label}
          </Text>
          {iconRight ? <View style={styles.iconSlot}>{iconRight}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: BUTTON_HEIGHT_PRIMARY,
    borderRadius: BUTTON_RADIUS,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
