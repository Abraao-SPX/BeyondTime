import { useRef, useState } from 'react';
import { CriarMinhaConta } from './components/CriarMinhaConta';
import { DefensiveModalRF06 } from './components/DefensiveModalRF06';
import { FooterGlobal } from './components/FooterGlobal';
import { HeaderGlobal } from './components/HeaderGlobal';
import { RecuperarSenha } from './components/RecuperarSenha';
import { TelaLogin } from './components/TelaLogin';
import { useOnboardingWizard } from './hooks/useOnboardingWizard';
import type { AuthViewId } from './types/auth';

export function App() {
  const [activeView, setActiveView] = useState<AuthViewId>('login');
  const [loginContact, setLoginContact] = useState('');
  const [recoverContact, setRecoverContact] = useState('');
  const [pendingView, setPendingView] = useState<AuthViewId | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const wizard = useOnboardingWizard();

  function hasUnsavedData(viewId: AuthViewId): boolean {
    if (viewId === 'login') {
      return loginContact.trim().length > 0;
    }
    if (viewId === 'recover') {
      return recoverContact.trim().length > 0;
    }
    return wizard.hasUnsavedChanges;
  }

  function handleNavigate(targetView: AuthViewId, triggerEl: HTMLElement) {
    if (targetView === activeView) return;

    if (hasUnsavedData(activeView)) {
      lastTriggerRef.current = triggerEl;
      setPendingView(targetView);
      return;
    }

    setActiveView(targetView);
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
    } else {
      wizard.resetWizard();
    }

    setPendingView(null);
    lastTriggerRef.current = null;
    if (target !== null) {
      setActiveView(target);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <HeaderGlobal onNavigate={handleNavigate} />

      <main className="auth-main" id="conteudo">
        <div className="auth-card">
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

      <DefensiveModalRF06
        isOpen={pendingView !== null}
        onKeepEditing={handleKeepEditing}
        onConfirmDiscard={handleConfirmDiscard}
      />

      <FooterGlobal />
    </div>
  );
}

export default App;
