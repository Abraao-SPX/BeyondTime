import { useEffect, useRef, useState } from 'react';
import { getHobbyLabel } from '../../services/wave2Service';
import type { ConnectionGoal } from '../../types/auth';
import type { ScoredCandidate } from '../../types/wave2';
import { MatchCelebrationModal } from './MatchCelebrationModal';

interface MatchAffinityFeedRF05Props {
  candidates: ScoredCandidate[];
  isLoading?: boolean;
  userCity: string;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  filterGoal: ConnectionGoal | 'Todos';
  filterCity: string;
  availableCities: string[];
  onFilterGoalChange: (goal: ConnectionGoal | 'Todos') => void;
  onFilterCityChange: (city: string) => void;
  onPass: (candidate: ScoredCandidate) => void;
  onConnect: (candidate: ScoredCandidate) => void;
  onResetPassed: () => void;
  recentMatch: ScoredCandidate | null;
  onOpenMatchChat: (contactId: string) => void;
  onDismissMatchBanner: () => void;
}

const GOAL_FILTERS: readonly (ConnectionGoal | 'Todos')[] = [
  'Todos',
  'Amizade',
  'Companhia',
  'Relacionamento',
];

export function MatchAffinityFeedRF05({
  candidates,
  isLoading = false,
  currentUserName,
  currentUserAvatarUrl,
  filterGoal,
  filterCity,
  availableCities,
  onFilterGoalChange,
  onFilterCityChange,
  onPass,
  onConnect,
  onResetPassed,
  recentMatch,
  onOpenMatchChat,
  onDismissMatchBanner,
}: MatchAffinityFeedRF05Props) {
  const currentCandidate = candidates[0] ?? null;
  const [pendingAction, setPendingAction] = useState<{
    type: 'like' | 'pass';
    candidate: ScoredCandidate;
  } | null>(null);
  const cancelActionBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pendingAction) {
      cancelActionBtnRef.current?.focus();
    }
  }, [pendingAction]);

  useEffect(() => {
    if (!pendingAction) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPendingAction(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingAction]);

  useEffect(() => {
    setPendingAction(null);
  }, [currentCandidate?.id]);

  function handleConfirmPendingAction() {
    if (!pendingAction) return;
    const { type, candidate } = pendingAction;
    setPendingAction(null);
    if (type === 'like') {
      onConnect(candidate);
    } else {
      onPass(candidate);
    }
  }

  return (
    <section className="discover-stage" aria-label="Descobrir pessoas">
      <div className="discover-toolbar" role="region" aria-label="Filtros">
        <div className="discover-toolbar__field">
          <label htmlFor="filter-goal" className="discover-toolbar__label">
            Objetivo
          </label>
          <select
            id="filter-goal"
            className="form-input discover-toolbar__select"
            value={filterGoal}
            onChange={(event) => onFilterGoalChange(event.target.value as ConnectionGoal | 'Todos')}
          >
            {GOAL_FILTERS.map((goal) => (
              <option key={goal} value={goal}>
                {goal === 'Todos' ? 'Todos' : goal}
              </option>
            ))}
          </select>
        </div>

        <div className="discover-toolbar__field">
          <label htmlFor="filter-city" className="discover-toolbar__label">
            Cidade
          </label>
          <select
            id="filter-city"
            className="form-input discover-toolbar__select"
            value={filterCity}
            onChange={(event) => onFilterCityChange(event.target.value)}
          >
            <option value="Todas">Todas em Sergipe</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {recentMatch && (
        <MatchCelebrationModal
          currentUserName={currentUserName}
          currentUserAvatarUrl={currentUserAvatarUrl}
          matchedCandidate={recentMatch}
          onStartChat={onOpenMatchChat}
          onContinueDiscovering={onDismissMatchBanner}
        />
      )}

      {isLoading && !currentCandidate ? (
        <div className="wave2-empty-card" role="status" aria-live="polite">
          <h1 className="wave2-empty-card__title">Buscando pessoas para você...</h1>
          <p className="wave2-empty-card__text">
            Estamos organizando as sugestões conforme seus interesses em Sergipe.
          </p>
        </div>
      ) : currentCandidate ? (
        <article
          className="deck-card"
          aria-label={`Perfil de ${currentCandidate.fullName}`}
        >
          <div className="deck-card__photo-wrap">
            <img
              src={currentCandidate.avatarUrl}
              alt={`Foto de ${currentCandidate.fullName}`}
              className="deck-card__photo"
            />
            <div className="deck-card__photo-scrim" aria-hidden="true" />

            <div className="deck-card__top-pills">
              <span className="deck-pill deck-pill--location">
                {currentCandidate.sameCity
                  ? `Na sua cidade • ${currentCandidate.city}`
                  : `${currentCandidate.city}, SE`}
              </span>
              <span className="deck-pill deck-pill--affinity">
                {currentCandidate.affinityPercent}% em comum
              </span>
            </div>

            <div className="deck-card__photo-overlay">
              <div className="deck-card__headline">
                <h1 className="deck-card__name">
                  {currentCandidate.fullName}, {currentCandidate.age}
                </h1>
                {currentCandidate.verifiedIdentity && (
                  <span
                    className="deck-verified"
                    title="Perfil verificado"
                    aria-label="Perfil verificado"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="deck-card__submeta">
                {currentCandidate.neighborhood}, {currentCandidate.city} • Busca{' '}
                {currentCandidate.goal.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="deck-card__details">
            <p className="deck-card__bio">{currentCandidate.bio}</p>

            <div className="deck-card__hobbies">
              {currentCandidate.sharedHobbies.length > 0 && (
                <p className="deck-card__hobbies-label">
                  {currentCandidate.sharedHobbies.length === 1
                    ? '1 gosto em comum com você'
                    : `${currentCandidate.sharedHobbies.length} gostos em comum com você`}
                </p>
              )}
              <ul className="candidate-hobbies-list">
                {currentCandidate.hobbies.map((hobbyId) => {
                  const isShared = currentCandidate.sharedHobbies.includes(hobbyId);
                  return (
                    <li
                      key={hobbyId}
                      className={`candidate-hobby-chip${
                        isShared ? ' candidate-hobby-chip--shared' : ''
                      }`}
                    >
                      {getHobbyLabel(hobbyId)}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="deck-card__actions" role="group" aria-label="Decisão sobre o perfil">
              <button
                type="button"
                className="deck-action-btn deck-action-btn--pass"
                onClick={() => setPendingAction({ type: 'pass', candidate: currentCandidate })}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                <span>Passar</span>
              </button>

              <button
                type="button"
                className="deck-action-btn deck-action-btn--like"
                onClick={() => setPendingAction({ type: 'like', candidate: currentCandidate })}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span>Curtir</span>
              </button>
            </div>
          </div>
        </article>
      ) : (
        <div className="wave2-empty-card" role="status">
          <h2 className="wave2-empty-card__title">Não há mais perfis no momento</h2>
          <p className="wave2-empty-card__text">
            Altere a cidade ou o objetivo acima, ou veja novamente os perfis que você passou.
          </p>
          <div className="wave2-empty-card__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onFilterGoalChange('Todos');
                onFilterCityChange('Todas');
                onResetPassed();
              }}
            >
              Ver perfis novamente
            </button>
          </div>
        </div>
      )}

      {pendingAction && (
        <div
          className="defensive-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-confirm-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPendingAction(null);
            }
          }}
        >
          <div className="defensive-modal">
            <p className="defensive-modal__badge">Confirmação de Segurança</p>
            <h2 id="match-confirm-modal-title" className="defensive-modal__title">
              {pendingAction.type === 'like'
                ? `Curtir o perfil de ${pendingAction.candidate.fullName}?`
                : `Passar o perfil de ${pendingAction.candidate.fullName}?`}
            </h2>
            <p className="defensive-modal__text">
              {pendingAction.type === 'like' ? (
                <>
                  Ao confirmar, você demonstra interesse em{' '}
                  <strong>{pendingAction.candidate.fullName}</strong>. Se a pessoa também curtir
                  você, uma conversa aparecerá em <strong>Conversas</strong>.
                </>
              ) : (
                <>
                  Ao confirmar, o perfil de <strong>{pendingAction.candidate.fullName}</strong>{' '}
                  será pulado por enquanto. Você poderá ver perfis novamente quando quiser.
                </>
              )}
            </p>
            <div className="defensive-modal__actions">
              <button
                ref={cancelActionBtnRef}
                type="button"
                className="btn btn--secondary"
                style={{ minHeight: '48px', minWidth: '48px' }}
                onClick={() => setPendingAction(null)}
              >
                Voltar e revisar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ minHeight: '48px', minWidth: '48px' }}
                onClick={handleConfirmPendingAction}
              >
                {pendingAction.type === 'like' ? 'Sim, confirmar curtida' : 'Sim, passar perfil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
