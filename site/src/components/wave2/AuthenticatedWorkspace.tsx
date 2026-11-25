import { useEffect, useMemo, useState } from 'react';
import {
  computeAffinityCandidates,
  createBlockedEntry,
  createOutgoingMessage,
  createThreadFromCandidate,
  getHobbyLabel,
  loadWave2State,
  saveWave2State,
  SERGIPE_DISCOVERY_CATALOG,
} from '../../services/wave2Service';
import type { AuthSession, ConnectionGoal } from '../../types/auth';
import type { ServerProfile } from '../../services/apiClient';
import type {
  BlockedContact,
  ChatThread,
  OutgoingMessagePayload,
  ScoredCandidate,
  Wave2State,
  WorkspaceTabId,
} from '../../types/wave2';
import { BlockContactModalRF08 } from './BlockContactModalRF08';
import { BlockedContactsPanelRF08 } from './BlockedContactsPanelRF08';
import { FacialVerificationQrModal } from './FacialVerificationQrModal';
import { MatchAffinityFeedRF05 } from './MatchAffinityFeedRF05';
import { SimplifiedChatRF07 } from './SimplifiedChatRF07';

interface AuthenticatedWorkspaceProps {
  authSession: AuthSession;
  serverProfile: ServerProfile | null;
  displayFullName: string;
  displayAge?: number | null;
  displayCity?: string;
  displayGoal?: string;
  displayHobbies?: string[];
  displayAvatarUrl: string | null;
  onEditProfile: () => void;
  onRequestDeleteAccount: () => void;
  onLogout: () => void;
}

function formatSergipeLocation(city?: string): string {
  const cleaned = (city || '')
    .replace(/\s*\(\s*SE\s*\)/gi, '')
    .replace(/\s*[-,/]\s*(SE|Sergipe)\b/gi, '')
    .trim();
  return cleaned ? `${cleaned}, Sergipe` : 'Sergipe';
}

type PendingBlockTarget = Pick<BlockedContact, 'id' | 'fullName' | 'age' | 'city' | 'avatarUrl'>;

