import { useEffect, useRef, useState } from 'react';
import { CriarMinhaConta } from './components/CriarMinhaConta';
import { DefensiveModalRF06 } from './components/DefensiveModalRF06';
import { FooterGlobal } from './components/FooterGlobal';
import { HeaderGlobal } from './components/HeaderGlobal';
import { LandingPage } from './components/LandingPage';
import { PaginasLegais } from './components/PaginasLegais';
import { RecuperarSenha } from './components/RecuperarSenha';
import { TelaLogin } from './components/TelaLogin';
import {
  fetchMyProfile,
  loadAuthSession,
  logoutAccount,
  type ServerProfile,
} from './services/apiClient';
import { loadUserProfile } from './services/profileStorage';
import type { AuthSession, AuthViewId, LegalPageId } from './types/auth';

export function parseLegalPageFromPath(pathname: string): LegalPageId | null {
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (cleanPath === '/privacidade' || cleanPath === '/privacy') {
    return 'privacidade';
  }
  if (
    cleanPath === '/exclusao-de-dados' ||
    cleanPath === '/exclusao' ||
    cleanPath === '/data-deletion'
  ) {
    return 'exclusao';
  }
  if (cleanPath === '/termos' || cleanPath === '/terms') {
    return 'termos';
  }
  return null;
}

export function App() {
  const [legalPage, setLegalPage] = useState<LegalPageId | null>(() =>
    typeof window !== 'undefined' ? parseLegalPageFromPath(window.location.pathname) : null
  );
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [showLanding, setShowLanding] = useState<boolean>(() => loadAuthSession() === null);
  const [serverProfile, setServerProfile] = useState<ServerProfile | null>(null);
  const [activeView, setActiveView] = useState<AuthViewId>('login');
  const [contacts, setContacts] = useState<Record<AuthViewId, string>>({
    login: '',
    register: '',
    recover: '',
  });
  const [pendingView, setPendingView] = useState<AuthViewId | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handlePopState() {
      const page = parseLegalPageFromPath(window.location.pathname);
      setLegalPage(page);
      if (page === null && (window.location.pathname === '/' || window.location.pathname === '')) {
        setShowLanding(authSession === null);
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [authSession]);

  function handleOpenLegalPage(page: LegalPageId) {
    const path =
      page === 'privacidade'
        ? '/privacidade'
        : page === 'exclusao'
        ? '/exclusao-de-dados'
        : '/termos';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setLegalPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBackToHomeFromLegal() {
    window.history.pushState({}, '', '/');
    setLegalPage(null);
    setShowLanding(authSession === null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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

  function handleAuthSuccess(session: AuthSession) {
    setAuthSession(session);
    setShowLanding(false);
    setContacts({ login: '', register: '', recover: '' });
  }

  function handleOpenAuthFromLanding(targetView: AuthViewId) {
    setActiveView(targetView);
    setShowLanding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!authSession) {
      setServerProfile(null);
      return;
    }
    let active = true;
    fetchMyProfile(authSession)
      .then((profile) => {
        if (active) setServerProfile(profile);
      })
      .catch(() => {
        // Fallback para localStorage caso o perfil ainda não exista no banco
      });
    return () => {
      active = false;
    };
  }, [authSession]);

  async function handleLogout() {
    await logoutAccount(authSession);
    setAuthSession(null);
    setServerProfile(null);
    setContacts({ login: '', register: '', recover: '' });
    setActiveView('login');
    setShowLanding(true);
  }

  const savedProfile = authSession ? loadUserProfile(authSession.userId) : null;
  const displayFullName = serverProfile?.fullName || savedProfile?.fullName;
  const displayCity = serverProfile?.city || savedProfile?.city;
  const displayGoal = serverProfile?.goal || savedProfile?.goal;
  const displayHobbies = serverProfile?.hobbies?.length
    ? serverProfile.hobbies
    : savedProfile?.hobbies;

  // Roteamento nativo para páginas legais LGPD, Meta e Termos
  if (legalPage !== null) {
    return (
      <PaginasLegais
        activeTab={legalPage}
        onSelectTab={handleOpenLegalPage}
        onBackToHome={handleBackToHomeFromLegal}
      />
    );
  }

  if (showLanding) {
    return (
      <LandingPage
        isAuthenticated={authSession !== null}
        onOpenAuth={handleOpenAuthFromLanding}
        onOpenLegalPage={handleOpenLegalPage}
      />
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <HeaderGlobal
        onNavigate={handleNavigate}
        onBackToLanding={() => setShowLanding(true)}
      />

      <main className="auth-main" id="conteudo">
        <div className="auth-card">
          {authSession ? (
            <section className="completion-summary" aria-live="polite">
              <p className="defensive-modal__badge">Sessão autenticada (JWT)</p>
              <h1 className="auth-card__title">
                Bem-vindo(a){displayFullName ? `, ${displayFullName}` : ' ao BeyondTime'}
              </h1>
              <p className="auth-card__subtitle">
                Sua conta está conectada com segurança ao servidor BeyondTime.
              </p>

              <div className="summary-box">
                <p>
                  <strong>E-mail:</strong> {authSession.email}
                </p>
                <p>
                  <strong>ID da conta:</strong> {authSession.userId}
                </p>
                {displayCity && (
                  <p>
                    <strong>Cidade:</strong> {displayCity}
                  </p>
                )}
                {displayGoal && (
                  <p>
                    <strong>Objetivo:</strong> {displayGoal}
                  </p>
                )}
                {displayHobbies && displayHobbies.length > 0 && (
                  <p>
                    <strong>Interesses:</strong> {displayHobbies.join(', ')}
                  </p>
                )}
              </div>

              <div className="action-stack action-stack--compact">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleLogout}
                >
                  Sair da conta
                </button>
              </div>
            </section>
          ) : (
            <>
              {activeView === 'login' && (
                <TelaLogin
                  contact={contacts.login}
                  onContactChange={(value) => updateContact('login', value)}
                  onNavigate={handleNavigate}
                  onAuthSuccess={handleAuthSuccess}
                />
              )}

              {activeView === 'register' && (
                <CriarMinhaConta
                  contact={contacts.register}
                  onContactChange={(value) => updateContact('register', value)}
                  onNavigate={handleNavigate}
                  onAuthSuccess={handleAuthSuccess}
                />
              )}

              {activeView === 'recover' && (
                <RecuperarSenha
                  contact={contacts.recover}
                  onContactChange={(value) => updateContact('recover', value)}
                  onNavigate={handleNavigate}
                />
              )}
            </>
          )}
        </div>
      </main>

      <DefensiveModalRF06
        isOpen={pendingView !== null}
        onKeepEditing={handleKeepEditing}
        onConfirmDiscard={handleConfirmDiscard}
      />

      <FooterGlobal onOpenLegalPage={handleOpenLegalPage} />
    </div>
  );
}

export default App;
