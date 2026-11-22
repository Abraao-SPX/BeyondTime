import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { TOUCH_TARGET_MIN } from '../theme/theme';
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

/**
 * Botão acessível 50+ (RF-06 & RF-09):
 * - Altura mínima garantida de 52dp (>= 48dp).
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
          text: palette.primary,
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
          text: palette.primary,
        };
    }
  };

  const colors = getColors();

  return (
    <TouchableOpacity
      onPress={onPress}
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
          opacity: disabled ? 0.5 : 1,
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
    minHeight: Math.max(52, TOUCH_TARGET_MIN),
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
