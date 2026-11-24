import { useEffect } from 'react';
import { getHobbyLabel } from '../../services/wave2Service';
import type { ScoredCandidate } from '../../types/wave2';

interface MatchCelebrationModalProps {
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  matchedCandidate: ScoredCandidate;
  onStartChat: (contactId: string) => void;
  onContinueDiscovering: () => void;
}

function formatSharedHobbiesSentence(hobbyIds: string[]): string {
  const labels = hobbyIds.slice(0, 3).map((id) => getHobbyLabel(id).toLowerCase());
  if (labels.length === 0) {
    return 'Vocês têm interesses em comum. Agora podem conversar.';
  }
  if (labels.length === 1) {
    return `Vocês dois gostam de ${labels[0]}. Agora podem conversar.`;
  }
  if (labels.length === 2) {
    return `Vocês dois gostam de ${labels[0]} e ${labels[1]}. Agora podem conversar.`;
  }
  return `Vocês dois gostam de ${labels[0]}, ${labels[1]} e ${labels[2]}. Agora podem conversar.`;
}

export function MatchCelebrationModal({
  currentUserName,
  currentUserAvatarUrl,
  matchedCandidate,
  onStartChat,
  onContinueDiscovering,
}: MatchCelebrationModalProps) {
  const userFirstName = (currentUserName || 'Você').trim().split(' ')[0];
  const matchFirstName = matchedCandidate.fullName.trim().split(' ')[0];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onContinueDiscovering();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinueDiscovering]);

  return (
    <div
      className="match-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onContinueDiscovering();
        }
      }}
    >
      <div className="match-modal-content">
        <div className="match-cards-stage" aria-hidden="true">
          <div className="match-card match-card--left">
            {currentUserAvatarUrl && !currentUserAvatarUrl.endsWith('.svg') ? (
              <img
                src={currentUserAvatarUrl}
                alt=""
                className="match-card__img"
              />
            ) : null}
            <span className="match-card__name">{userFirstName}</span>
          </div>

          <div className="match-card match-card--right">
            <img
              src={matchedCandidate.avatarUrl}
              alt=""
              className="match-card__img"
            />
          </div>

          <div className="match-heart-badge">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        <h2 id="match-modal-title" className="match-modal__title">
          {matchFirstName} também curtiu você
        </h2>

        <p className="match-modal__subtitle">
          {formatSharedHobbiesSentence(matchedCandidate.sharedHobbies)}
        </p>

        <div className="match-modal__actions">
          <button
            type="button"
            className="match-modal__btn-primary"
            onClick={() => onStartChat(matchedCandidate.id)}
          >
            Escrever para {matchFirstName}
          </button>
          <button
            type="button"
            className="match-modal__btn-secondary"
            onClick={onContinueDiscovering}
          >
            Continuar vendo sugestões
          </button>
        </div>
      </div>
    </div>
  );
}
