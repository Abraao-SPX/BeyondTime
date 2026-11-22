import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { EyeClosedIcon, EyeOpenIcon } from './Icons';

interface PasswordInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
}

/**
 * Campo de senha reutilizável (RF-06 & RF-09):
 * - Alternador com olho aberto (visível) / olho riscado (oculta).
 * - Alvo de toque mínimo de 48x48dp no botão de visibilidade.
 */
export function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder = 'Digite sua senha',
  helperText,
  errorText,
}: PasswordInputProps) {
  const { palette, fs } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
        {label}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: palette.surface,
            borderColor: errorText ? palette.errorText : palette.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          style={[
            styles.input,
            {
              color: palette.textPrimary,
              fontSize: fs(16),
            },
          ]}
        />
        <TouchableOpacity
          onPress={() => setVisible((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
          style={styles.toggleBtn}
        >
          {visible ? (
            <EyeOpenIcon size={22} color={palette.primary} />
          ) : (
            <EyeClosedIcon size={22} color={palette.textSecondary} />
          )}
          <Text
            style={[
              styles.toggleText,
              { color: palette.textSecondary, fontSize: fs(12) },
            ]}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </Text>
        </TouchableOpacity>
      </View>

      {errorText ? (
        <Text style={[styles.error, { color: palette.errorText, fontSize: fs(14) }]}>
          {errorText}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: palette.textSecondary, fontSize: fs(14) }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontWeight: '700',
  },
  inputWrapper: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  toggleBtn: {
    minWidth: TOUCH_TARGET_MIN,
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  toggleText: {
    fontWeight: '600',
  },
  helper: {
    lineHeight: 20,
  },
  error: {
    fontWeight: '600',
    lineHeight: 20,
  },
});
