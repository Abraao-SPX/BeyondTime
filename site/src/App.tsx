import { useRef, useState } from 'react';
import { CriarMinhaConta } from './components/CriarMinhaConta';
import { DefensiveModalRF06 } from './components/DefensiveModalRF06';
import { FooterGlobal } from './components/FooterGlobal';
import { HeaderGlobal } from './components/HeaderGlobal';
import { RecuperarSenha } from './components/RecuperarSenha';
import { TelaLogin } from './components/TelaLogin';
import type { AuthViewId } from './types/auth';

export function App() {
  const [activeView, setActiveView] = useState<AuthViewId>('login');
  const [contacts, setContacts] = useState<Record<AuthViewId, string>>({
    login: '',
    register: '',
    recover: '',
  });
  const [pendingView, setPendingView] = useState<AuthViewId | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  function updateContact(viewId: AuthViewId, value: string) {
    setContacts((prev) => ({
      ...prev,
      [viewId]: value,
    }));
  }

  function hasUnsavedData(viewId: AuthViewId): boolean {
    return contacts[viewId].trim().length > 0;
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
    updateContact(activeView, '');
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
              contact={contacts.login}
              onContactChange={(value) => updateContact('login', value)}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'register' && (
            <CriarMinhaConta
              contact={contacts.register}
              onContactChange={(value) => updateContact('register', value)}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'recover' && (
            <RecuperarSenha
              contact={contacts.recover}
              onContactChange={(value) => updateContact('recover', value)}
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
