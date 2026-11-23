import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { BeyondTimeSymbol } from '../components/BeyondTimeLogo';
import { DefensiveExitModal } from '../components/DefensiveExitModal';
import {
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  FacebookIcon,
  GoogleIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { PasswordInput } from '../components/PasswordInput';
import {
  HOBBIES_CATALOG,
  HOBBY_CATEGORIES,
  MAX_HOBBIES_SELECTION,
  MIN_HOBBIES_SELECTION,
  RELATIONSHIP_GOALS,
  SERGIPE_CITIES,
} from '../constants/hobbiesTaxonomy';
import { SUPPORT_EMAIL, TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import type { OnboardingData } from '../types/onboarding';

interface OnboardingFlowScreenProps {
  data: OnboardingData;
  onChangeData: (next: OnboardingData) => void;
  onExitToSplash: () => void;
  onSwitchToLogin: () => void;
  onCompleteToFacial: () => void;
}

function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function calculateAgeFromBrDate(dateStr: string): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;

  const birth = new Date(year, month - 1, day);
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Fluxo Guiado de Cadastro (Telas 01 a 07 do Figma + Tela 11 Modal Defensivo RF-06):
 * 1: Criar minha conta (e-mail/telefone ou social)
 * 2: Seus dados pessoais (nome + data de nascimento 50+)
 * 3: Sua localização (cidade em Sergipe ou personalizada)
 * 4: Uma foto sua
 * 5: Sobre você — Interesses (36 hobbies em 6 categorias, mínimo 3 / máximo 10)
 * 6: O que você procura hoje? (Amizade, Relacionamento, Companhia)
 * 7: Crie sua senha de acesso + Termos de Uso / LGPD
 */
export function OnboardingFlowScreen({
  data,
  onChangeData,
  onExitToSplash,
  onSwitchToLogin,
  onCompleteToFacial,
}: OnboardingFlowScreenProps) {
  const { palette, fs } = useTheme();

  const [step, setStep] = useState<number>(1);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [exitTarget, setExitTarget] = useState<'splash' | 'login' | null>(null);
  const [legalModal, setLegalModal] = useState<'termos' | 'privacidade' | null>(null);
  const [photoSelectedDemo, setPhotoSelectedDemo] = useState(Boolean(data.profilePhotoUri));

  const isDirty = useMemo(() => {
    return (
      data.contact.trim().length > 0 ||
      data.fullName.trim().length > 0 ||
      data.birthDate.trim().length > 0 ||
      data.password.length > 0 ||
      step > 1
    );
  }, [data, step]);

  const updateField = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setErrorMessage(null);
    setSocialNotice(null);
    onChangeData({ ...data, [key]: value });
  };

  const requestLeave = useCallback(
    (target: 'splash' | 'login') => {
      if (isDirty) {
        setExitTarget(target);
        return;
      }
      if (target === 'login') onSwitchToLogin();
      else onExitToSplash();
    },
    [isDirty, onExitToSplash, onSwitchToLogin]
  );

  const handleBack = useCallback(() => {
    setErrorMessage(null);
    setSocialNotice(null);
    if (step === 1) {
      requestLeave('splash');
      return;
    }
    setStep((prev) => prev - 1);
  }, [requestLeave, step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (legalModal !== null) {
        setLegalModal(null);
        return true;
      }
      if (exitTarget !== null) {
        setExitTarget(null);
        return true;
      }
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [exitTarget, handleBack, legalModal]);

  const handleNext = () => {
    setErrorMessage(null);

    if (step === 1) {
      if (data.contact.trim().length < 5) {
        setErrorMessage('Por favor, informe um e-mail ou telefone válido para continuar.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (data.fullName.trim().length < 2) {
        setErrorMessage('Informe como você gostaria de ser chamado(a).');
        return;
      }
      const age = calculateAgeFromBrDate(data.birthDate);
      if (age === null) {
        setErrorMessage('Digite sua data de nascimento no formato DD/MM/AAAA (ex: 15/06/1962).');
        return;
      }
      if (age < 50) {
        setErrorMessage(
          'O BeyondTime é uma comunidade exclusiva para pessoas com 50 anos ou mais (RF-02).'
        );
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!data.city.trim()) {
        setErrorMessage('Informe sua cidade para encontrarmos pessoas próximas a você.');
        return;
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      setStep(5);
      return;
    }

    if (step === 5) {
      if (data.selectedHobbies.length < MIN_HOBBIES_SELECTION) {
        setErrorMessage(
          `Escolha pelo menos ${MIN_HOBBIES_SELECTION} assuntos que você gosta para encontrarmos boas afinidades.`
        );
        return;
      }
      setStep(6);
      return;
    }

    if (step === 6) {
      setStep(7);
      return;
    }

    if (step === 7) {
      if (!data.password || data.password.trim().length === 0) {
        setErrorMessage('Por favor, escolha uma senha para proteger sua conta.');
        return;
      }
      if (data.password !== data.password.trim()) {
        setErrorMessage('Evite deixar espaços no início ou no final da senha.');
        return;
      }
      if (data.password.trim().length < 8) {
        setErrorMessage('Para sua segurança, escolha uma senha com pelo menos 8 caracteres.');
        return;
      }
      if (data.password !== confirmPassword) {
        setErrorMessage('As duas senhas ficaram diferentes. Vamos conferir com calma.');
        return;
      }
      if (!data.acceptedTerms) {
        setErrorMessage('Para concluir, marque que concorda com os Termos de Uso e Privacidade.');
        return;
      }
      onCompleteToFacial();
    }
  };

  const toggleHobby = (hobbyId: string) => {
    setErrorMessage(null);
    const exists = data.selectedHobbies.includes(hobbyId);
    if (exists) {
      updateField(
        'selectedHobbies',
        data.selectedHobbies.filter((id) => id !== hobbyId)
      );
      return;
    }
    if (data.selectedHobbies.length >= MAX_HOBBIES_SELECTION) {
      setErrorMessage(`Você pode escolher no máximo ${MAX_HOBBIES_SELECTION} interesses.`);
      return;
    }
    updateField('selectedHobbies', [...data.selectedHobbies, hobbyId]);
  };

  const handleSocialStart = (provider: 'Google' | 'Facebook') => {
    setErrorMessage(null);
    setSocialNotice(
      `O cadastro direto com ${provider} está em fase final de integração neste aplicativo. Por enquanto, informe seu e-mail ou telefone acima para continuar.`
    );
  };

  const isNextDisabled =
    step === 5 && data.selectedHobbies.length < MIN_HOBBIES_SELECTION;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OnboardingHeader
        onBack={handleBack}
        backLabel="Voltar"
        stepCurrent={step}
        stepTotal={7}
        showThemeToggle={step === 1}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* PASSO 1 — CRIAR MINHA CONTA */}
        {step === 1 && (
          <View style={styles.stepBlock}>
            <View style={styles.symbolHeader}>
              <BeyondTimeSymbol size={42} />
            </View>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(28) }]}>
              Vamos criar sua <Text style={{ color: palette.primaryText }}>conta</Text>
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Enviaremos um código para confirmar. Seus dados nunca ficam públicos.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
                Seu e-mail ou telefone
              </Text>
              <TextInput
                value={data.contact}
                onChangeText={(text) => updateField('contact', text)}
                placeholder="Ex: marlene@email.com"
                placeholderTextColor={palette.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
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

            <AccessibleButton
              label="Continuar"
              variant="primary"
              onPress={handleNext}
              iconRight={<ArrowRightIcon size={20} color={palette.textOnPrimary} />}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
              <Text style={[styles.dividerText, { color: palette.textMuted, fontSize: fs(14) }]}>
                ou entre mais rápido
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            </View>

            <View style={styles.socialGroup}>
              <AccessibleButton
                label="Entrar com Google"
                variant="outline"
                onPress={() => handleSocialStart('Google')}
                iconLeft={<GoogleIcon size={22} />}
              />
              <AccessibleButton
                label="Entrar com Facebook"
                variant="outline"
                onPress={() => handleSocialStart('Facebook')}
                iconLeft={<FacebookIcon size={22} />}
              />
            </View>

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

            <TouchableOpacity
              onPress={() => requestLeave('login')}
              accessibilityRole="button"
              accessibilityLabel="Já tem conta? Entrar"
              style={styles.inlineLinkBtn}
            >
              <Text style={[styles.inlineLinkText, { color: palette.textSecondary, fontSize: fs(16) }]}>
                Já tem conta?{' '}
                <Text style={{ color: palette.primaryText, fontWeight: '700', textDecorationLine: 'underline' }}>
                  Entrar
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PASSO 2 — SEUS DADOS PESSOAIS */}
        {step === 2 && (
          <View style={styles.stepBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Como podemos <Text style={{ color: palette.primaryText }}>chamar</Text> você?
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Vamos conhecer você um pouquinho. O BeyondTime é feito para quem tem 50 anos ou mais.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
                Seu nome
              </Text>
              <TextInput
                value={data.fullName}
                onChangeText={(text) => updateField('fullName', text)}
                placeholder="Ex: Marlene ou Antônio"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="words"
                accessibilityLabel="Seu nome"
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

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
                Data de nascimento
              </Text>
              <TextInput
                value={data.birthDate}
                onChangeText={(text) => updateField('birthDate', formatBirthDateInput(text))}
                placeholder="DD/MM/AAAA (ex: 15/06/1962)"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel="Data de nascimento no formato dia, mês e ano"
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

            <View
              style={[
                styles.infoCard,
                { backgroundColor: palette.primarySoft, borderColor: palette.border },
              ]}
            >
              <ShieldCheckIcon size={20} color={palette.primaryText} />
              <Text style={[styles.infoCardText, { color: palette.textSecondary, fontSize: fs(15) }]}>
                Usamos sua data apenas para confirmar que você tem 50+. A sua data exata nunca aparece no perfil.
              </Text>
            </View>
          </View>
        )}

        {/* PASSO 3 — SUA LOCALIZAÇÃO */}
        {step === 3 && (
          <View style={styles.stepBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Onde você <Text style={{ color: palette.primaryText }}>mora</Text>?
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Assim mostramos pessoas que moram perto de você.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: palette.textPrimary, fontSize: fs(16) }]}>
                Sua cidade
              </Text>
              <TextInput
                value={data.city}
                onChangeText={(text) => updateField('city', text)}
                placeholder="Ex: Aracaju, SE"
                placeholderTextColor={palette.textMuted}
                accessibilityLabel="Sua cidade"
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

            <Text style={[styles.helperCaption, { color: palette.textSecondary, fontSize: fs(15) }]}>
              Ou escolha rapidamente uma cidade de Sergipe:
            </Text>

            <View style={styles.chipsWrap}>
              {SERGIPE_CITIES.map((city) => {
                const selected = data.city === city;
                return (
                  <TouchableOpacity
                    key={city}
                    onPress={() => updateField('city', city)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? palette.primarySoft : palette.surface,
                        borderColor: selected ? palette.primary : palette.border,
                      },
                    ]}
                  >
                    {selected ? <CheckIcon size={16} color={palette.primaryText} /> : null}
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selected ? palette.primaryText : palette.textPrimary,
                          fontSize: fs(15),
                        },
                      ]}
                    >
                      {city}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[
                styles.infoCard,
                { backgroundColor: palette.primarySoft, borderColor: palette.border },
              ]}
            >
              <ShieldCheckIcon size={20} color={palette.primaryText} />
              <Text style={[styles.infoCardText, { color: palette.textSecondary, fontSize: fs(15) }]}>
                Usamos apenas a sua cidade. Seu endereço ou bairro exato nunca aparece para ninguém.
              </Text>
            </View>
          </View>
        )}

        {/* PASSO 4 — UMA FOTO SUA */}
        {step === 4 && (
          <View style={styles.stepBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Escolha uma <Text style={{ color: palette.primaryText }}>foto</Text> sua
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Um sorriso natural ajuda as outras pessoas a sentirem confiança.
            </Text>

            <View
              style={[
                styles.photoCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View
                style={[
                  styles.photoCircle,
                  {
                    backgroundColor: photoSelectedDemo
                      ? palette.verifiedBg
                      : palette.primarySoft,
                    borderColor: photoSelectedDemo ? palette.verifiedText : palette.border,
                  },
                ]}
              >
                {photoSelectedDemo ? (
                  <CheckIcon size={34} color={palette.verifiedText} />
                ) : (
                  <CameraIcon size={34} color={palette.primaryText} />
                )}
              </View>

              <Text
                style={[
                  styles.photoStatusText,
                  { color: palette.textPrimary, fontSize: fs(16) },
                ]}
              >
                {photoSelectedDemo
                  ? 'Foto selecionada com sucesso.'
                  : 'Nenhuma foto escolhida ainda'}
              </Text>

              <AccessibleButton
                label={photoSelectedDemo ? 'Trocar foto selecionada' : 'Escolher ou tirar foto'}
                variant="outline"
                onPress={() => {
                  setPhotoSelectedDemo(true);
                  updateField('profilePhotoUri', 'local://avatar-selecionado');
                }}
                iconLeft={<CameraIcon size={20} color={palette.primaryText} />}
              />
            </View>

            <View style={styles.tipsList}>
              <Text style={[styles.tipItem, { color: palette.textSecondary, fontSize: fs(15) }]}>
                ✓ Prefira uma foto recente e com boa luz no rosto.
              </Text>
              <Text style={[styles.tipItem, { color: palette.textSecondary, fontSize: fs(15) }]}>
                ✓ Evite óculos escuros ou chapéu cobrindo o rosto.
              </Text>
            </View>
          </View>
        )}

        {/* PASSO 5 — SOBRE VOCÊ (36 INTERESSES EM 6 CATEGORIAS) */}
        {step === 5 && (
          <View style={styles.stepBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Do que você <Text style={{ color: palette.primaryText }}>gosta</Text>?
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Escolha de {MIN_HOBBIES_SELECTION} a {MAX_HOBBIES_SELECTION} assuntos para
              encontrar pessoas com gostos parecidos.
            </Text>

            <Text style={[styles.counterText, { color: palette.primaryText, fontSize: fs(15) }]}>
              {data.selectedHobbies.length} escolhidos de {MAX_HOBBIES_SELECTION} (mínimo{' '}
              {MIN_HOBBIES_SELECTION})
            </Text>

            {HOBBY_CATEGORIES.map((category) => {
              const items = HOBBIES_CATALOG.filter((item) => item.category === category);
              return (
                <View key={category} style={styles.categoryGroup}>
                  <Text
                    style={[
                      styles.categoryTitle,
                      { color: palette.textPrimary, fontSize: fs(16) },
                    ]}
                  >
                    {category}
                  </Text>
                  <View style={styles.chipsWrap}>
                    {items.map((hobby) => {
                      const selected = data.selectedHobbies.includes(hobby.id);
                      return (
                        <TouchableOpacity
                          key={hobby.id}
                          onPress={() => toggleHobby(hobby.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          accessibilityLabel={hobby.label}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected
                                ? palette.primarySoft
                                : palette.surface,
                              borderColor: selected ? palette.primary : palette.border,
                            },
                          ]}
                        >
                          {selected ? <CheckIcon size={16} color={palette.primaryText} /> : null}
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: selected ? palette.primaryText : palette.textPrimary,
                                fontSize: fs(15),
                              },
                            ]}
                          >
                            {hobby.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* PASSO 6 — O QUE VOCÊ PROCURA HOJE */}
        {step === 6 && (
          <View style={styles.stepBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              O que você <Text style={{ color: palette.primaryText }}>procura</Text> hoje?
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Você pode mudar sua escolha quando quiser.
            </Text>

            <View style={styles.radioList}>
              {RELATIONSHIP_GOALS.map((option) => {
                const selected = data.goal === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => updateField('goal', option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.radioCard,
                      {
                        backgroundColor: selected ? palette.primarySoft : palette.surface,
                        borderColor: selected ? palette.primary : palette.border,
                      },
                    ]}
                  >
                    <View style={styles.radioTextCol}>
                      <Text
                        style={[
                          styles.radioTitle,
                          {
                            color: selected ? palette.primaryText : palette.textPrimary,
                            fontSize: fs(18),
                          },
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text
                        style={[
                          styles.radioDesc,
                          { color: palette.textSecondary, fontSize: fs(15) },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: selected ? palette.primary : palette.border,
                          backgroundColor: selected ? palette.primary : 'transparent',
                        },
                      ]}
                    >
                      {selected ? <CheckIcon size={14} color={palette.textOnPrimary} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* PASSO 7 — SENHA E FINALIZAÇÃO */}
        {step === 7 && (
          <View style={styles.stepBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Crie sua <Text style={{ color: palette.primaryText }}>senha</Text> de acesso
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Escolha uma senha fácil para você lembrar, com pelo menos 8 caracteres.
            </Text>

            <PasswordInput
              label="Crie sua senha"
              value={data.password}
              onChangeText={(text) => updateField('password', text)}
              placeholder="Mínimo 8 caracteres"
            />

            <PasswordInput
              label="Confirmar senha"
              value={confirmPassword}
              onChangeText={(text) => {
                setErrorMessage(null);
                setConfirmPassword(text);
              }}
              placeholder="Repita sua senha"
            />

            <TouchableOpacity
              onPress={() => updateField('acceptedTerms', !data.acceptedTerms)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: data.acceptedTerms }}
              style={styles.termsRow}
            >
              <View
                style={[
                  styles.checkboxBox,
                  {
                    borderColor: data.acceptedTerms ? palette.primary : palette.borderStrong,
                    backgroundColor: data.acceptedTerms ? palette.primary : palette.surface,
                  },
                ]}
              >
                {data.acceptedTerms ? (
                  <CheckIcon size={16} color={palette.textOnPrimary} />
                ) : null}
              </View>
              <Text style={[styles.termsText, { color: palette.textSecondary, fontSize: fs(15) }]}>
                Li e concordo com os{' '}
                <Text
                  onPress={() => setLegalModal('termos')}
                  style={{ color: palette.primaryText, fontWeight: '700', textDecorationLine: 'underline' }}
                >
                  Termos de Uso
                </Text>{' '}
                e a{' '}
                <Text
                  onPress={() => setLegalModal('privacidade')}
                  style={{ color: palette.primaryText, fontWeight: '700', textDecorationLine: 'underline' }}
                >
                  Política de Privacidade (LGPD)
                </Text>
                .
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Erro de validação acessível */}
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
      </ScrollView>

      {/* Rodapé fixo de ações para passos 2 a 7 */}
      {step > 1 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: palette.background, borderTopColor: palette.border },
          ]}
        >
          <AccessibleButton
            label={step === 7 ? 'Concluir cadastro' : 'Continuar'}
            variant="primary"
            disabled={isNextDisabled}
            onPress={handleNext}
            iconRight={<ArrowRightIcon size={20} color={palette.textOnPrimary} />}
          />

          {step === 4 && (
            <AccessibleButton
              label="Fazer isso depois"
              variant="ghost"
              onPress={() => setStep(5)}
            />
          )}
        </View>
      )}

      {/* Modal Defensivo RF-06 */}
      <DefensiveExitModal
        visible={exitTarget !== null}
        onStay={() => setExitTarget(null)}
        onConfirmExit={() => {
          const target = exitTarget;
          setExitTarget(null);
          if (target === 'login') onSwitchToLogin();
          else onExitToSplash();
        }}
      />

      {/* Modal de Termos e Privacidade (LGPD) */}
      <Modal
        visible={legalModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setLegalModal(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}>
          <View
            style={[
              styles.legalSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.legalTitle, { color: palette.textPrimary, fontSize: fs(20) }]}>
              {legalModal === 'termos'
                ? 'Termos de Uso — BeyondTime'
                : 'Política de Privacidade e LGPD'}
            </Text>
            <ScrollView style={styles.legalScroll}>
              <Text style={[styles.legalBody, { color: palette.textSecondary, fontSize: fs(15) }]}>
                {legalModal === 'termos'
                  ? 'O BeyondTime é uma comunidade exclusiva para maiores de 50 anos baseada em respeito, gentileza e conexões reais. Perfis falsos ou condutas desrespeitosas estão sujeitos a suspensão. Em caso de dúvidas, escreva para ' +
                    SUPPORT_EMAIL +
                    '.'
                  : 'Seus dados pessoais, data de nascimento e selfie de verificação biométrica são protegidos conforme a Lei Geral de Proteção de Dados (LGPD). Sua foto de confirmação facial nunca aparece no seu perfil público e você pode solicitar a exclusão ou exportação dos seus dados a qualquer momento pelo e-mail ' +
                    SUPPORT_EMAIL +
                    '.'}
              </Text>
            </ScrollView>
            <AccessibleButton
              label="Fechar leitura"
              variant="primary"
              onPress={() => setLegalModal(null)}
            />
          </View>
        </View>
      </Modal>
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
    paddingBottom: 28,
    gap: 16,
  },
  stepBlock: {
    gap: 16,
  },
  symbolHeader: {
    alignItems: 'flex-start',
    marginBottom: 2,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
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
  inlineLinkBtn: {
    minHeight: TOUCH_TARGET_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  inlineLinkText: {
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoCardText: {
    flex: 1,
    lineHeight: 22,
  },
  helperCaption: {
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontWeight: '600',
  },
  photoCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStatusText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    lineHeight: 22,
  },
  counterText: {
    fontWeight: '700',
  },
  categoryGroup: {
    gap: 10,
    marginTop: 4,
  },
  categoryTitle: {
    fontWeight: '700',
  },
  radioList: {
    gap: 12,
  },
  radioCard: {
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioTextCol: {
    flex: 1,
    gap: 4,
  },
  radioTitle: {
    fontWeight: '700',
  },
  radioDesc: {
    lineHeight: 21,
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsRow: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  checkboxBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    lineHeight: 22,
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
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  legalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    padding: 24,
    maxHeight: '75%',
    gap: 14,
  },
  legalTitle: {
    fontWeight: '700',
  },
  legalScroll: {
    maxHeight: 260,
  },
  legalBody: {
    lineHeight: 24,
  },
});
