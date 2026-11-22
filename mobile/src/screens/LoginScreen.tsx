import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { BeyondTimeLogo } from '../components/BeyondTimeLogo';
import { LockIcon, LogInIcon, MailIcon, UserPlusIcon } from '../components/Icons';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { PasswordInput } from '../components/PasswordInput';
import { SUPPORT_EMAIL, TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

interface LoginScreenProps {
  onBack: () => void;
  onGoToRegister: () => void;
  onLoginSuccess: (contact: string) => void;
}

/**
 * Tela de Login e Recuperação de Senha (RF-01, RF-06, RF-09):
 * - Formulário limpo (sem checkbox redundante "Manter conectado").
 * - Alternador de senha reutilizável com olho aberto/fechado.
 * - Botão "Voltar ao login" limpo na recuperação de senha.
 */
export function LoginScreen({
  onBack,
  onGoToRegister,
  onLoginSuccess,
}: LoginScreenProps) {
  const { palette, fs } = useTheme();

  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);

  const handleSubmitLogin = () => {
    setErrorMessage(null);
    if (!contact.trim()) {
      setErrorMessage('Por favor, informe seu e-mail ou telefone.');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMessage('Digite sua senha com pelo menos 6 caracteres.');
      return;
    }
    onLoginSuccess(contact.trim());
  };

  const handleSocialLogin = (provider: 'Google' | 'Facebook') => {
    setErrorMessage(null);
    onLoginSuccess(`conta.${provider.toLowerCase()}@beyondtime.app`);
  };

  const handleSendRecovery = () => {
    setErrorMessage(null);
    if (!contact.trim()) {
      setErrorMessage('Informe o e-mail ou telefone cadastrado para enviarmos as instruções.');
      return;
    }
    setRecoverySent(true);
  };

  const handleSupportEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Ajuda%20no%20Acesso%20BeyondTime`).catch(
      () => undefined
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OnboardingHeader
        onBack={mode === 'recover' ? () => { setMode('login'); setRecoverySent(false); setErrorMessage(null); } : onBack}
        backLabel={mode === 'recover' ? 'Voltar ao login' : 'Início'}
        showThemeToggle
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <BeyondTimeLogo symbolSize={44} wordmarkSize={24} />
        </View>

        {mode === 'login' ? (
          <View style={styles.form}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Que bom ver você de volta
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Entre com seus dados para continuar suas conversas com tranquilidade.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
                Seu e-mail ou telefone
              </Text>
              <TextInput
                value={contact}
                onChangeText={(text) => {
                  setContact(text);
                  setErrorMessage(null);
                }}
                placeholder="Ex: marlene@email.com"
                placeholderTextColor={palette.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Seu e-mail ou telefone"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                    fontSize: fs(16),
                  },
                ]}
              />
            </View>

            <PasswordInput
              label="Sua senha"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrorMessage(null);
              }}
              placeholder="Digite sua senha"
            />

            <TouchableOpacity
              onPress={() => {
                setErrorMessage(null);
                setRecoverySent(false);
                setMode('recover');
              }}
              accessibilityRole="button"
              accessibilityLabel="Esqueci minha senha"
              style={styles.forgotLink}
            >
              <LockIcon size={16} color={palette.primary} />
              <Text style={[styles.forgotText, { color: palette.primary, fontSize: fs(15) }]}>
                Esqueci minha senha
              </Text>
            </TouchableOpacity>

            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: palette.errorBg, borderColor: palette.errorText },
                ]}
              >
                <Text style={[styles.errorText, { color: palette.errorText, fontSize: fs(15) }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <AccessibleButton
              label="Entrar na minha conta"
              variant="primary"
              onPress={handleSubmitLogin}
              iconLeft={<LogInIcon size={20} color={palette.textOnPrimary} />}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
              <Text style={[styles.dividerText, { color: palette.textMuted, fontSize: fs(14) }]}>
                ou entre com
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            </View>

            <View style={styles.socialGroup}>
              <AccessibleButton
                label="Entrar com Google"
                variant="outline"
                onPress={() => handleSocialLogin('Google')}
              />
              <AccessibleButton
                label="Entrar com Facebook"
                variant="outline"
                onPress={() => handleSocialLogin('Facebook')}
              />
            </View>

            <View style={styles.registerPrompt}>
              <Text style={[styles.promptText, { color: palette.textSecondary, fontSize: fs(16) }]}>
                Ainda não tem conta?
              </Text>
              <AccessibleButton
                label="Criar minha conta"
                variant="secondary"
                onPress={onGoToRegister}
                iconLeft={<UserPlusIcon size={20} color={palette.primary} />}
              />
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Recuperar senha
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Digite o e-mail ou telefone usado no seu cadastro. Vamos enviar um código
              para você criar uma nova senha com segurança.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
                E-mail ou telefone cadastrado
              </Text>
              <TextInput
                value={contact}
                onChangeText={(text) => {
                  setContact(text);
                  setErrorMessage(null);
                }}
                placeholder="Ex: marlene@email.com"
                placeholderTextColor={palette.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                    fontSize: fs(16),
                  },
                ]}
              />
            </View>

            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: palette.errorBg, borderColor: palette.errorText },
                ]}
              >
                <Text style={[styles.errorText, { color: palette.errorText, fontSize: fs(15) }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {recoverySent ? (
              <View
                style={[
                  styles.successBox,
                  { backgroundColor: palette.verifiedBg, borderColor: palette.verifiedText },
                ]}
              >
                <Text style={[styles.successText, { color: palette.verifiedText, fontSize: fs(15) }]}>
                  Instruções enviadas para {contact}. Verifique sua caixa de entrada e a
                  pasta de spam.
                </Text>
              </View>
            ) : null}

            <AccessibleButton
              label="Enviar instruções de recuperação"
              variant="primary"
              onPress={handleSendRecovery}
              iconLeft={<MailIcon size={20} color={palette.textOnPrimary} />}
            />

            <TouchableOpacity
              onPress={() => {
                setMode('login');
                setRecoverySent(false);
                setErrorMessage(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Voltar ao login"
              style={styles.cleanBackLoginBtn}
            >
              <Text
                style={[
                  styles.cleanBackLoginText,
                  { color: palette.primary, fontSize: fs(16) },
                ]}
              >
                Voltar ao login
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSupportEmail}
          accessibilityRole="link"
          style={styles.supportRow}
        >
          <MailIcon size={18} color={palette.primary} />
          <Text style={[styles.supportText, { color: palette.textSecondary, fontSize: fs(14) }]}>
            Dúvidas no acesso?{' '}
            <Text style={{ color: palette.primary, fontWeight: '700', textDecorationLine: 'underline' }}>
              {SUPPORT_EMAIL}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 18,
  },
  logoWrap: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  form: {
    gap: 16,
  },
  title: {
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: {
    lineHeight: 24,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  forgotLink: {
    minHeight: TOUCH_TARGET_MIN,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forgotText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  errorText: {
    fontWeight: '600',
    lineHeight: 22,
  },
  successBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  successText: {
    fontWeight: '600',
    lineHeight: 22,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontWeight: '600',
  },
  socialGroup: {
    gap: 10,
  },
  registerPrompt: {
    marginTop: 8,
    gap: 10,
  },
  promptText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  cleanBackLoginBtn: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanBackLoginText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  supportRow: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  supportText: {
    textAlign: 'center',
  },
});
