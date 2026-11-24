import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BeyondTimeSymbol } from '../components/BeyondTimeLogo';
import { MessageCircleIcon, ShieldCheckIcon } from '../components/Icons';
import { useTheme } from '../theme/ThemeContext';
import type { ChatConversation } from '../types/social';

interface ConversationsScreenProps {
  conversations: ChatConversation[];
  onSelectConversation: (conversationId: string) => void;
}

/**
 * Lista de Conversas limpa (estilo WhatsApp 50+):
 * Foto, nome completo sem cortes, prévia da última mensagem, horário e badge de não lidas.
 */
export function ConversationsScreen({
  conversations,
  onSelectConversation,
}: ConversationsScreenProps) {
  const { palette, fs } = useTheme();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <BeyondTimeSymbol size={34} />
          <Text
            style={[
              styles.headerTitle,
              { color: palette.textPrimary, fontSize: fs(22) },
            ]}
          >
            Conversas
          </Text>
        </View>
        <Text
          style={[
            styles.headerCount,
            { color: palette.textSecondary, fontSize: fs(14) },
          ]}
        >
          {conversations.length}{' '}
          {conversations.length === 1 ? 'conexão' : 'conexões'}
        </Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyBox}>
          <View
            style={[
              styles.emptyCircle,
              { backgroundColor: palette.primarySoft, borderColor: palette.border },
            ]}
          >
            <MessageCircleIcon size={32} color={palette.primaryText} />
          </View>
          <Text
            style={[
              styles.emptyTitle,
              { color: palette.textPrimary, fontSize: fs(20) },
            ]}
          >
            Suas conversas aparecerão aqui
          </Text>
          <Text
            style={[
              styles.emptyDesc,
              { color: palette.textSecondary, fontSize: fs(16) },
            ]}
          >
            Quando você e outra pessoa se curtirem na aba Descobrir, a conversa fica pronta
            para começar no seu tempo.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {conversations.map((conv) => {
            const lastMessage = conv.messages[conv.messages.length - 1];
            const previewText = lastMessage
              ? lastMessage.sender === 'me'
                ? `Você: ${lastMessage.text}`
                : lastMessage.text
              : 'Nova conexão — toque para iniciar a conversa';
            const hasUnread = conv.unreadCount > 0;
            const initials = conv.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join('');

            return (
              <TouchableOpacity
                key={conv.id}
                onPress={() => onSelectConversation(conv.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Abrir conversa com ${conv.fullName}, ${
                  hasUnread
                    ? `${conv.unreadCount} mensagens não lidas`
                    : 'sem mensagens não lidas'
                }`}
                style={[
                  styles.rowCard,
                  {
                    backgroundColor: hasUnread ? palette.primarySoft : palette.surface,
                    borderColor: hasUnread ? palette.primary : palette.border,
                  },
                ]}
              >
                <View style={styles.avatarWrap}>
                  {!imageErrors[conv.id] ? (
                    <Image
                      source={{ uri: conv.photoUrl }}
                      style={styles.avatar}
                      onError={() =>
                        setImageErrors((prev) => ({ ...prev, [conv.id]: true }))
                      }
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarFallback,
                        { backgroundColor: palette.primarySoft, borderColor: palette.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarInitials,
                          { color: palette.primaryText, fontSize: fs(18) },
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>
                  )}
                  {conv.verified ? (
                    <View
                      style={[
                        styles.verifiedDot,
                        { backgroundColor: palette.verifiedBg, borderColor: palette.surface },
                      ]}
                    >
                      <ShieldCheckIcon size={12} color={palette.verifiedText} />
                    </View>
                  ) : null}
                </View>

                <View style={styles.textCol}>
                  <View style={styles.topLine}>
                    <Text
                      style={[
                        styles.fullName,
                        { color: palette.textPrimary, fontSize: fs(17) },
                      ]}
                    >
                      {conv.fullName}, {conv.age}
                    </Text>
                    <Text
                      style={[
                        styles.timeText,
                        {
                          color: hasUnread ? palette.primaryText : palette.textMuted,
                          fontWeight: hasUnread ? '700' : '600',
                          fontSize: fs(13),
                        },
                      ]}
                    >
                      {conv.lastTimestamp}
                    </Text>
                  </View>

                  <View style={styles.bottomLine}>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.previewText,
                        {
                          color: hasUnread ? palette.textPrimary : palette.textSecondary,
                          fontWeight: hasUnread ? '600' : '400',
                          fontSize: fs(15),
                        },
                      ]}
                    >
                      {previewText}
                    </Text>

                    {hasUnread ? (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: palette.primary },
                        ]}
                      >
                        <Text style={styles.unreadBadgeText}>
                          {conv.unreadCount > 9 ? '9+' : String(conv.unreadCount)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerCount: {
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  rowCard: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700',
  },
  verifiedDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 6,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  fullName: {
    flex: 1,
    fontWeight: '700',
    lineHeight: 22,
  },
  timeText: {
    marginTop: 2,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewText: {
    flex: 1,
    lineHeight: 21,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 24,
  },
});
