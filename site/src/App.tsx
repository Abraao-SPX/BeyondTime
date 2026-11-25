import { useEffect, useRef, useState } from 'react';
import { AccessibilityPanelRF09 } from './components/AccessibilityPanelRF09';
import { CriarMinhaConta } from './components/CriarMinhaConta';
import { DefensiveModalRF06 } from './components/DefensiveModalRF06';
import { FooterGlobal } from './components/FooterGlobal';
import { HeaderGlobal } from './components/HeaderGlobal';
import { LandingPageHome as LandingPage, type OnboardingPrefill } from './components/LandingPageHome';
import { PaginasLegais } from './components/PaginasLegais';
import { RecuperarSenha } from './components/RecuperarSenha';
import { TelaLogin } from './components/TelaLogin';
import { AuthenticatedWorkspace } from './components/wave2/AuthenticatedWorkspace';
import { FacialVerificationQrModal } from './components/wave2/FacialVerificationQrModal';
import { MobileFacialHandoffPage } from './components/wave2/MobileFacialHandoffPage';
import { useHighContrast } from './hooks/useHighContrast';
import {
  ApiError,
  clearAuthSession,
  deleteAccountDefinitively,
  fetchMyProfile,
  loadAuthSession,
  logoutAccount,
  resolveApiAssetUrl,
  type ServerProfile,
} from './services/apiClient';
import { clearUserProfile, loadUserProfile } from './services/profileStorage';
import type {
  AuthSession,
  AuthViewId,
  LegalPageId,
  SocialOnboardingDraft,
} from './types/auth';
import { calculateAgeFromBirthDate, sanitizeTextInput } from './utils/validation';

const DELETE_COUNTDOWN_SECONDS = 5;

export function isMobileFacialHandoffPath(pathname: string): boolean {
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return cleanPath === '/verificar-rosto' || cleanPath === '/verify-face';
}

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

const IS_DEV_ONDA2_PREVIEW =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('preview') === 'onda2';

const DEV_PREVIEW_SESSION: AuthSession = {
  accessToken: 'dev-preview-token',
  refreshToken: 'dev-preview-refresh',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  userId: 'dev-preview-50plus',
  email: 'maria50@beyondtime.com.br',
  role: 'USER',
  authProvider: 'email',
  rememberMe: false,
};

const DEV_PREVIEW_PROFILE: ServerProfile = {
  id: 'dev-preview-profile',
  userId: 'dev-preview-50plus',
  firstName: 'Maria',
  fullName: 'Maria Helena',
  bio: 'Amo caminhar na Orla de Atalaia e conversar tomando um bom café.',
  city: 'Aracaju',
  age: 64,
  goal: 'Amizade',
  hobbies: ['caminhada', 'cafe-e-prosa', 'mpb', 'leitura', 'forro'],
  avatarUrl: '/assets/perfil-helena.svg',
  verificationStatus: 'VERIFIED',
  verifiedBadge50plus: true,
};

