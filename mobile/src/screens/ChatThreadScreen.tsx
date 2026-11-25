import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
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
import {
  CameraIcon,
  ChevronLeftIcon,
  CloseXIcon,
  MicIcon,
  PlayIcon,
  SendIcon,
} from '../components/Icons';
import { TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import type { ChatConversation, SendMessageOptions } from '../types/social';

interface ChatThreadScreenProps {
  conversation: ChatConversation;
  onBackToList: () => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    options?: SendMessageOptions
  ) => void;
  onBlockContact?: (profileId: string, fullName: string) => void;
}

const SAMPLE_CHAT_PHOTOS = [
  {
    id: 'photo-orla',
    label: 'Fim de tarde na orla',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'photo-cafe',
    label: 'Café da tarde',
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80',
  },
];

const WAVEFORM_BARS = [10, 18, 13, 24, 16, 28, 14, 22, 18, 26, 15, 20, 12];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

/**
 * Tela Dedicada de Conversa (50+):
 * - Topo limpo à esquerda: Voltar + foto + nome, idade + status verificado.
 * - Faixa discreta de segurança financeira.
 * - Bolhas de texto, foto e áudio (com botão play e ondas sonoras).
 * - Rodapé em duas linhas amplas: campo "Escreva para [Nome]..." + botões Foto, Áudio e Enviar.
 */
