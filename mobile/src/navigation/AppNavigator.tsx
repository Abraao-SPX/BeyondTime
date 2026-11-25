import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BottomTabBar } from '../components/BottomTabBar';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { DiscoverScreen, type LikeActionResult } from '../screens/DiscoverScreen';
import { FacialVerificationFlowScreen } from '../screens/FacialVerificationFlowScreen';
import { HomePlaceholderScreen } from '../screens/HomePlaceholderScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingFlowScreen } from '../screens/OnboardingFlowScreen';
import { SplashWelcomeScreen } from '../screens/SplashWelcomeScreen';
import { ApiError, logoutAccount, type AuthSession } from '../services/authService';
import {
  createBlockContact,
  createChatStompConnection,
  deleteBlockContact,
  encodeChatPayload,
  fetchBlockedContacts,
  fetchChatConversations,
  fetchConversationMessages,
  fetchDiscoveryProfiles,
  mapBlockDtoToBlockedContact,
  mapConversationDtoToChatConversation,
  mapDiscoveryDtoToRankedProfile,
  mapKindToMessageType,
  mapMessageDtoToChatMessage,
  markConversationReadRest,
  openOrCreateConversation,
  sendEncryptedMessageRest,
  sendMatchInteraction,
  type ChatStompConnection,
  type EncryptedMessageDto,
  type ReadReceiptEventDto,
  type SendEncryptedMessageDto,
} from '../services/wave2ApiService';
import { TOUCH_TARGET_MIN } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import {
  AppRoute,
  INITIAL_ONBOARDING_DATA,
  OnboardingData,
  RelationshipGoal,
} from '../types/onboarding';
import type {
  BlockedContactMobile,
  ChatConversation,
  ChatMessage,
  MainTab,
  RankedDiscoveryProfile,
  SendMessageOptions,
} from '../types/social';

function parseGoal(goal?: string): RelationshipGoal {
  const lower = (goal || '').trim().toLowerCase();
  if (lower === 'relacionamento' || lower === 'companhia' || lower === 'amizade') {
    return lower;
  }
  return 'amizade';
}

function getFriendlyApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }
  return fallback;
}

function mergeMessagesUnique(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const merged: ChatMessage[] = [];
  for (const msg of [...existing, ...incoming]) {
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    merged.push(msg);
  }
  return merged;
}

/**
 * Controlador de Navegação Mobile BeyondTime (Onda 1 + Onda 2 integrada: RF-05, RF-07 e RF-08):
 * Splash -> Login / Cadastro (7 etapas) -> Reconhecimento Facial -> Abas (Descobrir, Conversas, Meu Perfil).
 */
