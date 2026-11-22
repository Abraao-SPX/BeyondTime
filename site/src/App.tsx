import { useRef, useState } from 'react';
import { CriarMinhaConta } from './components/CriarMinhaConta';
import { DefensiveModalRF06 } from './components/DefensiveModalRF06';
import { FooterGlobal } from './components/FooterGlobal';
import { HeaderGlobal } from './components/HeaderGlobal';
import { HumanSupportBanner } from './components/HumanSupportBanner';
import { LandingPageHome } from './components/LandingPageHome';
import { RecuperarSenha } from './components/RecuperarSenha';
import { TelaLogin } from './components/TelaLogin';
import { useHighContrast } from './hooks/useHighContrast';
import { useOnboardingWizard } from './hooks/useOnboardingWizard';
import type { AppViewId, AuthViewId } from './types/auth';

export function App() {
  const [activeView, setActiveView] = useState<AppViewId>('home');
  const [loginContact, setLoginContact] = useState('');
  const [recoverContact, setRecoverContact] = useState('');
  const [pendingView, setPendingView] = useState<AppViewId | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const { highContrast, toggleHighContrast } = useHighContrast();
  const wizard = useOnboardingWizard();

  function hasUnsavedData(viewId: AppViewId): boolean {
    if (viewId === 'home') {
      return false;
    }
    if (viewId === 'login') {
      return loginContact.trim().length > 0;
    }
    if (viewId === 'recover') {
      return recoverContact.trim().length > 0;
    }
    return wizard.hasUnsavedChanges;
  }

  function switchView(targetView: AppViewId) {
    setActiveView(targetView);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function handleNavigate(targetView: AppViewId, triggerEl: HTMLElement) {
    if (targetView === activeView) return;

    if (hasUnsavedData(activeView)) {
      lastTriggerRef.current = triggerEl;
      setPendingView(targetView);
      return;
    }

    switchView(targetView);
  }

  function handleOpenAuthFromHome(targetView: AuthViewId) {
    switchView(targetView);
  }

  function handleKeepEditing() {
    setPendingView(null);
    lastTriggerRef.current?.focus();
    lastTriggerRef.current = null;
  }

  function handleConfirmDiscard() {
    const target = pendingView;
    if (activeView === 'login') {
      setLoginContact('');
    } else if (activeView === 'recover') {
      setRecoverContact('');
    } else if (activeView === 'register') {
      wizard.resetWizard();
    }

    setPendingView(null);
    lastTriggerRef.current = null;
    if (target !== null) {
      switchView(target);
    }
  }

  return (
    <>
      {activeView === 'home' ? (
        <LandingPageHome
          highContrast={highContrast}
          onToggleHighContrast={toggleHighContrast}
          onOpenAuth={handleOpenAuthFromHome}
        />
      ) : (
        <div className="app-shell">
          <a className="skip-link" href="#conteudo">
            Pular para o conteúdo
          </a>

          <HeaderGlobal
            onNavigate={handleNavigate}
            highContrast={highContrast}
            onToggleHighContrast={toggleHighContrast}
          />

          <HumanSupportBanner />

          <main className="auth-main" id="conteudo">
            <div className="auth-content-container">
              {activeView === 'login' && (
                <TelaLogin
                  contact={loginContact}
                  onContactChange={setLoginContact}
                  onNavigate={handleNavigate}
                />
              )}

              {activeView === 'register' && (
                <CriarMinhaConta
                  wizard={wizard}
                  onNavigate={handleNavigate}
                />
              )}

              {activeView === 'recover' && (
                <RecuperarSenha
                  contact={recoverContact}
                  onContactChange={setRecoverContact}
                  onNavigate={handleNavigate}
                />
              )}
            </div>
          </main>

          <FooterGlobal />
        </div>
      )}

      <DefensiveModalRF06
        isOpen={pendingView !== null}
        onKeepEditing={handleKeepEditing}
        onConfirmDiscard={handleConfirmDiscard}
      />
    </>
  );
}

export default App;