export function ChatThreadScreen({
  conversation,
  onBackToList,
  onSendMessage,
  onBlockContact,
}: ChatThreadScreenProps) {
  const { palette, isDark, fs } = useTheme();
  const [draft, setDraft] = useState('');
  const [imgError, setImgError] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Gravação de voz acessível (toque único, sem precisar ficar segurando)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Bandeja de envio de foto
  const [showPhotoTray, setShowPhotoTray] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState(SAMPLE_CHAT_PHOTOS[0].id);

  const scrollRef = useRef<ScrollView>(null);

  const firstName = conversation.fullName.split(' ')[0] || conversation.fullName;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackToList();
      return true;
    });
    return () => sub.remove();
  }, [onBackToList]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [conversation.messages.length]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleSendText = () => {
    const clean = draft.trim();
    if (!clean) return;
    onSendMessage(conversation.id, clean, { kind: 'text' });
    setDraft('');
  };

  const handleStartRecording = () => {
    setShowPhotoTray(false);
    setRecordingSeconds(1);
    setIsRecording(true);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleSendAudio = () => {
    const duration = Math.max(1, recordingSeconds);
    onSendMessage(conversation.id, `Mensagem de voz (${formatDuration(duration)})`, {
      kind: 'audio',
      audioDurationSec: duration,
    });
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleSendSelectedPhoto = () => {
    const chosen =
      SAMPLE_CHAT_PHOTOS.find((p) => p.id === selectedPhotoId) ?? SAMPLE_CHAT_PHOTOS[0];
    onSendMessage(conversation.id, chosen.label, {
      kind: 'photo',
      photoUrl: chosen.url,
    });
    setShowPhotoTray(false);
  };

  const initials = conversation.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const safetyBannerBg = isDark ? '#2D2416' : '#FEF6DC';
  const safetyBannerText = isDark ? '#F5DFAA' : '#5B4318';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Topo da conversa: seta voltar + avatar + nome, idade e status verificado à esquerda */}
      <View
        style={[
          styles.header,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <TouchableOpacity
          onPress={onBackToList}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Conversas"
          style={styles.backIconBtn}
        >
          <ChevronLeftIcon size={24} color={palette.textPrimary} />
        </TouchableOpacity>

        <View style={styles.contactBlock}>
          {!imgError ? (
            <Image
              source={{ uri: conversation.photoUrl }}
              style={styles.headerAvatar}
              onError={() => setImgError(true)}
            />
          ) : (
            <View
              style={[
                styles.headerAvatarFallback,
                { backgroundColor: palette.primarySoft, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.initials, { color: palette.primaryText }]}>
                {initials}
              </Text>
            </View>
          )}
          <View style={styles.contactTextCol}>
            <Text
              numberOfLines={1}
              style={[
                styles.contactName,
                { color: palette.textPrimary, fontSize: fs(19) },
              ]}
            >
              {conversation.fullName}, {conversation.age}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.contactStatus,
                { color: palette.verifiedText, fontSize: fs(14) },
              ]}
            >
              {conversation.verified
                ? 'Verificado • ativo agora'
                : `${conversation.city} • ativo agora`}
            </Text>
          </View>
        </View>

        {onBlockContact && (
          <TouchableOpacity
            onPress={() => setShowBlockModal(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Bloquear ${conversation.fullName}`}
            style={[styles.blockHeaderBtn, { borderColor: palette.border }]}
          >
            <Text style={[styles.blockHeaderBtnText, { color: palette.textSecondary }]}>
              Bloquear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Faixa suave e discreta contra pedidos financeiros */}
      <View
        style={[
          styles.safetyBanner,
          { backgroundColor: safetyBannerBg, borderBottomColor: palette.border },
        ]}
      >
        <Text
          style={[
            styles.safetyText,
            { color: safetyBannerText, fontSize: fs(14) },
          ]}
        >
          Nunca envie dinheiro, códigos ou dados do banco.
        </Text>
      </View>

      {/* Corpo das mensagens */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messagesContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {conversation.messages.length === 0 ? (
          <View style={styles.emptyHistoryBox}>
            <Text
              style={[
                styles.emptyHistoryText,
                { color: palette.textSecondary, fontSize: fs(16) },
              ]}
            >
              Comece uma conversa tranquila com {firstName} no seu tempo.
            </Text>
          </View>
        ) : (
          conversation.messages.map((msg) => {
            const isMe = msg.sender === 'me';
            const isPlaying = playingMessageId === msg.id;

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageGroup,
                  isMe ? styles.alignRight : styles.alignLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe
                      ? {
                          backgroundColor: palette.primaryHover,
                          borderColor: palette.primaryHover,
                        }
                      : {
                          backgroundColor: palette.surface,
                          borderColor: palette.border,
                        },
                  ]}
                >
                  {msg.kind === 'photo' && msg.photoUrl ? (
                    <View style={styles.photoMsgWrap}>
                      <Image
                        source={{ uri: msg.photoUrl }}
                        style={styles.msgPhoto}
                        accessibilityLabel={msg.text}
                      />
                      <Text
                        style={[
                          styles.bubbleText,
                          {
                            color: isMe ? palette.textOnPrimary : palette.textPrimary,
                            fontSize: fs(16),
                          },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  ) : msg.kind === 'audio' ? (
                    <TouchableOpacity
                      onPress={() =>
                        setPlayingMessageId((prev) => (prev === msg.id ? null : msg.id))
                      }
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPlaying ? 'Pausar mensagem de voz' : 'Ouvir mensagem de voz'
                      }
                      style={styles.audioBubbleRow}
                    >
                      <View
                        style={[
                          styles.audioPlayCircle,
                          {
                            backgroundColor: isMe
                              ? palette.surface
                              : palette.primaryHover,
                          },
                        ]}
                      >
                        <PlayIcon
                          size={18}
                          color={isMe ? palette.primaryHover : '#FFFFFF'}
                        />
                      </View>

                      <View style={styles.waveformWrap}>
                        {WAVEFORM_BARS.map((barHeight, barIdx) => (
                          <View
                            key={barIdx}
                            style={[
                              styles.waveformBar,
                              {
                                height: barHeight,
                                backgroundColor: isMe
                                  ? isPlaying && barIdx % 2 === 0
                                    ? '#FFFFFF'
                                    : 'rgba(255,255,255,0.75)'
                                  : isPlaying && barIdx % 2 === 0
                                    ? palette.primary
                                    : palette.textSecondary,
                              },
                            ]}
                          />
                        ))}
                      </View>

                      <Text
                        style={[
                          styles.audioDuration,
                          {
                            color: isMe ? '#FFFFFF' : palette.textPrimary,
                            fontSize: fs(15),
                          },
                        ]}
                      >
                        {formatDuration(msg.audioDurationSec ?? 1)}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text
                      style={[
                        styles.bubbleText,
                        {
                          color: isMe ? palette.textOnPrimary : palette.textPrimary,
                          fontSize: fs(16),
                        },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.metaOutside,
                    { color: palette.textMuted, fontSize: fs(13) },
                  ]}
                >
                  {msg.kind === 'audio'
                    ? `${msg.timestamp} • Mensagem de voz`
                    : isMe
                      ? `${msg.timestamp} • Lida`
                      : msg.timestamp}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bandeja acessível de envio de foto */}
      {showPhotoTray && !isRecording ? (
        <View
          style={[
            styles.photoTray,
            { backgroundColor: palette.surface, borderTopColor: palette.border },
          ]}
        >
          <Text
            style={[
              styles.trayTitle,
              { color: palette.textPrimary, fontSize: fs(15) },
            ]}
          >
            Escolha uma foto para enviar
          </Text>

          <View style={styles.photoChoicesRow}>
            {SAMPLE_CHAT_PHOTOS.map((photo) => {
              const selected = selectedPhotoId === photo.id;
              return (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => setSelectedPhotoId(photo.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.photoChoiceCard,
                    {
                      backgroundColor: selected ? palette.primarySoft : palette.background,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Image source={{ uri: photo.url }} style={styles.photoChoiceThumb} />
                  <Text
                    style={[
                      styles.photoChoiceLabel,
                      { color: palette.textPrimary, fontSize: fs(13) },
                    ]}
                  >
                    {photo.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.trayActionsRow}>
            <TouchableOpacity
              onPress={() => setShowPhotoTray(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar envio de foto"
              style={[
                styles.trayBtnOutline,
                { backgroundColor: palette.background, borderColor: palette.borderStrong },
              ]}
            >
              <CloseXIcon size={18} color={palette.textPrimary} />
              <Text
                style={[
                  styles.trayBtnText,
                  { color: palette.textPrimary, fontSize: fs(15) },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendSelectedPhoto}
              accessibilityRole="button"
              accessibilityLabel="Enviar foto selecionada"
              style={[styles.trayBtnPrimary, { backgroundColor: palette.primaryHover }]}
            >
              <SendIcon size={18} color={palette.textOnPrimary} />
              <Text
                style={[
                  styles.trayBtnText,
                  { color: palette.textOnPrimary, fontSize: fs(15) },
                ]}
              >
                Enviar foto
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Rodapé: Gravação de voz (sem precisar segurar) OU Caixa ampla + [Foto] [Áudio] [Enviar →] */}
      {isRecording ? (
        <View
          style={[
            styles.recordingBar,
            { backgroundColor: palette.surface, borderTopColor: palette.border },
          ]}
        >
          <View style={styles.recordingStatusRow}>
            <View style={[styles.recordingDot, { backgroundColor: palette.primary }]} />
            <Text
              style={[
                styles.recordingTitle,
                { color: palette.textPrimary, fontSize: fs(16) },
              ]}
            >
              Gravando áudio • {formatDuration(recordingSeconds)}
            </Text>
          </View>

          <View style={styles.recordingActionsRow}>
            <TouchableOpacity
              onPress={handleCancelRecording}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancelar gravação de áudio"
              style={[
                styles.trayBtnOutline,
                { backgroundColor: palette.background, borderColor: palette.borderStrong },
              ]}
            >
              <CloseXIcon size={18} color={palette.textPrimary} />
              <Text
                style={[
                  styles.trayBtnText,
                  { color: palette.textPrimary, fontSize: fs(15) },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendAudio}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Enviar áudio gravado"
              style={[styles.trayBtnPrimary, { backgroundColor: palette.primaryHover }]}
            >
              <SendIcon size={18} color={palette.textOnPrimary} />
              <Text
                style={[
                  styles.trayBtnText,
                  { color: palette.textOnPrimary, fontSize: fs(15) },
                ]}
              >
                Enviar áudio
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.composerWrapper,
            { backgroundColor: palette.surface, borderTopColor: palette.border },
          ]}
        >
          <View
            style={[
              styles.inputPill,
              {
                backgroundColor: palette.background,
                borderColor: palette.border,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Mensagem"
              placeholderTextColor={palette.textMuted}
              returnKeyType="send"
              onSubmitEditing={handleSendText}
              accessibilityLabel={`Escreva uma mensagem para ${firstName}`}
              style={[
                styles.inputBox,
                {
                  color: palette.textPrimary,
                  fontSize: fs(16),
                },
              ]}
            />

            <TouchableOpacity
              onPress={() => setShowPhotoTray((prev) => !prev)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Enviar foto"
              accessibilityState={{ expanded: showPhotoTray }}
              style={styles.pillCameraBtn}
            >
              <CameraIcon
                size={24}
                color={showPhotoTray ? palette.primaryText : palette.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={draft.trim().length > 0 ? handleSendText : handleStartRecording}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={
              draft.trim().length > 0 ? 'Enviar mensagem' : 'Gravar mensagem de voz'
            }
            accessibilityHint={
              draft.trim().length > 0
                ? 'Envia a mensagem digitada'
                : 'Toque uma vez para gravar áudio sem precisar segurar'
            }
            style={[
              styles.circleActionBtn,
              { backgroundColor: palette.primary },
            ]}
          >
            {draft.trim().length > 0 ? (
              <SendIcon size={22} color="#FFFFFF" />
            ) : (
              <MicIcon size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {showBlockModal && (
        <Modal
          visible={showBlockModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBlockModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.blockModalBox,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={[styles.blockBadge, { backgroundColor: palette.primarySoft }]}>
                <Text style={[styles.blockBadgeText, { color: palette.primaryText }]}>
                  Segurança e Privacidade
                </Text>
              </View>

              <Text style={[styles.blockModalTitle, { color: palette.textPrimary, fontSize: fs(20) }]}>
                Bloquear {conversation.fullName}?
              </Text>

              <Text style={[styles.blockModalBody, { color: palette.textSecondary, fontSize: fs(15) }]}>
                Ao confirmar, essa conversa será encerrada e vocês não verão mais o perfil um do outro no aplicativo. Essa pessoa não receberá nenhum aviso.
              </Text>

              <View style={styles.blockModalActions}>
                <TouchableOpacity
                  onPress={() => setShowBlockModal(false)}
                  style={[styles.modalCancelBtn, { borderColor: palette.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar e manter contato"
                >
                  <Text style={[styles.modalCancelBtnText, { color: palette.textPrimary, fontSize: fs(15) }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowBlockModal(false);
                    onBlockContact?.(conversation.profileId, conversation.fullName);
                  }}
                  style={[styles.modalConfirmBlockBtn, { backgroundColor: '#8B1E28' }]}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar bloqueio"
                >
                  <Text style={[styles.modalConfirmBlockBtnText, { fontSize: fs(15) }]}>
                    Confirmar bloqueio
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backIconBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    fontSize: 16,
  },
  contactTextCol: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontWeight: '800',
  },
  contactStatus: {
    fontWeight: '700',
  },
  safetyBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  safetyText: {
    fontWeight: '600',
    lineHeight: 20,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  emptyHistoryBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyHistoryText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  messageGroup: {
    width: '100%',
    gap: 6,
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleText: {
    lineHeight: 24,
  },
  metaOutside: {
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  photoMsgWrap: {
    gap: 10,
  },
  msgPhoto: {
    width: 230,
    height: 155,
    borderRadius: 12,
  },
  audioBubbleRow: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
  },
  audioDuration: {
    fontWeight: '700',
    marginLeft: 2,
  },
  photoTray: {
    borderTopWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  trayTitle: {
    fontWeight: '700',
  },
  photoChoicesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoChoiceCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  photoChoiceThumb: {
    width: '100%',
    height: 76,
    borderRadius: 10,
  },
  photoChoiceLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  trayActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recordingBar: {
    borderTopWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  recordingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingTitle: {
    fontWeight: '700',
  },
  recordingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trayBtnOutline: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trayBtnPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trayBtnText: {
    fontWeight: '700',
  },
  composerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  inputPill: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 4,
  },
  inputBox: {
    flex: 1,
    height: 52,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  pillCameraBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActionBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockHeaderBtn: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockHeaderBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blockModalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 22,
    gap: 14,
  },
  blockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  blockModalTitle: {
    fontWeight: '800',
  },
  blockModalBody: {
    lineHeight: 22,
  },
  blockModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalCancelBtnText: {
    fontWeight: '600',
  },
  modalConfirmBlockBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalConfirmBlockBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
