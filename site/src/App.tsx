import { useEffect, useRef, useState } from 'react';
import { CriarMinhaConta } from './components/CriarMinhaConta';
import { DefensiveModalRF06 } from './components/DefensiveModalRF06';
import { FooterGlobal } from './components/FooterGlobal';
import { HeaderGlobal } from './components/HeaderGlobal';
import { LandingPage } from './components/LandingPage';
import { RecuperarSenha } from './components/RecuperarSenha';
import { TelaLogin } from './components/TelaLogin';
import {
  ApiError,
  deleteAccountDefinitively,
  fetchMyProfile,
  loadAuthSession,
  logoutAccount,
  type ServerProfile,
} from './services/apiClient';
import { loadUserProfile } from './services/profileStorage';
import type { AuthSession, AuthViewId } from './types/auth';
import { sanitizeTextInput } from './utils/validation';

const DELETE_COUNTDOWN_SECONDS = 5;

export function App() {
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

  // RF-14 + RF-06: Exclusão Definitiva de Conta com Modal de Confirmação Dupla Defensiva
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState(DELETE_COUNTDOWN_SECONDS);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeletedNotice, setAccountDeletedNotice] = useState<string | null>(null);

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
    setAccountDeletedNotice(null);
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
    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError(null);
    setContacts({ login: '', register: '', recover: '' });
    setActiveView('login');
    setShowLanding(true);
  }

  useEffect(() => {
    if (!isDeleteModalOpen) return;
    setDeleteCountdown(DELETE_COUNTDOWN_SECONDS);
    const intervalId = window.setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isDeleteModalOpen]);

  function handleOpenDeleteAccountModal() {
    setDeletePassword('');
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  }

  function handleCancelDeleteAccount() {
    if (isDeletingAccount) return;
    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError(null);
  }

  async function handleConfirmDeleteAccount() {
    if (!authSession || isDeletingAccount || deleteCountdown > 0) return;
    if (deletePassword.trim().length === 0) {
      setDeleteError('Por segurança, digite sua senha atual para confirmar a exclusão definitiva.');
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await deleteAccountDefinitively(authSession, deletePassword);
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      setAuthSession(null);
      setServerProfile(null);
      setContacts({ login: '', register: '', recover: '' });
      setAccountDeletedNotice(
        'Sua conta e seus dados pessoais foram excluídos definitivamente com sucesso conforme a LGPD (RF-14).'
      );
      setActiveView('login');
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Não foi possível excluir a conta agora. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setIsDeletingAccount(false);
    }
  }

  const savedProfile = authSession ? loadUserProfile(authSession.userId) : null;
  const rawFullName = serverProfile?.fullName || savedProfile?.fullName;
  const displayFullName = rawFullName ? sanitizeTextInput(rawFullName) : undefined;
  const rawCity = serverProfile?.city || savedProfile?.city;
  const displayCity = rawCity ? sanitizeTextInput(rawCity) : undefined;
  const rawGoal = serverProfile?.goal || savedProfile?.goal;
  const displayGoal = rawGoal ? sanitizeTextInput(rawGoal) : undefined;
  const rawHobbies = serverProfile?.hobbies?.length
    ? serverProfile.hobbies
    : savedProfile?.hobbies;
  const displayHobbies = rawHobbies?.map((h) => sanitizeTextInput(h)).filter(Boolean);

  if (showLanding) {
    return (
      <LandingPage
        isAuthenticated={authSession !== null}
        onOpenAuth={handleOpenAuthFromLanding}
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
                <button
                  type="button"
                  className="btn btn--danger-outline"
                  onClick={handleOpenDeleteAccountModal}
                >
                  Excluir minha conta e dados (LGPD)
                </button>
              </div>

              {isDeleteModalOpen && (
                <div
                  className="callout-danger-amber"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="delete-account-title"
                  aria-describedby="delete-account-desc"
                  style={{ marginTop: '24px' }}
                >
                  <p className="defensive-modal__badge">Ação Irreversível — LGPD (RF-14)</p>
                  <h2 id="delete-account-title" className="defensive-modal__title">
                    Tem certeza que deseja excluir sua conta definitivamente?
                  </h2>
                  <p id="delete-account-desc" className="defensive-modal__desc">
                    Ao confirmar, seu perfil, fotos, hobbies, sessões e dados pessoais serão removidos e anonimizados do banco de dados do BeyondTime. Esta ação não pode ser desfeita.
                  </p>

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label" htmlFor="delete-account-password">
                      Confirme sua senha atual para prosseguir
                    </label>
                    <input
                      id="delete-account-password"
                      type="password"
                      className="form-input"
                      autoComplete="current-password"
                      placeholder="Digite sua senha atual"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value);
                        if (deleteError) setDeleteError(null);
                      }}
                    />
                    {deleteError !== null && (
                      <p className="form-error" role="alert">
                        {deleteError}
                      </p>
                    )}
                  </div>

                  <div className="defensive-modal__actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleCancelDeleteAccount}
                      disabled={isDeletingAccount}
                    >
                      Cancelar e manter minha conta
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-outline"
                      disabled={deleteCountdown > 0 || isDeletingAccount}
                      onClick={handleConfirmDeleteAccount}
                    >
                      {isDeletingAccount
                        ? 'Excluindo conta e dados...'
                        : deleteCountdown > 0
                          ? `Aguarde ${deleteCountdown}s para confirmar exclusão...`
                          : 'Sim, excluir minha conta definitivamente'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <>
              {accountDeletedNotice !== null && (
                <div className="callout-amber" role="status" style={{ marginBottom: '20px' }}>
                  {accountDeletedNotice}
                </div>
              )}
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

      <FooterGlobal />
    </div>
  );
}

export default App;
