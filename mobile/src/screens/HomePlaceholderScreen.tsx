import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import { BeyondTimeLogo } from '../components/BeyondTimeLogo';
import {
  CameraIcon,
  MailIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
} from '../components/Icons';
import { HOBBIES_CATALOG } from '../constants/hobbiesTaxonomy';
import { SUPPORT_EMAIL, TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import type { OnboardingData } from '../types/onboarding';
import type { BlockedContactMobile } from '../types/social';

interface HomePlaceholderScreenProps {
  userData: OnboardingData;
  blockedContacts?: BlockedContactMobile[];
  onUnblockContact?: (id: string) => void;
  onRepeatFacialVerification: () => void;
  onSignOut: () => void;
}

/**
 * Tela inicial autenticada após Login / Cadastro + Reconhecimento Facial:
 * Exibe o status de verificação, afinidades escolhidas, controles de acessibilidade (RF-09)
 * e canal oficial de suporte (suporte.beyondtime@gmail.com).
 */
export function HomePlaceholderScreen({
  userData,
  blockedContacts,
  onUnblockContact,
  onRepeatFacialVerification,
  onSignOut,
}: HomePlaceholderScreenProps) {
  const { palette, isDark, toggleTheme, fontScale, cycleFontScale, fs } = useTheme();

  const displayName = userData.fullName.trim() || 'Visitante BeyondTime';
  const hobbyLabels = userData.selectedHobbies
    .map((id) => HOBBIES_CATALOG.find((item) => item.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  const handleOpenSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Suporte%20BeyondTime%20App`).catch(
      () => undefined
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.topBar,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <BeyondTimeLogo symbolSize={36} wordmarkSize={20} />

        <View style={styles.topControls}>
          <TouchableOpacity
            onPress={cycleFontScale}
            accessibilityRole="button"
            accessibilityLabel="Alterar tamanho da fonte"
            style={[
              styles.smallA11yBtn,
              { backgroundColor: palette.background, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.smallA11yText, { color: palette.textPrimary }]}>
              Aa {Math.round(fontScale * 100)}%
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            style={[
              styles.smallA11yBtn,
              { backgroundColor: palette.background, borderColor: palette.border },
            ]}
          >
            {isDark ? (
              <SunIcon size={18} color={palette.textPrimary} />
            ) : (
              <MoonIcon size={18} color={palette.textPrimary} />
            )}
            <Text style={[styles.smallA11yText, { color: palette.textPrimary }]}>
              {isDark ? 'Claro' : 'Escuro'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.welcomeCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.greeting, { color: palette.textPrimary, fontSize: fs(24) }]}>
            Olá, {displayName}!
          </Text>
          <Text style={[styles.cityText, { color: palette.textSecondary, fontSize: fs(16) }]}>
            {userData.city || 'Aracaju, SE'}
          </Text>

          <View
            style={[
              styles.badgeRow,
              {
                backgroundColor: userData.isFaceVerified
                  ? palette.verifiedBg
                  : palette.primarySoft,
                borderColor: userData.isFaceVerified
                  ? palette.verifiedText
                  : palette.border,
              },
            ]}
          >
            <ShieldCheckIcon
              size={20}
              color={userData.isFaceVerified ? palette.verifiedText : palette.primaryText}
            />
            <Text
              style={[
                styles.badgeText,
                {
                  color: userData.isFaceVerified ? palette.verifiedText : palette.primaryText,
                  fontSize: fs(15),
                },
              ]}
            >
              {userData.isFaceVerified
                ? 'Identidade verificada por reconhecimento facial'
                : 'Verificação facial pendente — você pode concluir agora'}
            </Text>
          </View>
        </View>

        {/* Afinidades selecionadas */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.textPrimary, fontSize: fs(18) }]}>
            Suas afinidades em destaque
          </Text>
          <View style={styles.chipsWrap}>
            {hobbyLabels.map((label) => (
              <View
                key={label}
                style={[
                  styles.hobbyTag,
                  { backgroundColor: palette.primarySoft, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.hobbyTagText, { color: palette.primaryText, fontSize: fs(15) }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contatos Bloqueados (RF-08) */}
        {blockedContacts && blockedContacts.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.textPrimary, fontSize: fs(18) }]}>
              Contatos bloqueados ({blockedContacts.length})
            </Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textSecondary, fontSize: fs(14) }]}>
              Essas pessoas estão ocultas do seu feed e das suas conversas.
            </Text>

            <View style={styles.blockedList}>
              {blockedContacts.map((contact) => (
                <View
                  key={contact.id}
                  style={[
                    styles.blockedItem,
                    { borderColor: palette.border, backgroundColor: palette.background },
                  ]}
                >
                  <View style={styles.blockedInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.blockedName, { color: palette.textPrimary, fontSize: fs(16) }]}
                    >
                      {contact.fullName}, {contact.age}
                    </Text>
                    <Text style={[styles.blockedMeta, { color: palette.textSecondary, fontSize: fs(13) }]}>
                      {contact.city} • Bloqueado em {contact.blockedAt}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onUnblockContact?.(contact.id)}
                    style={[styles.unblockBtn, { borderColor: palette.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Desbloquear ${contact.fullName}`}
                  >
                    <Text style={[styles.unblockBtnText, { color: palette.textPrimary, fontSize: fs(13) }]}>
                      Desbloquear
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <AccessibleButton
            label={
              userData.isFaceVerified
                ? 'Refazer verificação facial'
                : 'Fazer verificação facial agora'
            }
            variant="primary"
            onPress={onRepeatFacialVerification}
            iconLeft={<CameraIcon size={20} color={palette.textOnPrimary} />}
          />

          <AccessibleButton
            label="Falar com o suporte por e-mail"
            variant="secondary"
            onPress={handleOpenSupport}
            iconLeft={<MailIcon size={20} color={palette.primaryText} />}
          />

          <AccessibleButton
            label="Sair e voltar à tela inicial"
            variant="outline"
            onPress={onSignOut}
          />
        </View>

        <Text style={[styles.footerNote, { color: palette.textMuted, fontSize: fs(14) }]}>
          Suporte oficial: {SUPPORT_EMAIL}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallA11yBtn: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallA11yText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 24,
    gap: 18,
  },
  welcomeCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 10,
  },
  greeting: {
    fontWeight: '700',
  },
  cityText: {
    fontWeight: '600',
  },
  badgeRow: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeText: {
    flex: 1,
    fontWeight: '700',
    lineHeight: 22,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  hobbyTagText: {
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  sectionSubtitle: {
    lineHeight: 20,
    marginTop: -4,
  },
  blockedList: {
    gap: 10,
    marginTop: 4,
  },
  blockedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  blockedInfo: {
    flex: 1,
    gap: 4,
  },
  blockedName: {
    fontWeight: '700',
  },
  blockedMeta: {
    fontWeight: '500',
  },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  unblockBtnText: {
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    marginTop: 6,
  },
});
