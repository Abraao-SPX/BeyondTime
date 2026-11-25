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
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
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
import type { ChatConversation, ChatMessage, SendMessageOptions } from '../types/social';

interface ChatThreadScreenProps {
  conversation: ChatConversation;
  onBackToList: () => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    options?: SendMessageOptions
  ) => Promise<boolean> | boolean | void;
  onBlockContact?: (profileId: string, fullName: string) => void;
}

interface PendingPhotoSelection {
  uri: string;
  mimeType: string;
  label: string;
}

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
  const [isSending, setIsSending] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Gravação e reprodução real de voz (expo-av, toque único sem precisar segurar)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  // Bandeja de envio de foto real (galeria ou câmera via expo-image-picker)
  const [showPhotoTray, setShowPhotoTray] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhotoSelection | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const firstName = conversation.fullName.split(' ')[0] || conversation.fullName;

  useEffect(() => {
    return () => {
      const activeRec = recordingRef.current;
      recordingRef.current = null;
      if (activeRec) {
        void activeRec.stopAndUnloadAsync().catch(() => undefined);
      }
      const activeSound = soundRef.current;
      soundRef.current = null;
      if (activeSound) {
        void activeSound.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackToList();
      return true;
    });
    return () => sub.remove();
  }, [onBackToList]);

  useEffect(() => {
    setImgError(false);
  }, [conversation.id, conversation.photoUrl]);

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

  const handleSendText = async () => {
    const clean = draft.trim();
    if (!clean || isSending) return;
    setIsSending(true);
    try {
      const result = await onSendMessage(conversation.id, clean, { kind: 'text' });
      if (result !== false) {
        setDraft('');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleStartRecording = async () => {
    setShowPhotoTray(false);
    setPendingPhoto(null);
    setMediaNotice(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setMediaNotice(
          'Permita o acesso ao microfone nas configurações do aparelho para gravar mensagens de voz.'
        );
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordingSeconds(1);
      setIsRecording(true);
    } catch {
      setMediaNotice(
        'Não foi possível iniciar a gravação de áudio neste aparelho. Você pode enviar texto ou foto.'
      );
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  };

  const handleCancelRecording = async () => {
    const activeRec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    if (activeRec) {
      try {
        await activeRec.stopAndUnloadAsync();
      } catch {
        // ignora erro ao descartar gravação
      }
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      // ignora
    }
  };

  const handleSendAudio = async () => {
    if (isSending) return;
    const activeRec = recordingRef.current;
    recordingRef.current = null;
    const duration = Math.max(1, recordingSeconds);
    setIsRecording(false);
    setRecordingSeconds(0);

    let recordedUri: string | undefined;
    if (activeRec) {
      try {
        await activeRec.stopAndUnloadAsync();
        recordedUri = activeRec.getURI() ?? undefined;
      } catch {
        // ignora erro ao finalizar gravação
      }
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      // ignora
    }

    if (!recordedUri) {
      setMediaNotice('Não foi possível salvar o áudio gravado. Tente novamente.');
      return;
    }

    setIsSending(true);
    try {
      const ok = await onSendMessage(
        conversation.id,
        `Mensagem de voz (${formatDuration(duration)})`,
        {
          kind: 'audio',
          audioDurationSec: duration,
          audioUri: recordedUri,
          mimeType: Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4',
        }
      );
      if (ok === false) {
        setMediaNotice('Não foi possível enviar o áudio agora. Tente novamente.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleTogglePlayAudio = async (msg: ChatMessage) => {
    if (playingMessageId === msg.id) {
      const currentSound = soundRef.current;
      soundRef.current = null;
      setPlayingMessageId(null);
      if (currentSound) {
        void currentSound.stopAsync().then(() => currentSound.unloadAsync()).catch(() => undefined);
      }
      return;
    }

    if (soundRef.current) {
      const prev = soundRef.current;
      soundRef.current = null;
      void prev.stopAsync().then(() => prev.unloadAsync()).catch(() => undefined);
    }

    if (!msg.audioUri) {
      setMediaNotice('Este áudio ainda está sendo carregado ou não possui arquivo anexado.');
      return;
    }

    try {
      setMediaNotice(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: msg.audioUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingMessageId(msg.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingMessageId((curr) => (curr === msg.id ? null : curr));
          void sound.unloadAsync().catch(() => undefined);
          if (soundRef.current === sound) {
            soundRef.current = null;
          }
        }
      });
    } catch {
      setPlayingMessageId(null);
      setMediaNotice('Não foi possível reproduzir esta mensagem de voz agora.');
    }
  };

  const handlePickPhotoFromLibrary = async () => {
    setMediaNotice(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setMediaNotice('Permita o acesso às fotos do aparelho para escolher uma imagem.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.78,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setPendingPhoto({
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          label: asset.fileName || 'Foto enviada',
        });
      }
    } catch {
      setMediaNotice('Não foi possível abrir a galeria de fotos agora.');
    }
  };

  const handleTakePhotoWithCamera = async () => {
    setMediaNotice(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setMediaNotice('Permita o acesso à câmera do aparelho para tirar uma foto.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.78,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setPendingPhoto({
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          label: 'Foto da câmera',
        });
      }
    } catch {
      setMediaNotice('Não foi possível abrir a câmera agora.');
    }
  };

  const handleSendSelectedPhoto = async () => {
    if (!pendingPhoto || isSending) return;
    setIsSending(true);
    try {
      const ok = await onSendMessage(conversation.id, draft.trim() || pendingPhoto.label, {
        kind: 'photo',
        photoUrl: pendingPhoto.uri,
        mimeType: pendingPhoto.mimeType,
      });
      if (ok !== false) {
        setPendingPhoto(null);
        setShowPhotoTray(false);
        setDraft('');
        setMediaNotice(null);
      } else {
        setMediaNotice('Não foi possível enviar a foto agora. Tente novamente.');
      }
    } finally {
      setIsSending(false);
    }
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
          {!imgError && conversation.photoUrl ? (
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
                      onPress={() => void handleTogglePlayAudio(msg)}
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
                      ? msg.read
                        ? `${msg.timestamp} • Lida`
                        : `${msg.timestamp} • Enviada`
                      : msg.timestamp}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {mediaNotice ? (
        <View
          style={[
            styles.safetyBanner,
            { backgroundColor: palette.primarySoft, borderBottomColor: palette.border },
          ]}
        >
          <Text style={[styles.safetyText, { color: palette.textPrimary, fontSize: fs(14) }]}>
            {mediaNotice}
          </Text>
        </View>
      ) : null}

      {/* Bandeja acessível de envio de foto real (galeria ou câmera) */}
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
            Escolha uma foto do seu aparelho
          </Text>

          {pendingPhoto ? (
            <View style={styles.photoChoicesRow}>
              <View
                style={[
                  styles.photoChoiceCard,
                  {
                    backgroundColor: palette.primarySoft,
                    borderColor: palette.primary,
                  },
                ]}
              >
                <Image source={{ uri: pendingPhoto.uri }} style={styles.photoChoiceThumb} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.photoChoiceLabel,
                    { color: palette.textPrimary, fontSize: fs(13) },
                  ]}
                >
                  {pendingPhoto.label}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.trayActionsRow}>
              <TouchableOpacity
                onPress={() => void handlePickPhotoFromLibrary()}
                accessibilityRole="button"
                accessibilityLabel="Escolher foto da galeria"
                style={[
                  styles.trayBtnOutline,
                  { backgroundColor: palette.background, borderColor: palette.borderStrong },
                ]}
              >
                <CameraIcon size={18} color={palette.textPrimary} />
                <Text
                  style={[
                    styles.trayBtnText,
                    { color: palette.textPrimary, fontSize: fs(15) },
                  ]}
                >
                  Galeria
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleTakePhotoWithCamera()}
                accessibilityRole="button"
                accessibilityLabel="Tirar foto com a câmera"
                style={[
                  styles.trayBtnOutline,
                  { backgroundColor: palette.background, borderColor: palette.borderStrong },
                ]}
              >
                <CameraIcon size={18} color={palette.textPrimary} />
                <Text
                  style={[
                    styles.trayBtnText,
                    { color: palette.textPrimary, fontSize: fs(15) },
                  ]}
                >
                  Câmera
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.trayActionsRow}>
            <TouchableOpacity
              onPress={() => {
                setPendingPhoto(null);
                setShowPhotoTray(false);
                setMediaNotice(null);
              }}
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
              onPress={() => void handleSendSelectedPhoto()}
              disabled={!pendingPhoto || isSending}
              accessibilityRole="button"
              accessibilityLabel="Enviar foto selecionada"
              style={[
                styles.trayBtnPrimary,
                {
                  backgroundColor:
                    pendingPhoto && !isSending ? palette.primaryHover : palette.border,
                },
              ]}
            >
              <SendIcon size={18} color={palette.textOnPrimary} />
              <Text
                style={[
                  styles.trayBtnText,
                  { color: palette.textOnPrimary, fontSize: fs(15) },
                ]}
              >
                {isSending ? 'Enviando...' : 'Enviar foto'}
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