export function AppNavigator() {
  const { palette, isDark, fs } = useTheme();
  const [route, setRoute] = useState<AppRoute>('splash');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(
    INITIAL_ONBOARDING_DATA
  );

  // Estado das abas principais (RF-05, RF-07 e RF-08 integrados à API real)
  const [activeTab, setActiveTab] = useState<MainTab>('discover');
  const [remoteDiscoveryProfiles, setRemoteDiscoveryProfiles] = useState<
    RankedDiscoveryProfile[]
  >([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [blockedContacts, setBlockedContacts] = useState<BlockedContactMobile[]>([]);
  const [isLoadingWave2, setIsLoadingWave2] = useState(false);
  const [wave2Error, setWave2Error] = useState<string | null>(null);

  const stompRef = useRef<ChatStompConnection | null>(null);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const conversationsRef = useRef<ChatConversation[]>(conversations);

  activeConversationIdRef.current = activeConversationId;
  conversationsRef.current = conversations;

  const blockedProfileIds = useMemo(
    () => blockedContacts.map((b) => b.id),
    [blockedContacts]
  );

  const totalUnreadCount = useMemo(
    () => conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
    [conversations]
  );

  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const reloadDiscovery = useCallback(async (session: AuthSession) => {
    setIsLoadingWave2(true);
    try {
      const dtos = await fetchDiscoveryProfiles(session, { limit: 30 });
      setRemoteDiscoveryProfiles(dtos.map(mapDiscoveryDtoToRankedProfile));
      setWave2Error(null);
    } catch (error) {
      setWave2Error(
        getFriendlyApiError(
          error,
          'Não foi possível carregar as sugestões de pessoas agora. Tente novamente em instantes.'
        )
      );
    } finally {
      setIsLoadingWave2(false);
    }
  }, []);

  const reloadConversations = useCallback(async (session: AuthSession) => {
    try {
      const convDtos = await fetchChatConversations(session);
      const mapped = await Promise.all(
        convDtos.map((dto) => mapConversationDtoToChatConversation(dto, session.userId))
      );
      setConversations((prev) => {
        const prevById = new Map(prev.map((c) => [c.id, c]));
        return mapped.map((nextConv) => {
          const existing = prevById.get(nextConv.id);
          if (existing && existing.messages.length > nextConv.messages.length) {
            return {
              ...nextConv,
              messages: mergeMessagesUnique(existing.messages, nextConv.messages),
            };
          }
          return nextConv;
        });
      });
    } catch (error) {
      setWave2Error(
        getFriendlyApiError(
          error,
          'Não foi possível atualizar suas conversas agora. Verifique sua conexão.'
        )
      );
    }
  }, []);

  const appendMessageDeduplicated = useCallback(
    (conversationId: string, msg: ChatMessage, markUnreadIfInactive: boolean) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conversationId);
        if (!exists) return prev;

        const updated = prev.map((conv) => {
          if (conv.id !== conversationId) return conv;
          if (conv.messages.some((m) => m.id === msg.id)) {
            return conv;
          }
          const isOpenNow = activeConversationIdRef.current === conversationId;
          const nextUnread =
            markUnreadIfInactive && msg.sender === 'other' && !isOpenNow
              ? conv.unreadCount + 1
              : isOpenNow
                ? 0
                : conv.unreadCount;

          return {
            ...conv,
            unreadCount: nextUnread,
            lastTimestamp: msg.timestamp,
            messages: [...conv.messages, msg],
          };
        });

        const current = updated.find((c) => c.id === conversationId);
        const others = updated.filter((c) => c.id !== conversationId);
        return current ? [current, ...others] : updated;
      });
    },
    []
  );

  // Carrega RF-05, RF-07 e RF-08 em paralelo e conecta WebSocket STOMP (/ws-chat) ao entrar na home autenticado
  useEffect(() => {
    if (route !== 'home' || !authSession) {
      if (stompRef.current) {
        stompRef.current.disconnect();
        stompRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const session = authSession;

    async function bootstrapWave2() {
      setIsLoadingWave2(true);
      setWave2Error(null);
      try {
        const [discDtos, convDtos, blockDtos] = await Promise.all([
          fetchDiscoveryProfiles(session, { limit: 30 }),
          fetchChatConversations(session),
          fetchBlockedContacts(session),
        ]);
        if (cancelled) return;

        setRemoteDiscoveryProfiles(discDtos.map(mapDiscoveryDtoToRankedProfile));
        setBlockedContacts(blockDtos.map(mapBlockDtoToBlockedContact));
        const mappedConvs = await Promise.all(
          convDtos.map((dto) => mapConversationDtoToChatConversation(dto, session.userId))
        );
        if (!cancelled) {
          setConversations(mappedConvs);
        }
      } catch (error) {
        if (!cancelled) {
          setWave2Error(
            getFriendlyApiError(
              error,
              'Não foi possível conectar ao servidor BeyondTime para carregar seus dados.'
            )
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWave2(false);
        }
      }
    }

    void bootstrapWave2();

    const stomp = createChatStompConnection(session, {
      onMessage: (incoming: EncryptedMessageDto) => {
        void (async () => {
          if (cancelled) return;
          const mappedMsg = await mapMessageDtoToChatMessage(incoming, session.userId);
          if (cancelled) return;

          const hasConv = conversationsRef.current.some(
            (c) => c.id === incoming.conversationId
          );
          if (!hasConv) {
            await reloadConversations(session);
          }

          appendMessageDeduplicated(incoming.conversationId, mappedMsg, true);

          if (
            mappedMsg.sender === 'other' &&
            activeConversationIdRef.current === incoming.conversationId
          ) {
            const sentViaStomp = stompRef.current?.sendReadReceipt(incoming.conversationId);
            if (!sentViaStomp) {
              void markConversationReadRest(session, incoming.conversationId).catch(
                () => undefined
              );
            }
          }
        })();
      },
      onReadReceipt: (receipt: ReadReceiptEventDto) => {
        if (cancelled) return;
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id !== receipt.conversationId) return conv;
            if (receipt.readerId === session.userId) {
              return { ...conv, unreadCount: 0 };
            }
            return {
              ...conv,
              messages: conv.messages.map((m) =>
                m.sender === 'me' ? { ...m, read: true } : m
              ),
            };
          })
        );
      },
    });
    stompRef.current = stomp;

    return () => {
      cancelled = true;
      stomp.disconnect();
      if (stompRef.current === stomp) {
        stompRef.current = null;
      }
    };
  }, [appendMessageDeduplicated, authSession, reloadConversations, route]);

  // Suporte defensivo ao botão físico Voltar no Android
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'login') {
        setRoute('splash');
        return true;
      }
      if (route === 'facialVerification') {
        setRoute('onboarding');
        return true;
      }
      if (route === 'home' && activeTab !== 'discover' && !activeConversationId) {
        setActiveTab('discover');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [activeConversationId, activeTab, route]);

  const handleResetAndExit = () => {
    const currentSession = authSession;
    if (stompRef.current) {
      stompRef.current.disconnect();
      stompRef.current = null;
    }
    setAuthSession(null);
    setOnboardingData(INITIAL_ONBOARDING_DATA);
    setRemoteDiscoveryProfiles([]);
    setConversations([]);
    setBlockedContacts([]);
    setActiveConversationId(null);
    setWave2Error(null);
    setActiveTab('discover');
    setRoute('splash');
    if (currentSession) {
      void logoutAccount(currentSession);
    }
  };

  const handleLikeProfile = async (
    profile: RankedDiscoveryProfile
  ): Promise<LikeActionResult> => {
    if (!authSession) {
      setWave2Error('Faça login novamente para curtir perfis.');
      return { matched: false, conversationId: null };
    }
    try {
      const response = await sendMatchInteraction(authSession, 'like', profile.id);
      setWave2Error(null);
      setRemoteDiscoveryProfiles((prev) => prev.filter((p) => p.id !== profile.id));

      if (response.matched) {
        await reloadConversations(authSession);
        return { matched: true, conversationId: response.conversationId };
      }
      return { matched: false, conversationId: null };
    } catch (error) {
      setWave2Error(
        getFriendlyApiError(
          error,
          'Não foi possível registrar sua curtida agora. Tente novamente.'
        )
      );
      return { matched: false, conversationId: null };
    }
  };

  const handlePassProfile = async (profile: RankedDiscoveryProfile): Promise<void> => {
    if (!authSession) {
      setWave2Error('Faça login novamente para avançar nos perfis.');
      return;
    }
    try {
      await sendMatchInteraction(authSession, 'pass', profile.id);
      setWave2Error(null);
      setRemoteDiscoveryProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    } catch (error) {
      setWave2Error(
        getFriendlyApiError(
          error,
          'Não foi possível avançar para o próximo perfil agora. Tente novamente.'
        )
      );
    }
  };

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
      setActiveConversationId(conversationId);

      if (!authSession) return;
      const session = authSession;

      void (async () => {
        try {
          const dtos = await fetchConversationMessages(session, conversationId, 100);
          const decoded = await Promise.all(
            dtos.map((dto) => mapMessageDtoToChatMessage(dto, session.userId))
          );
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== conversationId) return conv;
              const merged = mergeMessagesUnique(decoded, conv.messages);
              const lastMsg = merged[merged.length - 1];
              return {
                ...conv,
                unreadCount: 0,
                lastTimestamp: lastMsg ? lastMsg.timestamp : conv.lastTimestamp,
                messages: merged,
              };
            })
          );
          setWave2Error(null);
        } catch (error) {
          setWave2Error(
            getFriendlyApiError(
              error,
              'Não foi possível carregar o histórico desta conversa agora.'
            )
          );
        }

        const sentViaStomp = stompRef.current?.sendReadReceipt(conversationId);
        if (!sentViaStomp) {
          void markConversationReadRest(session, conversationId).catch(() => undefined);
        }
      })();
    },
    [authSession]
  );

  const handleMutualConnection = (
    profile: RankedDiscoveryProfile,
    openChatNow: boolean,
    conversationId?: string | null
  ) => {
    if (!openChatNow || !authSession) return;
    const session = authSession;

    void (async () => {
      try {
        let targetConvId = conversationId ?? null;
        if (!targetConvId) {
          const convDto = await openOrCreateConversation(session, profile.id);
          const mappedConv = await mapConversationDtoToChatConversation(
            convDto,
            session.userId
          );
          targetConvId = mappedConv.id;
          setConversations((prev) =>
            prev.some((c) => c.id === mappedConv.id) ? prev : [mappedConv, ...prev]
          );
        } else if (!conversationsRef.current.some((c) => c.id === targetConvId)) {
          await reloadConversations(session);
        }

        if (targetConvId) {
          setActiveTab('conversations');
          handleOpenConversation(targetConvId);
        }
      } catch (error) {
        setWave2Error(
          getFriendlyApiError(
            error,
            'Não foi possível abrir a conversa com esta pessoa agora.'
          )
        );
      }
    })();
  };

  const handleSendMessage = (
    conversationId: string,
    text: string,
    options?: SendMessageOptions
  ) => {
    if (!authSession) {
      setWave2Error('Sua sessão expirou. Entre novamente para enviar mensagens.');
      return;
    }
    const session = authSession;

    void (async () => {
      try {
        const rawPayload =
          options?.kind === 'photo' && options.photoUrl
            ? JSON.stringify({ caption: text, photoUrl: options.photoUrl })
            : text;

        const encoded = await encodeChatPayload(rawPayload, conversationId);
        const payload: SendEncryptedMessageDto = {
          conversationId,
          ciphertext: encoded.ciphertext,
          iv: encoded.iv,
          messageType: mapKindToMessageType(options?.kind),
          mediaDurationSeconds:
            options?.kind === 'audio' ? options.audioDurationSec ?? 1 : null,
          senderKeyVersion: encoded.senderKeyVersion,
        };

        const sentViaStomp = stompRef.current?.sendMessage(payload);
        if (!sentViaStomp) {
          const savedDto = await sendEncryptedMessageRest(session, payload);
          const mappedMsg = await mapMessageDtoToChatMessage(savedDto, session.userId);
          appendMessageDeduplicated(conversationId, mappedMsg, false);
        }
        setWave2Error(null);
      } catch (error) {
        setWave2Error(
          getFriendlyApiError(
            error,
            'Não foi possível enviar sua mensagem agora. Verifique sua conexão e tente novamente.'
          )
        );
      }
    })();
  };

  const handleBlockContact = (profileId: string, _fullName: string, reason?: string) => {
    if (!authSession) {
      setWave2Error('Sua sessão expirou. Entre novamente para bloquear contatos.');
      return;
    }
    const session = authSession;

    void (async () => {
      try {
        const blockedDto = await createBlockContact(session, profileId, reason);
        const mappedBlock = mapBlockDtoToBlockedContact(blockedDto);

        setBlockedContacts((prev) =>
          prev.some((b) => b.id === mappedBlock.id) ? prev : [mappedBlock, ...prev]
        );
        setConversations((prev) => prev.filter((c) => c.profileId !== profileId));
        setRemoteDiscoveryProfiles((prev) => prev.filter((p) => p.id !== profileId));
        setActiveConversationId(null);
        setWave2Error(null);
      } catch (error) {
        setWave2Error(
          getFriendlyApiError(
            error,
            'Não foi possível bloquear este contato agora. Tente novamente.'
          )
        );
      }
    })();
  };

  const handleUnblockContact = (profileId: string) => {
    if (!authSession) {
      setWave2Error('Sua sessão expirou. Entre novamente para desbloquear contatos.');
      return;
    }
    const session = authSession;

    void (async () => {
      try {
        await deleteBlockContact(session, profileId);
        setBlockedContacts((prev) => prev.filter((b) => b.id !== profileId));
        setWave2Error(null);
        await reloadDiscovery(session);
      } catch (error) {
        setWave2Error(
          getFriendlyApiError(
            error,
            'Não foi possível desbloquear este contato agora. Tente novamente.'
          )
        );
      }
    })();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {route === 'splash' && (
        <SplashWelcomeScreen
          onCreateAccount={() => setRoute('onboarding')}
          onLogin={() => setRoute('login')}
        />
      )}

      {route === 'login' && (
        <LoginScreen
          onBack={() => setRoute('splash')}
          onGoToRegister={() => setRoute('onboarding')}
          onLoginSuccess={(contact, session, profile) => {
            setAuthSession(session);
            setOnboardingData((prev) => ({
              ...prev,
              contact,
              fullName: profile?.fullName || prev.fullName || contact.split('@')[0],
              city: profile?.city || prev.city,
              selectedHobbies:
                profile?.hobbies && profile.hobbies.length > 0
                  ? profile.hobbies
                  : prev.selectedHobbies,
              goal: parseGoal(profile?.goal),
              isFaceVerified: Boolean(profile?.verifiedBadge50plus),
            }));
            setActiveTab('discover');
            setActiveConversationId(null);
            setRoute('home');
          }}
        />
      )}

      {route === 'onboarding' && (
        <OnboardingFlowScreen
          data={onboardingData}
          onChangeData={setOnboardingData}
          onExitToSplash={handleResetAndExit}
          onSwitchToLogin={() => setRoute('login')}
          onCompleteToFacial={(session) => {
            setAuthSession(session);
            setRoute('facialVerification');
          }}
        />
      )}

      {route === 'facialVerification' && (
        <FacialVerificationFlowScreen
          onBack={() => setRoute('onboarding')}
          onSkipForLater={() => {
            setActiveTab('discover');
            setActiveConversationId(null);
            setRoute('home');
          }}
          onVerificationComplete={(selfieUri) => {
            setOnboardingData((prev) => ({
              ...prev,
              verifiedSelfieUri: selfieUri,
            }));
            setActiveTab('discover');
            setActiveConversationId(null);
            setRoute('home');
          }}
        />
      )}

      {route === 'home' && (
        <View style={styles.mainShell}>
          {wave2Error ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark ? '#3A1820' : '#FDECEF',
                  borderBottomColor: palette.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.errorBannerText,
                  { color: isDark ? '#FFD5DD' : '#6A0F24', fontSize: fs(14) },
                ]}
              >
                {wave2Error}
              </Text>
              <TouchableOpacity
                onPress={() => setWave2Error(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar aviso de erro"
                style={[
                  styles.errorDismissBtn,
                  { borderColor: isDark ? '#FF9EB2' : '#6A0F24' },
                ]}
              >
                <Text
                  style={[
                    styles.errorDismissText,
                    { color: isDark ? '#FFD5DD' : '#6A0F24', fontSize: fs(13) },
                  ]}
                >
                  Fechar
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {activeConversation ? (
            <ChatThreadScreen
              conversation={activeConversation}
              onBackToList={() => setActiveConversationId(null)}
              onSendMessage={handleSendMessage}
              onBlockContact={handleBlockContact}
            />
          ) : (
            <>
              <View style={styles.tabContent}>
                {activeTab === 'discover' && (
                  <DiscoverScreen
                    userName={onboardingData.fullName || 'Você'}
                    userCity={onboardingData.city}
                    userHobbies={onboardingData.selectedHobbies}
                    remoteProfiles={remoteDiscoveryProfiles}
                    blockedProfileIds={blockedProfileIds}
                    isLoading={isLoadingWave2}
                    errorMessage={wave2Error}
                    onLikeProfile={handleLikeProfile}
                    onPassProfile={handlePassProfile}
                    onRefreshProfiles={() => {
                      if (authSession) {
                        void reloadDiscovery(authSession);
                      }
                    }}
                    onMutualConnection={handleMutualConnection}
                  />
                )}

                {activeTab === 'conversations' && (
                  <ConversationsScreen
                    conversations={conversations}
                    onSelectConversation={handleOpenConversation}
                  />
                )}

                {activeTab === 'profile' && (
                  <HomePlaceholderScreen
                    userData={onboardingData}
                    blockedContacts={blockedContacts}
                    onUnblockContact={handleUnblockContact}
                    onRepeatFacialVerification={() => setRoute('facialVerification')}
                    onSignOut={handleResetAndExit}
                  />
                )}
              </View>

              <BottomTabBar
                activeTab={activeTab}
                unreadCount={totalUnreadCount}
                onSelectTab={(tab) => {
                  setActiveConversationId(null);
                  setActiveTab(tab);
                }}
              />
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainShell: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
  },
  errorBannerText: {
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorDismissBtn: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorDismissText: {
    fontWeight: '700',
  },
});
