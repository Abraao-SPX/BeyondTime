import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccessibleButton } from '../components/AccessibleButton';
import {
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  RefreshIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { useTheme } from '../theme/ThemeContext';
import FaceCaptureScreen from './FaceCaptureScreen';

interface FacialVerificationFlowScreenProps {
  onBack: () => void;
  onSkipForLater: () => void;
  onVerificationComplete: (selfieUri: string | null) => void;
}

type FacialStage = 'intro' | 'camera' | 'review' | 'completed';

/**
 * Fluxo de Reconhecimento Facial (Telas 08, 09 e 10 do Figma):
 * - Tela 08: Introdução acolhedora ("Vamos confirmar que é você")
 * - Câmera Biométrica Real: Reutiliza integralmente FaceCaptureScreen.tsx (MiniFASNet + SFace)
 * - Tela 09: Revisão da foto capturada ("Ficou boa assim?")
 * - Tela 10: Verificação Concluída ("Tudo certo, seu perfil está verificado.")
 */
export function FacialVerificationFlowScreen({
  onBack,
  onSkipForLater,
  onVerificationComplete,
}: FacialVerificationFlowScreenProps) {
  const { palette, fs } = useTheme();

  const [stage, setStage] = useState<FacialStage>('intro');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  if (stage === 'camera') {
    return (
      <FaceCaptureScreen
        onCancel={() => setStage('intro')}
        onCapturedPreview={(uri) => {
          setCapturedUri(uri);
        }}
        onVerified={(photoUri) => {
          setCapturedUri(photoUri);
          setStage('review');
        }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {stage !== 'completed' ? (
        <OnboardingHeader
          onBack={() => {
            if (stage === 'review') setStage('intro');
            else onBack();
          }}
          backLabel="Voltar"
        />
      ) : (
        <View style={styles.completedTopSpacer} />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TELA 08 — INTRODUÇÃO VERIFICAÇÃO FACIAL */}
        {stage === 'intro' && (
          <View style={styles.stageBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Vamos confirmar que é <Text style={{ color: palette.primaryText }}>você</Text>
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Uma selfie rápida ajuda a manter o BeyondTime mais seguro para todos.
            </Text>

            <View
              style={[
                styles.ovalPreviewBox,
                { backgroundColor: palette.cameraPreviewBg, borderColor: palette.border },
              ]}
            >
              <View style={[styles.dashedOval, { borderColor: palette.textOnPrimary }]} />
              <View style={[styles.ovalHintPill, { backgroundColor: palette.surface }]}>
                <Text style={[styles.ovalHintText, { color: palette.textPrimary, fontSize: fs(14) }]}>
                  Olhe para a câmera com boa luz
                </Text>
              </View>
            </View>

            <View style={styles.tipsList}>
              <Text style={[styles.tipItem, { color: palette.textSecondary, fontSize: fs(15) }]}>
                ✓ Fique de frente e sem óculos escuros ou chapéu.
              </Text>
              <Text style={[styles.tipItem, { color: palette.textSecondary, fontSize: fs(15) }]}>
                ✓ Esta foto serve só para confirmação e nunca aparece no seu perfil.
              </Text>
            </View>

            <View style={styles.actions}>
              <AccessibleButton
                label="Tirar minha foto agora"
                variant="primary"
                onPress={() => setStage('camera')}
                iconLeft={<CameraIcon size={20} color={palette.textOnPrimary} />}
              />
              <AccessibleButton
                label="Fazer isso mais tarde"
                variant="ghost"
                onPress={onSkipForLater}
              />
            </View>
          </View>
        )}

        {/* TELA 09 — REVISÃO DA FOTO FACIAL */}
        {stage === 'review' && (
          <View style={styles.stageBlock}>
            <Text style={[styles.title, { color: palette.textPrimary, fontSize: fs(26) }]}>
              Ficou <Text style={{ color: palette.primaryText }}>boa</Text> assim?
            </Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary, fontSize: fs(16) }]}>
              Confira se o seu rosto aparece com clareza antes de confirmar.
            </Text>

            <View
              style={[
                styles.reviewCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              {capturedUri ? (
                <Image
                  source={{ uri: capturedUri }}
                  style={styles.reviewPhoto}
                  accessibilityLabel="Prévia da selfie capturada"
                />
              ) : (
                <View
                  style={[
                    styles.reviewPhotoPlaceholder,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <ShieldCheckIcon size={44} color={palette.primaryText} />
                </View>
              )}

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: palette.verifiedBg, borderColor: palette.verifiedText },
                ]}
              >
                <CheckIcon size={16} color={palette.verifiedText} />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: palette.verifiedText, fontSize: fs(14) },
                  ]}
                >
                  Rosto nítido e bem iluminado
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.privacyNote,
                { backgroundColor: palette.primarySoft, borderColor: palette.border },
              ]}
            >
              <ShieldCheckIcon size={20} color={palette.primaryText} />
              <Text style={[styles.privacyText, { color: palette.textSecondary, fontSize: fs(15) }]}>
                Esta foto serve só para confirmação e nunca aparece no seu perfil.
              </Text>
            </View>

            <View style={styles.actions}>
              <AccessibleButton
                label="Sim, usar esta foto"
                variant="primary"
                onPress={() => setStage('completed')}
                iconLeft={<CheckIcon size={20} color={palette.textOnPrimary} />}
              />
              <AccessibleButton
                label="Tirar outra foto"
                variant="outline"
                onPress={() => setStage('camera')}
                iconLeft={<RefreshIcon size={20} color={palette.primaryText} />}
              />
            </View>
          </View>
        )}

        {/* TELA 10 — VERIFICAÇÃO CONCLUÍDA */}
        {stage === 'completed' && (
          <View style={styles.completedBlock}>
            <View
              style={[
                styles.successCircle,
                { backgroundColor: palette.verifiedBg, borderColor: palette.verifiedText },
              ]}
            >
              <CheckIcon size={38} color={palette.verifiedText} />
            </View>

            <Text
              style={[
                styles.title,
                styles.centered,
                { color: palette.textPrimary, fontSize: fs(26) },
              ]}
            >
              Tudo certo, seu perfil está{' '}
              <Text style={{ color: palette.verifiedText }}>verificado</Text>.
            </Text>

            <View
              style={[
                styles.verifiedSummaryCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={[styles.verifiedTag, { backgroundColor: palette.verifiedBg }]}>
                <ShieldCheckIcon size={18} color={palette.verifiedText} />
                <Text
                  style={[
                    styles.verifiedTagText,
                    { color: palette.verifiedText, fontSize: fs(14) },
                  ]}
                >
                  Perfil verificado
                </Text>
              </View>

              <Text
                style={[
                  styles.summaryDesc,
                  { color: palette.textSecondary, fontSize: fs(16) },
                ]}
              >
                Agora as outras pessoas sabem que você é real. Isso traz mais tranquilidade
                para cada conversa.
              </Text>
            </View>

            <Text
              style={[
                styles.calmFooterText,
                { color: palette.textSecondary, fontSize: fs(15) },
              ]}
            >
              Tudo pronto para começar no seu ritmo.
            </Text>

            <View style={styles.actionsFullWidth}>
              <AccessibleButton
                label="Começar a conhecer pessoas"
                variant="primary"
                onPress={() => onVerificationComplete(capturedUri)}
                iconRight={<ArrowRightIcon size={20} color={palette.textOnPrimary} />}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  completedTopSpacer: {
    height: 36,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  stageBlock: {
    gap: 18,
  },
  title: {
    fontWeight: '700',
    lineHeight: 34,
  },
  centered: {
    textAlign: 'center',
  },
  subtitle: {
    lineHeight: 24,
  },
  ovalPreviewBox: {
    height: 250,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  dashedOval: {
    width: 122,
    height: 158,
    borderRadius: 65,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  ovalHintPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ovalHintText: {
    fontWeight: '700',
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    marginTop: 6,
  },
  reviewCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
    gap: 14,
  },
  reviewPhoto: {
    width: 180,
    height: 210,
    borderRadius: 18,
  },
  reviewPhotoPlaceholder: {
    width: 180,
    height: 210,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontWeight: '700',
  },
  privacyNote: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  privacyText: {
    flex: 1,
    lineHeight: 22,
  },
  completedBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
  },
  successCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedSummaryCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 12,
    alignItems: 'flex-start',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedTagText: {
    fontWeight: '700',
  },
  summaryDesc: {
    lineHeight: 24,
  },
  calmFooterText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsFullWidth: {
    width: '100%',
    marginTop: 8,
  },
});