export function App() {
  const [isMobileFacialHandoff] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isMobileFacialHandoffPath(window.location.pathname) : false
  );
  const [legalPage, setLegalPage] = useState<LegalPageId | null>(() =>
    typeof window !== 'undefined' ? parseLegalPageFromPath(window.location.pathname) : null
  );
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    IS_DEV_ONDA2_PREVIEW ? DEV_PREVIEW_SESSION : loadAuthSession()
  );
  const [showLanding, setShowLanding] = useState<boolean>(() =>
    IS_DEV_ONDA2_PREVIEW ? false : loadAuthSession() === null
  );
  const { highContrast, toggleHighContrast } = useHighContrast();
  const [serverProfile, setServerProfile] = useState<ServerProfile | null>(() =>
    IS_DEV_ONDA2_PREVIEW ? DEV_PREVIEW_PROFILE : null
  );
  const [activeView, setActiveView] = useState<AuthViewId>('login');
  const [contacts, setContacts] = useState<Record<AuthViewId, string>>({
    login: '',
    register: '',
    recover: '',
  });
  const [pendingView, setPendingView] = useState<AuthViewId | null>(null);
  const [pendingBackToLanding, setPendingBackToLanding] = useState(false);
  const [onboardingPrefill, setOnboardingPrefill] = useState<OnboardingPrefill | null>(null);
  const [isRegisterDirty, setIsRegisterDirty] = useState(false);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  // SEC-MED-08 / RF-09: Painel de Acessibilidade Dinâmica
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);

  // SEC-ALTA-08: Recuperação Graciosa de Onboarding / Usuário Órfão (404 em GET /profiles/me)
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(() => loadAuthSession() !== null);
  const [isProfileMissing, setIsProfileMissing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMandatoryQrOpen, setIsMandatoryQrOpen] = useState(false);
  const [orphanNotice, setOrphanNotice] = useState<string | null>(null);
  const [socialDraft, setSocialDraft] = useState<SocialOnboardingDraft | null>(null);

  // RF-14 + RF-06: Exclusão Definitiva de Conta com Modal de Confirmação Dupla Defensiva
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState(DELETE_COUNTDOWN_SECONDS);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeletedNotice, setAccountDeletedNotice] = useState<string | null>(null);

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
    if (viewId === 'register' && isRegisterDirty) {
      return true;
    }
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

  function handleBackToLanding() {
    if (hasUnsavedData(activeView)) {
      setPendingBackToLanding(true);
      return;
    }
    setShowLanding(true);
  }

  function handleKeepEditing() {
    setPendingView(null);
    setPendingBackToLanding(false);
    lastTriggerRef.current?.focus();
    lastTriggerRef.current = null;
  }

  function handleConfirmDiscard() {
    const target = pendingView;
    const shouldGoLanding = pendingBackToLanding;
    updateContact(activeView, '');
    setIsRegisterDirty(false);
    setPendingView(null);
    setPendingBackToLanding(false);
    lastTriggerRef.current = null;
    if (shouldGoLanding) {
      setShowLanding(true);
      return;
    }
    if (target !== null) {
      setActiveView(target);
    }
  }

  function handleAuthSuccess(session: AuthSession, draft?: SocialOnboardingDraft) {
    setIsLoadingProfile(true);
    setSocialDraft(draft ?? null);
    setIsEditingProfile(false);
    setAuthSession(session);
    setShowLanding(false);
    setAccountDeletedNotice(null);
    setContacts({ login: '', register: '', recover: '' });
  }

  function handleOpenAuthFromLanding(targetView: AuthViewId, prefill?: OnboardingPrefill) {
    if (prefill) {
      setOnboardingPrefill(prefill);
    }
    setActiveView(targetView);
    setShowLanding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!authSession) {
      setIsLoadingProfile(false);
      setServerProfile(null);
      setIsProfileMissing(false);
      setIsEditingProfile(false);
      setOrphanNotice(null);
      return;
    }
    if (import.meta.env.DEV && authSession.userId === 'dev-preview-50plus') {
      setIsLoadingProfile(false);
      return;
    }
    let active = true;
    setIsLoadingProfile(true);
    fetchMyProfile(authSession)
      .then((profile) => {
        if (active) {
          setServerProfile(profile);
          setIsProfileMissing(false);
          setOrphanNotice(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          clearAuthSession();
          clearUserProfile();
          setAuthSession(null);
          setServerProfile(null);
          setIsProfileMissing(false);
          setIsEditingProfile(false);
          setOrphanNotice(null);
          setSocialDraft(null);
        } else if (err instanceof ApiError && err.status === 404) {
          // SEC-ALTA-08: Conta criada mas etapa de perfil interrompida anteriormente (404 em /profiles/me).
          // Recuperação graciosa de onboarding: não derruba a sessão nem quebra em erro;
          // redireciona suavemente para conclusão do perfil 50+ (dados, foto, hobbies RF03 e objetivo).
          setServerProfile(null);
          setIsProfileMissing(true);
          setOrphanNotice(
            'Bem-vindo(a)! Agora vamos completar seu perfil 50+ com sua cidade, foto, hobbies e objetivo para começar a se conectar com segurança!'
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingProfile(false);
        }
      });
    return () => {
      active = false;
    };
  }, [authSession]);

  async function handleLogout() {
    await logoutAccount(authSession);
    setAuthSession(null);
    setServerProfile(null);
    setIsLoadingProfile(false);
    setIsProfileMissing(false);
    setIsEditingProfile(false);
    setOrphanNotice(null);
    setSocialDraft(null);
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

  const isSocialAccount =
    authSession?.authProvider === 'social' ||
    authSession?.authProvider === 'google' ||
    authSession?.authProvider === 'facebook';

  async function handleConfirmDeleteAccount() {
    if (!authSession || isDeletingAccount || deleteCountdown > 0) return;

    // SEC-ALTA-07: Usuários de provedores sociais (Google/Facebook) não possuem senha local.
    // Exigência de senha aplica-se estritamente a contas cadastradas com e-mail/senha.
    if (!isSocialAccount && deletePassword.trim().length === 0) {
      setDeleteError('Por segurança, digite sua senha atual para confirmar a exclusão definitiva.');
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await deleteAccountDefinitively(
        authSession,
        isSocialAccount ? undefined : deletePassword
      );
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      setAuthSession(null);
      setServerProfile(null);
      setIsProfileMissing(false);
      setOrphanNotice(null);
      setContacts({ login: '', register: '', recover: '' });
      setAccountDeletedNotice(
        'Sua conta e seus dados pessoais foram excluídos definitivamente com sucesso conforme a LGPD (RF-14).'
      );
      setActiveView('login');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 && err.code !== 'INVALID_PASSWORD_FOR_DELETION') {
          clearAuthSession();
          clearUserProfile();
          setAuthSession(null);
          setServerProfile(null);
          setIsProfileMissing(false);
          setIsDeleteModalOpen(false);
          setDeletePassword('');
        }
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
  const displayAge =
    (typeof serverProfile?.age === 'number' && serverProfile.age >= 50 ? serverProfile.age : null) ??
    (serverProfile?.birthDate ? calculateAgeFromBirthDate(serverProfile.birthDate) : null) ??
    (savedProfile?.age && savedProfile.age >= 50 ? savedProfile.age : null) ??
    (savedProfile?.birthDate ? calculateAgeFromBirthDate(savedProfile.birthDate) : null);
  const rawCity = serverProfile?.city || savedProfile?.city;
  const displayCity = rawCity ? sanitizeTextInput(rawCity) : undefined;
  const rawGoal = serverProfile?.goal || savedProfile?.goal;
  const displayGoal = rawGoal ? sanitizeTextInput(rawGoal) : undefined;
  const rawHobbies = serverProfile?.hobbies?.length
    ? serverProfile.hobbies
    : savedProfile?.hobbies;
  const displayHobbies = rawHobbies?.map((h) => sanitizeTextInput(h)).filter(Boolean);
  const displayAvatarUrl = resolveApiAssetUrl(serverProfile?.avatarUrl) || savedProfile?.photoDataUrl || null;

  // RF-11: Portão Biométrico Obrigatório (fail-closed) — só entra na página principal se o rosto foi verificado e aprovado
  const needsMandatoryFacialVerification =
    authSession !== null &&
    !isLoadingProfile &&
    !isProfileMissing &&
    !isEditingProfile &&
    serverProfile?.verifiedBadge50plus !== true;

  useEffect(() => {
    if (needsMandatoryFacialVerification) {
      setIsMandatoryQrOpen(true);
    } else {
      setIsMandatoryQrOpen(false);
    }
  }, [needsMandatoryFacialVerification]);

  if (isMobileFacialHandoff) {
    return <MobileFacialHandoffPage />;
  }

  // Roteamento nativo para páginas legais LGPD, Meta e Termos
  if (legalPage !== null) {
    return (
      <>
        <PaginasLegais
          activeTab={legalPage}
          onSelectTab={handleOpenLegalPage}
          onBackToHome={handleBackToHomeFromLegal}
        />
        <AccessibilityPanelRF09
          isOpen={isAccessibilityOpen}
          onClose={() => setIsAccessibilityOpen(false)}
          onToggleOpen={() => setIsAccessibilityOpen((prev) => !prev)}
          highContrast={highContrast}
          onToggleHighContrast={toggleHighContrast}
        />
      </>
    );
  }

  if (showLanding) {
    return (
      <>
        <LandingPage
          highContrast={highContrast}
          onToggleHighContrast={toggleHighContrast}
          onToggleAccessibility={() => setIsAccessibilityOpen(true)}
          onOpenAuth={handleOpenAuthFromLanding}
          onOpenLegalPage={handleOpenLegalPage}
        />
        <AccessibilityPanelRF09
          isOpen={isAccessibilityOpen}
          onClose={() => setIsAccessibilityOpen(false)}
          onToggleOpen={() => setIsAccessibilityOpen((prev) => !prev)}
          highContrast={highContrast}
          onToggleHighContrast={toggleHighContrast}
        />
      </>
    );
  }

  const isShowingWorkspace =
    authSession !== null &&
    !isLoadingProfile &&
    !isProfileMissing &&
    !isEditingProfile &&
    !needsMandatoryFacialVerification;
  const isShowingOnboarding =
    (authSession !== null && !isLoadingProfile && (isProfileMissing || isEditingProfile)) ||
    (authSession === null && activeView === 'register');

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <HeaderGlobal
        onNavigate={handleNavigate}
        onBackToLanding={handleBackToLanding}
        onToggleAccessibility={() => setIsAccessibilityOpen(true)}
        highContrast={highContrast}
        onToggleHighContrast={toggleHighContrast}
        showBackButton={!isShowingWorkspace}
      />

      <main className="auth-main" id="conteudo">
        <div
          className={`auth-card${
            isShowingWorkspace
              ? ' auth-card--workspace'
              : isShowingOnboarding
                ? ' auth-card--wide'
                : ''
          }`}
        >
          {authSession ? (
            isLoadingProfile ? (
              <section className="completion-summary" aria-live="polite" aria-busy="true">
                <p className="defensive-modal__badge">Carregando seu perfil 50+</p>
                <h1 className="auth-card__title">Preparando sua conta...</h1>
                <p className="auth-card__subtitle">
                  Estamos verificando seus dados e interesses com segurança no servidor.
                </p>
                <div className="skeleton-loader" aria-hidden="true">
                  <div className="skeleton-loader__bar" />
                  <div className="skeleton-loader__bar skeleton-loader__bar--short" />
                </div>
              </section>
            ) : isProfileMissing || isEditingProfile ? (
              // SEC-ALTA-08: Onboarding obrigatório para perfil ausente (404) ou edição de perfil/hobbies (RF-02/RF-03)
              <CriarMinhaConta
                key={isEditingProfile ? 'edit-profile' : 'complete-profile'}
                contact={authSession.email}
                onContactChange={(value) => updateContact('register', value)}
                onNavigate={handleNavigate}
                onProfileSaved={(savedProfileData) => {
                  setServerProfile(savedProfileData);
                }}
                onAuthSuccess={(session) => {
                  setIsProfileMissing(false);
                  setIsEditingProfile(false);
                  setOrphanNotice(null);
                  setSocialDraft(null);
                  handleAuthSuccess(session);
                }}
                existingSession={authSession}
                orphanNotice={isEditingProfile ? null : orphanNotice}
                socialDraft={isEditingProfile ? null : socialDraft}
                initialProfile={isEditingProfile ? serverProfile : null}
                isEditMode={isEditingProfile}
                onCancelEdit={() => setIsEditingProfile(false)}
              />
            ) : needsMandatoryFacialVerification ? (
              <section className="completion-summary" aria-live="polite">
                <p className="defensive-modal__badge">Etapa Obrigatória de Segurança — RF-11</p>
                <h1 className="auth-card__title">
                  Olá, {serverProfile?.firstName || 'bem-vindo(a)'}! Confirme seu rosto para entrar
                </h1>
                <p className="auth-card__subtitle">
                  Para proteger toda a comunidade 50+, o acesso à página principal é liberado
                  somente após a verificação facial pelo celular (código QR, sem baixar aplicativo).
                </p>

                <div className="action-stack action-stack--compact" style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ minHeight: '52px' }}
                    onClick={() => setIsMandatoryQrOpen(true)}
                  >
                    Abrir código QR de verificação facial
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    style={{ minHeight: '48px' }}
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Editar dados do perfil
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    style={{ minHeight: '48px' }}
                    onClick={handleLogout}
                  >
                    Sair da conta
                  </button>
                </div>

                {isMandatoryQrOpen && (
                  <FacialVerificationQrModal
                    authSession={authSession}
                    firstName={serverProfile?.firstName || undefined}
                    onClose={() => setIsMandatoryQrOpen(false)}
                    onVerified={(res) => {
                      if (res.verifiedBadge50plus) {
                        setIsMandatoryQrOpen(false);
                        setServerProfile((prev) =>
                          prev
                            ? {
                                ...prev,
                                verifiedBadge50plus: true,
                                verificationStatus: 'VERIFIED',
                              }
                            : prev
                        );
                        if (!serverProfile && authSession) {
                          void fetchMyProfile(authSession)
                            .then((fresh) => setServerProfile(fresh))
                            .catch(() => {});
                        }
                      }
                    }}
                  />
                )}
              </section>
            ) : (
              <>
                <AuthenticatedWorkspace
                  authSession={authSession}
                  serverProfile={serverProfile}
                  displayFullName={displayFullName ?? ''}
                  displayAge={displayAge}
                  displayCity={displayCity}
                  displayGoal={displayGoal}
                  displayHobbies={displayHobbies}
                  displayAvatarUrl={displayAvatarUrl}
                  onEditProfile={() => setIsEditingProfile(true)}
                  onRequestDeleteAccount={handleOpenDeleteAccountModal}
                  onLogout={handleLogout}
                />

                {isDeleteModalOpen && (
                  <div
                    className="callout-danger-amber"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="delete-account-title"
                    aria-describedby="delete-account-desc"
                    style={{ marginTop: '24px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && !isDeletingAccount) {
                        e.preventDefault();
                        handleCancelDeleteAccount();
                      }
                    }}
                  >
                    <p className="defensive-modal__badge">Ação Irreversível — LGPD (RF-14)</p>
                    <h2 id="delete-account-title" className="defensive-modal__title">
                      Tem certeza que deseja excluir sua conta definitivamente?
                    </h2>
                    <p id="delete-account-desc" className="defensive-modal__desc">
                      Ao confirmar, seu perfil, fotos, hobbies, sessões e dados pessoais serão removidos e anonimizados do banco de dados do BeyondTime. Esta ação não pode ser desfeita.
                    </p>

                    {/* SEC-ALTA-07: Contas sociais (Google/Facebook) não possuem senha local */}
                    {isSocialAccount ? (
                      <div className="callout-amber" role="note" style={{ marginTop: '16px', marginBottom: '8px' }}>
                        <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.5 }}>
                          <strong>Conta autenticada via {authSession.authProvider === 'google' ? 'Google' : authSession.authProvider === 'facebook' ? 'Facebook' : 'provedor social'}:</strong>{' '}
                          Conforme a LGPD (RF-14), você não precisa redigitar senha para excluir sua conta. Aguarde o temporizador defensivo abaixo para confirmar a exclusão com total segurança.
                        </p>
                      </div>
                    ) : (
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
                    )}

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
              </>
            )
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
                  prefill={onboardingPrefill}
                  onDirtyChange={setIsRegisterDirty}
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
        isOpen={pendingView !== null || pendingBackToLanding}
        onKeepEditing={handleKeepEditing}
        onConfirmDiscard={handleConfirmDiscard}
      />

      <FooterGlobal onOpenLegalPage={handleOpenLegalPage} />

      <AccessibilityPanelRF09
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        onToggleOpen={() => setIsAccessibilityOpen((prev) => !prev)}
        highContrast={highContrast}
        onToggleHighContrast={toggleHighContrast}
      />
    </div>
  );
}

export default App;
