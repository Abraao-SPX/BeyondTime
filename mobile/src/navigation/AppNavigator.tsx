import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, SafeAreaView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BottomTabBar } from '../components/BottomTabBar';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { FacialVerificationFlowScreen } from '../screens/FacialVerificationFlowScreen';
import { HomePlaceholderScreen } from '../screens/HomePlaceholderScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingFlowScreen } from '../screens/OnboardingFlowScreen';
import { SplashWelcomeScreen } from '../screens/SplashWelcomeScreen';
import { logoutAccount, type AuthSession } from '../services/authService';
import {
  createConversationFromProfile,
  formatCurrentTime,
  INITIAL_CONVERSATIONS,
} from '../services/chatService';
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
  MainTab,
  RankedDiscoveryProfile,
  SendMessageOptions,
} from '../types/social';

function parseGoal(goal?: string): RelationshipGoal {
  if (goal === 'relacionamento' || goal === 'companhia' || goal === 'amizade') {
    return goal;
  }
  return 'amizade';
}

/**
 * Controlador de Navegação Mobile BeyondTime (Onda 1 + Onda 2: RF-05 e RF-07):
 * Splash -> Login / Cadastro (7 etapas) -> Reconhecimento Facial -> Abas (Descobrir, Conversas, Meu Perfil).
 */
export function AppNavigator() {
  const { palette, isDark } = useTheme();
  const [route, setRoute] = useState<AppRoute>('splash');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(
    INITIAL_ONBOARDING_DATA
  );

  // Estado das abas principais (RF-05 e RF-07)
  const [activeTab, setActiveTab] = useState<MainTab>('discover');
  const [conversations, setConversations] = useState<ChatConversation[]>(
    INITIAL_CONVERSATIONS
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Bloqueio de contatos e segurança defensiva (RF-08)
  const [blockedContacts, setBlockedContacts] = useState<BlockedContactMobile[]>([]);
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
    setAuthSession(null);
    setOnboardingData(INITIAL_ONBOARDING_DATA);
    setActiveConversationId(null);
    setActiveTab('discover');
    setRoute('splash');
    if (currentSession) {
      void logoutAccount(currentSession);
    }
  };

  const handleMutualConnection = (
    profile: RankedDiscoveryProfile,
    openChatNow: boolean
  ) => {
    const convId = `conv-${profile.id}`;
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === convId);
      if (exists) return prev;
      return [createConversationFromProfile(profile), ...prev];
    });

    if (openChatNow) {
      setActiveTab('conversations');
      setActiveConversationId(convId);
    }
  };

  const handleOpenConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
    setActiveConversationId(conversationId);
  };

  const handleSendMessage = (
    conversationId: string,
    text: string,
    options?: SendMessageOptions
  ) => {
    const nowTime = formatCurrentTime();
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          unreadCount: 0,
          lastTimestamp: nowTime,
          messages: [
            ...conv.messages,
            {
              id: `msg-${Date.now()}`,
              sender: 'me' as const,
              text,
              timestamp: nowTime,
              kind: options?.kind ?? 'text',
              audioDurationSec: options?.audioDurationSec,
              photoUrl: options?.photoUrl,
            },
          ],
        };
      });
      const current = updated.find((c) => c.id === conversationId);
      const others = updated.filter((c) => c.id !== conversationId);
      return current ? [current, ...others] : updated;
    });
  };

  const handleBlockContact = (profileId: string, fullName: string) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const existingConv = conversations.find(
      (c) => c.profileId === profileId || c.id === `conv-${profileId}`
    );
    const newBlocked: BlockedContactMobile = {
      id: profileId,
      fullName,
      age: existingConv?.age ?? 60,
      city: existingConv?.city ?? 'Aracaju',
      photoUrl: existingConv?.photoUrl ?? '',
      blockedAt: today,
    };

    setBlockedContacts((prev) =>
      prev.some((b) => b.id === profileId) ? prev : [newBlocked, ...prev]
    );

    // Ocultação mútua imediata no chat e na lista de conexões (RF-08)
    setConversations((prev) =>
      prev.filter((c) => c.profileId !== profileId && c.id !== `conv-${profileId}`)
    );
    setActiveConversationId(null);
  };

  const handleUnblockContact = (profileId: string) => {
    setBlockedContacts((prev) => prev.filter((b) => b.id !== profileId));
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
              isFaceVerified: true,
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
                    blockedProfileIds={blockedProfileIds}
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
});
