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
  ChevronLeftIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../components/Icons';
import { buildStarterSuggestions } from '../services/chatService';
import { TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import type { ChatConversation } from '../types/social';

interface ChatThreadScreenProps {
  conversation: ChatConversation;
  onBackToList: () => void;
  onSendMessage: (conversationId: string, text: string) => void;
}

/**
 * Tela Dedicada de Conversa (estilo WhatsApp simplificado 50+):
 * - Botão explícito "← Conversas" no topo.
 * - Aviso discreto contra pedidos financeiros.
 * - Sugestões clicáveis quando o histórico está vazio.
 * - Barra inferior ampla com botão explícito "Enviar" (ícone SVG + texto).
 */
export function ChatThreadScreen({
  conversation,
  onBackToList,
  onSendMessage,
}: ChatThreadScreenProps) {
  const { palette, fs } = useTheme();
  const [draft, setDraft] = useState('');
  const [imgError, setImgError] = useState(false);
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

  const handleSend = () => {
    const clean = draft.trim();
    if (!clean) return;
    onSendMessage(conversation.id, clean);
    setDraft('');
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
      {/* Topo da conversa com botão explícito "← Conversas" */}
      <View
        style={[
          styles.header,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <TouchableOpacity
          onPress={onBackToList}
          accessibilityRole="button"
          accessibilityLabel="Voltar para Conversas"
          style={styles.backBtn}
        >
          <ChevronLeftIcon size={22} color={palette.textPrimary} />
          <Text
            style={[
              styles.backBtnText,
              { color: palette.textPrimary, fontSize: fs(16) },
            ]}
          >
            Conversas
          </Text>
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
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: palette.textPrimary, fontSize: fs(16) },
                    ]}
                  >
                    {msg.text}
                  </Text>
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

      {/* Barra inferior ampla com botão explícito "Enviar" */}
      <View
        style={[
          styles.composerBar,
          { backgroundColor: palette.surface, borderTopColor: palette.border },
        ]}
      >
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

        <TouchableOpacity
          onPress={handleSend}
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
    paddingRight: 8,
  },
  backBtnText: {
    fontWeight: '700',
  },
  contactBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    fontSize: 15,
  },
  contactTextCol: {
    maxWidth: 170,
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
    gap: 4,
  },
  bubbleText: {
    lineHeight: 23,
  },
  bubbleTime: {
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1.5,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 110,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendButtonText: {
    fontWeight: '700',
  },
});
