import React, { useEffect, useState } from 'react';
import { BackHandler, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FacialVerificationFlowScreen } from '../screens/FacialVerificationFlowScreen';
import { HomePlaceholderScreen } from '../screens/HomePlaceholderScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingFlowScreen } from '../screens/OnboardingFlowScreen';
import { SplashWelcomeScreen } from '../screens/SplashWelcomeScreen';
import { useTheme } from '../theme/ThemeContext';
import {
  AppRoute,
  INITIAL_ONBOARDING_DATA,
  OnboardingData,
} from '../types/onboarding';

/**
 * Controlador de Navegação Mobile BeyondTime (Onda 1):
 * Conecta Splash -> Login / Cadastro (7 etapas) -> Reconhecimento Facial (FaceCaptureScreen) -> Home.
 */
export function AppNavigator() {
  const { palette, isDark } = useTheme();
  const [route, setRoute] = useState<AppRoute>('splash');
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
    setOnboardingData(INITIAL_ONBOARDING_DATA);
    setRoute('splash');
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
          onLoginSuccess={(contact) => {
            setOnboardingData((prev) => ({
              ...prev,
              contact,
              fullName: prev.fullName || contact.split('@')[0],
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
          onCompleteToFacial={() => setRoute('facialVerification')}
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