export function AuthenticatedWorkspace({
  authSession,
  serverProfile,
  displayFullName,
  displayAge = null,
  displayCity,
  displayGoal,
  displayHobbies,
  displayAvatarUrl,
  onEditProfile,
  onRequestDeleteAccount,
  onLogout,
}: AuthenticatedWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('discover');
  const [wave2State, setWave2State] = useState<Wave2State>(() =>
    loadWave2State(authSession.email)
  );
  const [filterGoal, setFilterGoal] = useState<ConnectionGoal | 'Todos'>('Todos');
  const [filterCity, setFilterCity] = useState<string>('Todas');
  const [maxDistance, setMaxDistance] = useState<string>('30km');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [recentMatch, setRecentMatch] = useState<ScoredCandidate | null>(null);
  const [pendingBlock, setPendingBlock] = useState<PendingBlockTarget | null>(null);
  const [safetyFeedback, setSafetyFeedback] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  // O selo só é exibido quando o backend confirma a verificação (RF-11).
  const isFaciallyVerified = serverProfile?.verifiedBadge50plus === true;

  useEffect(() => {
    saveWave2State(authSession.email, wave2State);
  }, [authSession.email, wave2State]);

  const userHobbies = useMemo<string[]>(() => {
    const source = serverProfile?.hobbies?.length ? serverProfile.hobbies : displayHobbies;
    if (!source || source.length === 0) return [];
    return source;
  }, [serverProfile?.hobbies, displayHobbies]);

  const userCity = displayCity || serverProfile?.city || 'Aracaju';
  const userGoal = ((displayGoal || serverProfile?.goal) as ConnectionGoal | undefined) ?? null;

  const availableCities = useMemo(() => {
    return Array.from(new Set(SERGIPE_DISCOVERY_CATALOG.map((c) => c.city))).sort();
  }, []);

  const candidates = useMemo(
    () =>
      computeAffinityCandidates(
        userHobbies,
        userCity,
        userGoal,
        wave2State,
        filterGoal,
        filterCity
      ),
    [userHobbies, userCity, userGoal, wave2State, filterGoal, filterCity]
  );

  const visibleThreads = useMemo(() => {
    const blockedIds = new Set(wave2State.blockedContacts.map((b) => b.id));
    return wave2State.threads.filter((t) => !blockedIds.has(t.contactId));
  }, [wave2State.blockedContacts, wave2State.threads]);

  const totalUnread = useMemo(
    () => visibleThreads.reduce((acc, thread) => acc + thread.unreadCount, 0),
    [visibleThreads]
  );

  // Zera automaticamente o contador de não lidas da conversa aberta no painel direito
  // (inclusive quando outra conversa assume o foco após um bloqueio em RF-08).
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const displayedThread =
      visibleThreads.find((t) => t.contactId === activeThreadId) ?? visibleThreads[0] ?? null;
    if (!displayedThread || displayedThread.unreadCount === 0) return;

    setWave2State((prev) => ({
      ...prev,
      threads: prev.threads.map((thread) =>
        thread.contactId === displayedThread.contactId
          ? { ...thread, unreadCount: 0 }
          : thread
      ),
    }));
  }, [activeTab, activeThreadId, visibleThreads]);

  function handlePassCandidate(candidate: ScoredCandidate) {
    setSafetyFeedback(null);
    setWave2State((prev) => ({
      ...prev,
      passedIds: prev.passedIds.includes(candidate.id)
        ? prev.passedIds
        : [...prev.passedIds, candidate.id],
    }));
  }

  function handleConnectCandidate(candidate: ScoredCandidate) {
    setSafetyFeedback(null);
    setWave2State((prev) => {
      const nextLikedIds = prev.likedIds.includes(candidate.id)
        ? prev.likedIds
        : [...prev.likedIds, candidate.id];

      const alreadyHasThread = prev.threads.some((t) => t.contactId === candidate.id);
      const nextThreads =
        candidate.likesBack && !alreadyHasThread
          ? [createThreadFromCandidate(candidate), ...prev.threads]
          : prev.threads;

      return {
        ...prev,
        likedIds: nextLikedIds,
        threads: nextThreads,
      };
    });

    if (candidate.likesBack) {
      setRecentMatch(candidate);
    } else {
      setSafetyFeedback(
        `Você curtiu ${candidate.fullName}. Se a pessoa também curtir você, a conversa aparecerá em Conversas.`
      );
    }
  }

  function handleOpenMatchChat(contactId: string) {
    setRecentMatch(null);
    setActiveThreadId(contactId);
    setActiveTab('chat');
    setWave2State((prev) => ({
      ...prev,
      threads: prev.threads.map((thread) =>
        thread.contactId === contactId ? { ...thread, unreadCount: 0 } : thread
      ),
    }));
  }

  function handleSelectThread(contactId: string) {
    setActiveThreadId(contactId);
    setWave2State((prev) => ({
      ...prev,
      threads: prev.threads.map((thread) =>
        thread.contactId === contactId ? { ...thread, unreadCount: 0 } : thread
      ),
    }));
  }

  function handleSendMessage(contactId: string, payload: string | OutgoingMessagePayload) {
    const outgoing = createOutgoingMessage(payload);
    setWave2State((prev) => ({
      ...prev,
      threads: prev.threads.map((thread) =>
        thread.contactId === contactId
          ? {
              ...thread,
              unreadCount: 0,
              messages: [...thread.messages, outgoing],
            }
          : thread
      ),
    }));
  }

  function handleConfirmBlock(reason?: string) {
    if (!pendingBlock) return;
    const blockedEntry = createBlockedEntry(pendingBlock, reason);

    setWave2State((prev) => ({
      ...prev,
      blockedContacts: prev.blockedContacts.some((b) => b.id === blockedEntry.id)
        ? prev.blockedContacts
        : [blockedEntry, ...prev.blockedContacts],
      // Ocultação mútua imediata no chat e no feed (RF-08)
      threads: prev.threads.filter((t) => t.contactId !== blockedEntry.id),
    }));

    if (activeThreadId === blockedEntry.id) {
      setActiveThreadId(null);
    }
    if (recentMatch?.id === blockedEntry.id) {
      setRecentMatch(null);
    }

    setSafetyFeedback(
      `${blockedEntry.fullName} foi bloqueado(a) com segurança e ocultado(a) imediatamente do seu feed e das suas conversas.`
    );
    setPendingBlock(null);
  }

  function handleUnblockContact(contactId: string) {
    const target = wave2State.blockedContacts.find((b) => b.id === contactId);
    setWave2State((prev) => ({
      ...prev,
      blockedContacts: prev.blockedContacts.filter((b) => b.id !== contactId),
      passedIds: prev.passedIds.filter((id) => id !== contactId),
      likedIds: prev.likedIds.filter((id) => id !== contactId),
    }));
    if (target) {
      setSafetyFeedback(
        `${target.fullName} foi desbloqueado(a) e voltou a ficar disponível conforme os critérios de afinidade.`
      );
    }
  }

  function handleResetPassed() {
    setWave2State((prev) => ({
      ...prev,
      passedIds: [],
    }));
  }

  return (
    <div className="workspace-container">
      {/* Navegação unificada: barra no topo no Desktop e barra inferior fixa no Mobile */}
      <nav className="workspace-nav" aria-label="Navegação principal">
        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'discover' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('discover')}
          aria-current={activeTab === 'discover' ? 'page' : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span>Descobrir</span>
        </button>

        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'chat' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('chat')}
          aria-current={activeTab === 'chat' ? 'page' : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Conversas</span>
          {totalUnread > 0 && (
            <span
              className="workspace-nav__badge"
              aria-label={`${totalUnread} ${totalUnread === 1 ? 'não lida' : 'não lidas'}`}
            >
              {totalUnread}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'profile' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('profile')}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
        >
<svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Meu Perfil</span>

        </button>
      </nav>

      {safetyFeedback && (
        <div className="callout-amber workspace-feedback" role="status" aria-live="polite">
          <span>{safetyFeedback}</span>
          <button
            type="button"
            className="text-link"
            onClick={() => setSafetyFeedback(null)}
            aria-label="Fechar aviso"
          >
            Fechar
          </button>
        </div>
      )}

      {activeTab === 'discover' && (
        <MatchAffinityFeedRF05
          candidates={candidates}
          userCity={userCity}
          currentUserName={displayFullName || 'Você'}
          currentUserAvatarUrl={displayAvatarUrl}
          filterGoal={filterGoal}
          filterCity={filterCity}
          availableCities={availableCities}
          onFilterGoalChange={setFilterGoal}
          onFilterCityChange={setFilterCity}
          onPass={handlePassCandidate}
          onConnect={handleConnectCandidate}
          onResetPassed={handleResetPassed}
          recentMatch={recentMatch}
          onOpenMatchChat={handleOpenMatchChat}
          onDismissMatchBanner={() => setRecentMatch(null)}
        />
      )}

      {activeTab === 'chat' && (
        <SimplifiedChatRF07
          threads={visibleThreads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onSendMessage={handleSendMessage}
          onRequestBlock={(thread: ChatThread) =>
            setPendingBlock({
              id: thread.contactId,
              fullName: thread.contactName,
              age: thread.contactAge,
              city: thread.contactCity,
              avatarUrl: thread.contactAvatarUrl,
            })
          }
          onGoToDiscover={() => setActiveTab('discover')}
        />
      )}

      {activeTab === 'profile' && (

        <section className="editorial-profile" aria-labelledby="my-profile-heading">
          <div className="editorial-profile__grid">
            {/* Coluna Esquerda: Retrato Grande ou Monograma + Botão Foto */}
            <div className="editorial-profile__media">
              {displayAvatarUrl && !displayAvatarUrl.endsWith('.svg') ? (
                <div className="editorial-profile__photo-box">
                  <img
                    src={displayAvatarUrl}
                    alt={`Foto de perfil de ${displayFullName || authSession.email}`}
                    className="editorial-profile__photo"
                  />
                </div>
              ) : (
                <div className="editorial-profile__monogram" aria-hidden="true">
                  <span>
                    {(displayFullName || 'BT')
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? '')
                      .join('')}
                  </span>
                </div>
              )}

              <p className="editorial-profile__photo-hint">
                {displayAvatarUrl && !displayAvatarUrl.endsWith('.svg')
                  ? 'É assim que sua foto aparece para as outras pessoas em Descobrir.'
                  : 'Você ainda não tem foto. Perfis com foto recebem mais curtidas.'}
              </p>

              <button
                type="button"
                className="btn btn--secondary editorial-profile__photo-btn"
                onClick={onEditProfile}
              >
                {displayAvatarUrl && !displayAvatarUrl.endsWith('.svg')
                  ? 'Alterar foto'
                  : 'Adicionar foto'}
              </button>

              <div className="editorial-profile__verification-card">
                <div className="editorial-profile__verification-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <strong>{isFaciallyVerified ? 'Identidade verificada' : 'Selo de Verificado 50+'}</strong>
                  <p>
                    {isFaciallyVerified
                      ? 'Seu perfil foi confirmado com verificação facial.'
                      : 'Em breve você poderá confirmar sua identidade com a câmera do celular.'}
                  </p>
                </div>
                {!isFaciallyVerified && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setIsQrModalOpen(true)}
                  >
                    Ver como funciona
                  </button>
                )}
              </div>
            </div>

            {/* Coluna Direita: Identidade, Sobre Mim, Meus Gostos e Preferências */}
            <div className="editorial-profile__content">
              <header className="editorial-profile__header">
                <div className="editorial-profile__title-row">
                  <h1 id="my-profile-heading" className="editorial-profile__name">
                    {displayFullName || 'Meu Perfil'}
                  </h1>
                  <span className="editorial-profile__age">
                    {displayAge ? `${displayAge} anos` : '50+'}
                  </span>
                  {isFaciallyVerified && (
                    <span
                      className="editorial-profile__verified-badge"
                      title="Identidade verificada com biometria facial anti-golpe"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      Verificado 50+
                    </span>
                  )}
                </div>
                <p className="editorial-profile__location">
                  {formatSergipeLocation(userCity)}
                </p>
                <p className="editorial-profile__privacy-note">
                  É assim que as outras pessoas veem você em Descobrir. Endereço e telefone nunca
                  aparecem.
                </p>
              </header>

              <div className="editorial-profile__section">
                <div className="editorial-profile__section-head">
                  <h2 className="editorial-profile__label">SOBRE MIM</h2>
                  <button
                    type="button"
                    className="editorial-profile__edit-btn"
                    onClick={onEditProfile}
                  >
                    Editar
                  </button>
                </div>
                <p className="editorial-profile__bio">
                  {serverProfile?.bio?.trim() ||
                    'Adicione uma breve apresentação contando do que gosta de fazer e o que procura por aqui.'}
                </p>
              </div>

              <div className="editorial-profile__section">
                <div className="editorial-profile__section-head">
                  <h2 className="editorial-profile__label">MEUS GOSTOS</h2>
                  <button
                    type="button"
                    className="editorial-profile__edit-btn"
                    onClick={onEditProfile}
                  >
                    Editar
                  </button>
                </div>
                <p className="editorial-profile__hobbies-text">
                  {userHobbies.length > 0
                    ? userHobbies.map((hobbyId) => getHobbyLabel(hobbyId)).join(', ')
                    : 'Nenhum interesse selecionado ainda.'}
                </p>
                <p className="editorial-profile__helper">
                  {userHobbies.length} de até 10. Eles decidem quem aparece para você em Descobrir.
                </p>
              </div>

              <div className="editorial-profile__section">
                <h2 className="editorial-profile__label">QUEM APARECE PARA MIM</h2>
                <div className="editorial-profile__prefs-grid">
                  <div className="editorial-profile__pref-field">
                    <label htmlFor="profile-pref-goal" className="editorial-profile__pref-label">
                      Estou procurando
                    </label>
                    <select
                      id="profile-pref-goal"
                      className="form-input"
                      value={filterGoal}
                      onChange={(event) =>
                        setFilterGoal(event.target.value as ConnectionGoal | 'Todos')
                      }
                    >
                      <option value="Todos">Todos os objetivos</option>
                      <option value="Amizade">Amizade</option>
                      <option value="Companhia">Companhia</option>
                      <option value="Relacionamento">Relacionamento</option>
                    </select>
                  </div>

                  <div className="editorial-profile__pref-field">
                    <label
                      htmlFor="profile-pref-distance"
                      className="editorial-profile__pref-label"
                    >
                      Distância máxima
                    </label>
                    <select
                      id="profile-pref-distance"
                      className="form-input"
                      value={maxDistance}
                      onChange={(event) => {
                        const val = event.target.value;
                        setMaxDistance(val);
                        setFilterCity(val === 'city' ? userCity : 'Todas');
                      }}
                    >
                      <option value="city">Apenas minha cidade</option>
                      <option value="30km">Até 30 km</option>
                      <option value="state">Todo Sergipe</option>
                    </select>
                  </div>
                </div>
                <p className="editorial-profile__helper">
                  As mudanças já valem nas suas sugestões em Descobrir.
                </p>
              </div>

              <div className="editorial-profile__security-section">
                <BlockedContactsPanelRF08
                  blockedContacts={wave2State.blockedContacts}
                  onUnblock={handleUnblockContact}
                />
              </div>

              <footer className="editorial-profile__footer-links">
                <button
                  type="button"
                  className="editorial-profile__link"
                  onClick={onEditProfile}
                >
                  Alterar dados da conta
                </button>
                <button
                  type="button"
                  className="editorial-profile__link"
                  onClick={onLogout}
                >
                  Sair da conta
                </button>
                <button
                  type="button"
                  className="editorial-profile__link editorial-profile__link--danger"
                  onClick={onRequestDeleteAccount}
                >
                  Excluir conta e dados
                </button>
              </footer>
            </div>

          </div>
        </section>
      )}

      {pendingBlock && (
        <BlockContactModalRF08
          contactName={pendingBlock.fullName}
          onConfirm={handleConfirmBlock}
          onCancel={() => setPendingBlock(null)}
        />
      )}

      {isQrModalOpen && <FacialVerificationQrModal onClose={() => setIsQrModalOpen(false)} />}
    </div>
  );
}
