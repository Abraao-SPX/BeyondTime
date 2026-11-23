import { useEffect, useMemo, useState } from 'react';
import {
  computeAffinityCandidates,
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
  ScoredCandidate,
  Wave2State,
  WorkspaceTabId,
} from '../../types/wave2';
import { MatchAffinityFeedRF05 } from './MatchAffinityFeedRF05';
import { SimplifiedChatRF07 } from './SimplifiedChatRF07';

interface AuthenticatedWorkspaceProps {
  authSession: AuthSession;
  serverProfile: ServerProfile | null;
  displayFullName: string;
  displayCity?: string;
  displayGoal?: string;
  displayHobbies?: string[];
  displayAvatarUrl: string | null;
  onEditProfile: () => void;
  onRequestDeleteAccount: () => void;
  onLogout: () => void;
}

export function AuthenticatedWorkspace({
  authSession,
  serverProfile,
  displayFullName,
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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [recentMatch, setRecentMatch] = useState<ScoredCandidate | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

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

  const visibleThreads = wave2State.threads;

  const totalUnread = useMemo(
    () => visibleThreads.reduce((acc, thread) => acc + thread.unreadCount, 0),
    [visibleThreads]
  );

  function handlePassCandidate(candidate: ScoredCandidate) {
    setStatusFeedback(null);
    setWave2State((prev) => ({
      ...prev,
      passedIds: prev.passedIds.includes(candidate.id)
        ? prev.passedIds
        : [...prev.passedIds, candidate.id],
    }));
  }

  function handleConnectCandidate(candidate: ScoredCandidate) {
    setStatusFeedback(null);
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
      setStatusFeedback(
        `Seu convite de conexão foi enviado para ${candidate.fullName}. Avisaremos quando houver afinidade mútua.`
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

  function handleSendMessage(contactId: string, text: string) {
    const outgoing = createOutgoingMessage(text);
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

  function handleResetPassed() {
    setWave2State((prev) => ({
      ...prev,
      passedIds: [],
    }));
  }

  return (
    <div className="workspace-container">
      <nav className="workspace-nav" aria-label="Navegação principal do BeyondTime">
        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'discover' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('discover')}
          aria-current={activeTab === 'discover' ? 'page' : undefined}
        >
          <span aria-hidden="true">♥</span>
          <span>Descobrir ({candidates.length})</span>
        </button>

        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'chat' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('chat')}
          aria-current={activeTab === 'chat' ? 'page' : undefined}
        >
          <span aria-hidden="true">💬</span>
          <span>Conversas</span>
          {totalUnread > 0 && (
            <span className="workspace-nav__badge" aria-label={`${totalUnread} não lidas`}>
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
          <span aria-hidden="true">👤</span>
          <span>Meu Perfil</span>
        </button>
      </nav>

      {statusFeedback && (
        <div className="callout-amber workspace-feedback" role="status" aria-live="polite">
          <span>{statusFeedback}</span>
          <button
            type="button"
            className="text-link"
            onClick={() => setStatusFeedback(null)}
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
          onGoToDiscover={() => setActiveTab('discover')}
        />
      )}

      {activeTab === 'profile' && (
        <section className="wave2-section" aria-labelledby="my-profile-heading">
          <div className="profile-hub-card">
            <span className="wave2-eyebrow">Sessão autenticada (JWT)</span>
            <h1 id="my-profile-heading" className="wave2-title">
              {displayFullName || 'Seu perfil BeyondTime'}
            </h1>
            <p className="wave2-subtitle">
              E-mail: <strong>{authSession.email}</strong>
              {userCity ? ` • ${userCity} (SE)` : ''}
              {userGoal ? ` • Objetivo: ${userGoal}` : ''}
            </p>

            {displayAvatarUrl && (
              <div className="photo-preview" style={{ marginBottom: '16px' }}>
                <img
                  src={displayAvatarUrl}
                  alt={`Foto de perfil de ${displayFullName || authSession.email}`}
                  className="photo-preview__image"
                />
              </div>
            )}

            {userHobbies.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h2 className="candidate-card__section-label">Seus interesses cadastrados</h2>
                <ul className="candidate-hobbies-list">
                  {userHobbies.map((hobbyId) => (
                    <li key={hobbyId} className="candidate-hobby-chip">
                      {getHobbyLabel(hobbyId)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="profile-hub-actions">
              <button type="button" className="btn btn--primary" onClick={onEditProfile}>
                Editar perfil e hobbies
              </button>
              <button type="button" className="btn btn--secondary" onClick={onLogout}>
                Sair da conta
              </button>
              <button
                type="button"
                className="btn-safety-link"
                onClick={onRequestDeleteAccount}
              >
                Excluir minha conta definitivamente (LGPD)
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
