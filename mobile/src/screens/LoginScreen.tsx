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
import {
  FacebookIcon,
  GoogleIcon,
  LockIcon,
  LogInIcon,
  MailIcon,
  UserPlusIcon,
} from '../components/Icons';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { PasswordInput } from '../components/PasswordInput';
import {
  ApiError,
  confirmPasswordReset,
  fetchMyProfile,
  loginWithEmail,
  requestPasswordReset,
  type AuthSession,
  type ServerProfile,
} from '../services/authService';
import { SUPPORT_EMAIL, TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

interface LoginScreenProps {
  onBack: () => void;
  onGoToRegister: () => void;
  onLoginSuccess: (
    contact: string,
    session: AuthSession,
    profile: ServerProfile | null
  ) => void;
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
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const handleSubmitLogin = async () => {
    setErrorMessage(null);
    setSocialNotice(null);
    if (!contact.trim()) {
      setErrorMessage('Por favor, informe seu e-mail ou telefone para continuar.');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMessage('Sua senha precisa ter pelo menos 6 caracteres sem contar espaços.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await loginWithEmail(contact.trim(), password);
      let profile: ServerProfile | null = null;
      try {
        profile = await fetchMyProfile(session);
      } catch {
        profile = null;
      }
      onLoginSuccess(contact.trim(), session, profile);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível entrar agora. Tente novamente em instantes.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: 'Google' | 'Facebook') => {
    setErrorMessage(null);
    setSocialNotice(
      `O acesso direto com ${provider} está em fase final de integração neste aplicativo. Por enquanto, você pode entrar com seu e-mail e senha acima.`
    );
  };

  const handleSendRecovery = async () => {
    setErrorMessage(null);
    setRecoveryMessage(null);
    if (!contact.trim()) {
      setErrorMessage('Informe o e-mail cadastrado para enviarmos as instruções.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestPasswordReset(contact.trim());
      setRecoverySent(true);
      setRecoveryMessage(
        res.message ||
          `Instruções enviadas para ${contact.trim()}. Verifique sua caixa de entrada e a pasta de spam.`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível solicitar a recuperação de senha.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async () => {
    setErrorMessage(null);
    if (!resetCode.trim()) {
      setErrorMessage('Informe o código de verificação recebido no e-mail.');
      return;
    }
    if (newPassword.trim().length < 8) {
      setErrorMessage('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('As duas senhas ficaram diferentes. Vamos conferir com calma.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(
        contact.trim(),
        resetCode.trim(),
        newPassword,
        confirmNewPassword
      );
      setMode('login');
      setRecoverySent(false);
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPassword('');
      setSocialNotice('Senha alterada com sucesso. Agora você já pode entrar.');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível redefinir sua senha. Confira o código digitado.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
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
              <LockIcon size={16} color={palette.primaryText} />
              <Text style={[styles.forgotText, { color: palette.primaryText, fontSize: fs(15) }]}>
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

            {socialNotice ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: palette.primarySoft, borderColor: palette.borderStrong },
                ]}
              >
                <Text style={[styles.errorText, { color: palette.textPrimary, fontSize: fs(15) }]}>
                  {socialNotice}
                </Text>
              </View>
            ) : null}

            <AccessibleButton
              label="Entrar na minha conta"
              variant="primary"
              loading={submitting}
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
                iconLeft={<GoogleIcon size={22} />}
              />
              <AccessibleButton
                label="Entrar com Facebook"
                variant="outline"
                onPress={() => handleSocialLogin('Facebook')}
                iconLeft={<FacebookIcon size={22} />}
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
                iconLeft={<UserPlusIcon size={20} color={palette.primaryText} />}
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
              <View style={styles.form}>
                <View
                  style={[
                    styles.successBox,
                    { backgroundColor: palette.verifiedBg, borderColor: palette.verifiedText },
                  ]}
                >
                  <Text style={[styles.successText, { color: palette.verifiedText, fontSize: fs(15) }]}>
                    {recoveryMessage ||
                      `Instruções enviadas para ${contact}. Verifique sua caixa de entrada e a pasta de spam.`}
                  </Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
                    Código recebido
                  </Text>
                  <TextInput
                    value={resetCode}
                    onChangeText={(text) => {
                      setResetCode(text);
                      setErrorMessage(null);
                    }}
                    placeholder="Digite o código"
                    placeholderTextColor={palette.textMuted}
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

                <PasswordInput
                  label="Nova senha"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    setErrorMessage(null);
                  }}
                  placeholder="Mínimo 8 caracteres"
                />

                <PasswordInput
                  label="Confirmar nova senha"
                  value={confirmNewPassword}
                  onChangeText={(text) => {
                    setConfirmNewPassword(text);
                    setErrorMessage(null);
                  }}
                  placeholder="Repita sua nova senha"
                />

                <AccessibleButton
                  label="Confirmar nova senha"
                  variant="primary"
                  loading={submitting}
                  onPress={handleConfirmReset}
                  iconLeft={<LockIcon size={20} color={palette.textOnPrimary} />}
                />
              </View>
            ) : (
              <AccessibleButton
                label="Enviar instruções de recuperação"
                variant="primary"
                loading={submitting}
                onPress={handleSendRecovery}
                iconLeft={<MailIcon size={20} color={palette.textOnPrimary} />}
              />
            )}

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
                  { color: palette.primaryText, fontSize: fs(16) },
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
          <MailIcon size={18} color={palette.primaryText} />
          <Text style={[styles.supportText, { color: palette.textSecondary, fontSize: fs(14) }]}>
            Dúvidas no acesso?{' '}
            <Text style={{ color: palette.primaryText, fontWeight: '700', textDecorationLine: 'underline' }}>
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
