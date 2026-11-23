import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AccessibleButton } from './AccessibleButton';
import { BeyondTimeSymbol } from './BeyondTimeLogo';

interface DefensiveExitModalProps {
  visible: boolean;
  onStay: () => void;
  onConfirmExit: () => void;
}

/**
 * Tela 11 — Modal de Confirmação de Saída (RF-06 — UX Defensiva):
 * Protege o usuário 50+ contra abandono acidental de dados preenchidos.
 */
export function DefensiveExitModal({
  visible,
  onStay,
  onConfirmExit,
}: DefensiveExitModalProps) {
  const { palette, fs } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onStay}
    >
      <View style={[styles.overlay, { backgroundColor: palette.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.logoWrap}>
            <BeyondTimeSymbol size={42} />
          </View>

          <Text
            style={[
              styles.title,
              { color: palette.textPrimary, fontSize: fs(22) },
            ]}
          >
            Deseja sair e apagar os dados preenchidos?
          </Text>

          <Text
            style={[
              styles.description,
              { color: palette.textSecondary, fontSize: fs(16) },
            ]}
          >
            Se você voltar agora, as informações digitadas neste cadastro serão perdidas.
          </Text>

          <View style={styles.actions}>
            <AccessibleButton
              label="Continuar preenchendo cadastro"
              variant="primary"
              onPress={onStay}
            />
            <AccessibleButton
              label="Sim, sair e descartar dados"
              variant="outline"
              onPress={onConfirmExit}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 34,
    gap: 14,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 6,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
});
