import React, { useEffect, useState } from 'react';
import { BackHandler, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FacialVerificationFlowScreen } from '../screens/FacialVerificationFlowScreen';
import { HomePlaceholderScreen } from '../screens/HomePlaceholderScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingFlowScreen } from '../screens/OnboardingFlowScreen';
import { SplashWelcomeScreen } from '../screens/SplashWelcomeScreen';
import { logoutAccount, type AuthSession } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';
import {
  AppRoute,
  INITIAL_ONBOARDING_DATA,
  OnboardingData,
  RelationshipGoal,
} from '../types/onboarding';

function parseGoal(goal?: string): RelationshipGoal {
  if (goal === 'relacionamento' || goal === 'companhia' || goal === 'amizade') {
    return goal;
  }
  return 'amizade';
}

/**
 * Controlador de Navegação Mobile BeyondTime (Onda 1 — Pranchas 1 a 3):
 * Conecta Splash -> Login / Recuperação de Senha / Cadastro (7 etapas) -> Reconhecimento Facial (FaceCaptureScreen) -> Home.
 */
export function AppNavigator() {
  const { palette, isDark } = useTheme();
  const [route, setRoute] = useState<AppRoute>('splash');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(
    INITIAL_ONBOARDING_DATA
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
      return false;
    });
    return () => subscription.remove();
  }, [route]);

  const handleResetAndExit = () => {
    const currentSession = authSession;
    setAuthSession(null);
    setOnboardingData(INITIAL_ONBOARDING_DATA);
    setRoute('splash');
    if (currentSession) {
      void logoutAccount(currentSession);
    }
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
          onSkipForLater={() => setRoute('home')}
          onVerificationComplete={(selfieUri) => {
            setOnboardingData((prev) => ({
              ...prev,
              isFaceVerified: true,
              verifiedSelfieUri: selfieUri,
            }));
            setRoute('home');
          }}
        />
      )}

      {route === 'home' && (
        <HomePlaceholderScreen
          userData={onboardingData}
          onRepeatFacialVerification={() => setRoute('facialVerification')}
          onSignOut={handleResetAndExit}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
