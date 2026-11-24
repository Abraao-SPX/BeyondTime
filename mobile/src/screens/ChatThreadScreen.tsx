import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
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
  ShieldCheckIcon,
  SparklesIcon,
} from '../components/Icons';
import { buildStarterSuggestions } from '../services/chatService';
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
}

const SAMPLE_CHAT_PHOTOS = [
  {
    id: 'photo-orla',
    label: 'Caminhada na Orla',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'photo-cafe',
    label: 'Café da tarde',
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80',
  },
];

function formatDuration(seconds: number): string {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

/**
 * Tela Dedicada de Conversa (estilo WhatsApp simplificado 50+):
 * - Botão explícito "← Conversas" no topo.
 * - Aviso discreto contra pedidos financeiros.
 * - Sugestões clicáveis quando o histórico está vazio.
 * - Barra inferior com câmera (foto), microfone (áudio sem precisar segurar) e botão Enviar.
 */
export function ChatThreadScreen({
  conversation,
  onBackToList,
  onSendMessage,
}: ChatThreadScreenProps) {
  const { palette, fs } = useTheme();
  const [draft, setDraft] = useState('');
  const [imgError, setImgError] = useState(false);

  // Gravação de voz acessível (toque único: sem precisar ficar segurando)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Bandeja de envio de foto
  const [showPhotoTray, setShowPhotoTray] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState(SAMPLE_CHAT_PHOTOS[0].id);

  const scrollRef = useRef<ScrollView>(null);

  const starterSuggestions = useMemo(
    () => buildStarterSuggestions(conversation.sharedHobbyIds),
    [conversation.sharedHobbyIds]
  );

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
    onSendMessage(conversation.id, `Foto enviada: ${chosen.label}`, {
      kind: 'photo',
      photoUrl: chosen.url,
    });
    setShowPhotoTray(false);
  };

  const handlePickSuggestion = (suggestion: string) => {
    setDraft(suggestion);
  };

  const initials = conversation.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Topo da conversa: perfil do contato à esquerda (padrão WhatsApp) e botão Conversas à direita */}
      <View
        style={[
          styles.header,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
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
                { color: palette.textPrimary, fontSize: fs(16) },
              ]}
            >
              {conversation.fullName}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.contactCity,
                { color: palette.textSecondary, fontSize: fs(13) },
              ]}
            >
              {conversation.city}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onBackToList}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Conversas"
          style={[
            styles.backBtn,
            { backgroundColor: palette.background, borderColor: palette.border },
          ]}
        >
          <ChevronLeftIcon size={20} color={palette.textPrimary} />
          <Text
            style={[
              styles.backBtnText,
              { color: palette.textPrimary, fontSize: fs(15) },
            ]}
          >
            Conversas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Aviso discreto contra pedidos financeiros */}
      <View
        style={[
          styles.safetyBanner,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <ShieldCheckIcon size={18} color={palette.verifiedText} />
        <Text
          style={[
            styles.safetyText,
            { color: palette.textSecondary, fontSize: fs(13) },
          ]}
        >
          Para sua segurança, nunca envie dinheiro, PIX ou dados bancários por aqui.
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
          <View
            style={[
              styles.emptySuggestionsCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={styles.suggestionsHeader}>
              <SparklesIcon size={20} color={palette.primaryText} />
              <Text
                style={[
                  styles.suggestionsTitle,
                  { color: palette.textPrimary, fontSize: fs(17) },
                ]}
              >
                Ideias para começar a conversa
              </Text>
            </View>

            <Text
              style={[
                styles.suggestionsSubtitle,
                { color: palette.textSecondary, fontSize: fs(15) },
              ]}
            >
              Toque em uma sugestão abaixo para preencher sua mensagem, ou escreva do seu jeito:
            </Text>

            <View style={styles.suggestionsList}>
              {starterSuggestions.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handlePickSuggestion(item)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar sugestão: ${item}`}
                  style={[
                    styles.suggestionPill,
                    {
                      backgroundColor: palette.background,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.suggestionText,
                      { color: palette.textPrimary, fontSize: fs(15) },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          conversation.messages.map((msg) => {
            const isMe = msg.sender === 'me';
            const isPlaying = playingMessageId === msg.id;

            return (
              <View
                key={msg.id}
                style={[
                  styles.bubbleRow,
                  isMe ? styles.bubbleRowRight : styles.bubbleRowLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isMe ? palette.primarySoft : palette.surface,
                      borderColor: isMe ? palette.borderStrong : palette.border,
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
                          { color: palette.textPrimary, fontSize: fs(15) },
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
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPlaying ? 'Pausar mensagem de voz' : 'Ouvir mensagem de voz'
                      }
                      style={styles.audioBubbleRow}
                    >
                      <View
                        style={[
                          styles.audioPlayCircle,
                          { backgroundColor: palette.surface, borderColor: palette.primary },
                        ]}
                      >
                        <PlayIcon size={16} color={palette.primaryText} />
                      </View>
                      <View style={styles.audioInfoCol}>
                        <Text
                          style={[
                            styles.audioTitle,
                            { color: palette.textPrimary, fontSize: fs(15) },
                          ]}
                        >
                          {isPlaying ? 'Reproduzindo áudio...' : 'Mensagem de voz'}
                        </Text>
                        <Text
                          style={[
                            styles.audioDuration,
                            { color: palette.textSecondary, fontSize: fs(13) },
                          ]}
                        >
                          Duração: {formatDuration(msg.audioDurationSec ?? 1)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: palette.textPrimary, fontSize: fs(16) },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.bubbleTime,
                      { color: palette.textMuted, fontSize: fs(12) },
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
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
              style={[styles.trayBtnPrimary, { backgroundColor: palette.primary }]}
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

      {/* Barra inferior: Modo Gravação de Voz (sem precisar segurar) OU Campo de Mensagem */}
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
              Gravando mensagem de voz • {formatDuration(recordingSeconds)}
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
              style={[styles.trayBtnPrimary, { backgroundColor: palette.primary }]}
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
            styles.composerBar,
            { backgroundColor: palette.surface, borderTopColor: palette.border },
          ]}
        >
          {/* Botão Câmera (Enviar foto) */}
          <TouchableOpacity
            onPress={() => setShowPhotoTray((prev) => !prev)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enviar foto"
            accessibilityState={{ expanded: showPhotoTray }}
            style={[
              styles.mediaIconBtn,
              {
                backgroundColor: showPhotoTray ? palette.primarySoft : palette.background,
                borderColor: showPhotoTray ? palette.primary : palette.border,
              },
            ]}
          >
            <CameraIcon size={22} color={palette.primaryText} />
          </TouchableOpacity>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escreva sua mensagem..."
            placeholderTextColor={palette.textMuted}
            multiline
            accessibilityLabel="Campo para escrever sua mensagem"
            style={[
              styles.input,
              {
                backgroundColor: palette.background,
                borderColor: palette.border,
                color: palette.textPrimary,
                fontSize: fs(16),
              },
            ]}
          />

          {/* Botão Microfone (Gravar áudio sem precisar ficar segurando) */}
          <TouchableOpacity
            onPress={handleStartRecording}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Gravar mensagem de voz"
            accessibilityHint="Toque uma vez para iniciar a gravação sem precisar segurar"
            style={[
              styles.mediaIconBtn,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.border,
              },
            ]}
          >
            <MicIcon size={22} color={palette.primaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendText}
            disabled={!draft.trim()}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !draft.trim() }}
            style={[
              styles.sendButton,
              {
                backgroundColor: palette.primary,
                opacity: draft.trim() ? 1 : 0.45,
              },
            ]}
          >
            <SendIcon size={18} color={palette.textOnPrimary} />
            <Text
              style={[
                styles.sendButtonText,
                { color: palette.textOnPrimary, fontSize: fs(15) },
              ]}
            >
              Enviar
            </Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.2,
  },
  backBtnText: {
    fontWeight: '700',
  },
  contactBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    fontSize: 15,
  },
  contactTextCol: {
    flex: 1,
  },
  contactName: {
    fontWeight: '700',
  },
  contactCity: {
    fontWeight: '500',
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  safetyText: {
    flex: 1,
    lineHeight: 19,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
  emptySuggestionsCard: {
    marginTop: 'auto',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    gap: 12,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionsTitle: {
    fontWeight: '700',
  },
  suggestionsSubtitle: {
    lineHeight: 22,
  },
  suggestionsList: {
    gap: 10,
  },
  suggestionPill: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: 16,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  suggestionText: {
    lineHeight: 22,
  },
  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  bubbleText: {
    lineHeight: 23,
  },
  bubbleTime: {
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  photoMsgWrap: {
    gap: 8,
  },
  msgPhoto: {
    width: 210,
    height: 150,
    borderRadius: 12,
  },
  audioBubbleRow: {
    minHeight: TOUCH_TARGET_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  audioPlayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioInfoCol: {
    gap: 2,
  },
  audioTitle: {
    fontWeight: '700',
  },
  audioDuration: {
    fontWeight: '500',
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
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1.5,
  },
  mediaIconBtn: {
    width: 48,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 110,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendButtonText: {
    fontWeight: '700',
  },
});
