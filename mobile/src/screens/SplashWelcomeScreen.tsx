import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { BeyondTimeSymbol } from '../components/BeyondTimeLogo';
import {
  LogInIcon,
  MailIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  UserPlusIcon,
} from '../components/Icons';
import { SUPPORT_EMAIL, TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

interface SplashWelcomeScreenProps {
  onCreateAccount: () => void;
  onLogin: () => void;
}

/**
 * Tela 01b — Splash & Apresentação BeyondTime (50+)
 * Animação de entrada sem colisão: o símbolo do infinito entra centralizado,
 * desliza suavemente para a esquerda e só então o wordmark "BeyondTime" surge.
 */
export function SplashWelcomeScreen({
  onCreateAccount,
  onLogin,
}: SplashWelcomeScreenProps) {
  const { palette, isDark, toggleTheme, fontScale, cycleFontScale, fs } = useTheme();

  const symbolOpacity = useRef(new Animated.Value(0)).current;
  const symbolScale = useRef(new Animated.Value(0.85)).current;
  const symbolTranslateX = useRef(new Animated.Value(56)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateX = useRef(new Animated.Value(12)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Símbolo entra sozinho com calma
      Animated.parallel([
        Animated.timing(symbolOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(symbolScale, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 2. Símbolo desliza para a posição esquerda antes do texto surgir (sem sobreposição)
      Animated.timing(symbolTranslateX, {
        toValue: 0,
        duration: 420,
        delay: 140,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      // 3. Wordmark "BeyondTime" surge suavemente ao lado
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkTranslateX, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 4. Conteúdo de boas-vindas e botões aparecem
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    contentOpacity,
    contentTranslateY,
    symbolOpacity,
    symbolScale,
    symbolTranslateX,
    wordmarkOpacity,
    wordmarkTranslateX,
  ]);

  const handleOpenSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Suporte%20BeyondTime%20Mobile`).catch(
      () => undefined
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Barra superior de acessibilidade (RF-09) */}
      <View style={styles.accessibilityBar}>
        <TouchableOpacity
          onPress={cycleFontScale}
          accessibilityRole="button"
          accessibilityLabel={`Tamanho do texto atual ${Math.round(fontScale * 100)}%. Toque para alterar.`}
          style={[
            styles.a11yChip,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.a11yChipText, { color: palette.textPrimary, fontSize: 14 }]}>
            Aa Texto {Math.round(fontScale * 100)}%
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Mudar para modo claro' : 'Mudar para modo noturno'}
          style={[
            styles.a11yChip,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {isDark ? (
            <SunIcon size={18} color={palette.textPrimary} />
          ) : (
            <MoonIcon size={18} color={palette.textPrimary} />
          )}
          <Text style={[styles.a11yChipText, { color: palette.textPrimary, fontSize: 14 }]}>
            {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Marca animada sem colisão */}
        <View style={styles.brandStage}>
          <Animated.View
            style={{
              opacity: symbolOpacity,
              transform: [{ scale: symbolScale }, { translateX: symbolTranslateX }],
            }}
          >
            <BeyondTimeSymbol size={66} />
          </Animated.View>

          <Animated.View
            style={{
              opacity: wordmarkOpacity,
              transform: [{ translateX: wordmarkTranslateX }],
            }}
          >
            <Text
              style={[
                styles.brandTitle,
                {
                  color: palette.isDark ? '#FFFFFF' : palette.textPrimary,
                  fontSize: fs(30),
                },
              ]}
            >
              Beyond<Text style={{ color: palette.primary }}>Time</Text>
            </Text>
          </Animated.View>
        </View>

        {/* Proposta de valor acolhedora 50+ */}
        <Animated.View
          style={[
            styles.bodyBlock,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.headline,
              { color: palette.textPrimary, fontSize: fs(26) },
            ]}
          >
            Conexões reais, no seu tempo.
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: palette.textSecondary, fontSize: fs(17) },
            ]}
          >
            Um espaço tranquilo, seguro e feito para pessoas 50+ encontrarem amizades,
            companhia e novos caminhos por afinidade.
          </Text>

          {/* Cartão de pilares com foco em afinidade e segurança */}
          <View
            style={[
              styles.highlightsCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={styles.highlightRow}>
              <View style={[styles.badgeIcon, { backgroundColor: palette.verifiedBg }]}>
                <ShieldCheckIcon size={20} color={palette.verifiedText} />
              </View>
              <View style={styles.highlightTextCol}>
                <Text
                  style={[
                    styles.highlightTitle,
                    { color: palette.textPrimary, fontSize: fs(16) },
                  ]}
                >
                  Proteção contra perfis falsos
                </Text>
                <Text
                  style={[
                    styles.highlightDesc,
                    { color: palette.textSecondary, fontSize: fs(14) },
                  ]}
                >
                  Confirmação facial simples para mais tranquilidade em cada conversa.
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <View style={styles.highlightRow}>
              <View style={[styles.badgeIcon, { backgroundColor: palette.primarySoft }]}>
                <Text style={{ fontSize: 18 }}>🎶</Text>
              </View>
              <View style={styles.highlightTextCol}>
                <Text
                  style={[
                    styles.highlightTitle,
                    { color: palette.textPrimary, fontSize: fs(16) },
                  ]}
                >
                  Afinidades em primeiro lugar
                </Text>
                <Text
                  style={[
                    styles.highlightDesc,
                    { color: palette.textSecondary, fontSize: fs(14) },
                  ]}
                >
                  Encontre pessoas que gostam de MPB, caminhada, café, leitura e viagens.
                </Text>
              </View>
            </View>
          </View>

          {/* Ações principais explícitas e rotuladas */}
          <View style={styles.actions}>
            <AccessibleButton
              label="Criar minha conta"
              variant="primary"
              onPress={onCreateAccount}
              iconLeft={<UserPlusIcon size={20} color={palette.textOnPrimary} />}
              accessibilityHint="Inicia o cadastro guiado passo a passo"
            />
            <AccessibleButton
              label="Já tenho conta · Entrar"
              variant="outline"
              onPress={onLogin}
              iconLeft={<LogInIcon size={20} color={palette.primary} />}
              accessibilityHint="Abre a tela de acesso para quem já possui cadastro"
            />
          </View>

          {/* Canal oficial de suporte humanizado */}
          <TouchableOpacity
            onPress={handleOpenSupport}
            accessibilityRole="link"
            accessibilityLabel={`Precisa de ajuda? Enviar e-mail para ${SUPPORT_EMAIL}`}
            style={styles.supportLink}
          >
            <MailIcon size={18} color={palette.primary} />
            <Text
              style={[
                styles.supportText,
                { color: palette.textSecondary, fontSize: fs(14) },
              ]}
            >
              Precisa de ajuda?{' '}
              <Text style={{ color: palette.primary, fontWeight: '700', textDecorationLine: 'underline' }}>
                {SUPPORT_EMAIL}
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accessibilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  a11yChip: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  a11yChipText: {
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  brandStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
    minHeight: 54,
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bodyBlock: {
    width: '100%',
    gap: 18,
  },
  headline: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 26,
  },
  highlightsCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 14,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextCol: {
    flex: 1,
    gap: 2,
  },
  highlightTitle: {
    fontWeight: '700',
  },
  highlightDesc: {
    lineHeight: 21,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  supportLink: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  supportText: {
    textAlign: 'center',
  },
});
