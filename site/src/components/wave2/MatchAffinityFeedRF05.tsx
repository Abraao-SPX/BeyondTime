import { useState } from 'react';
import { getHobbyLabel } from '../../services/wave2Service';
import type { ConnectionGoal } from '../../types/auth';
import type { ScoredCandidate } from '../../types/wave2';

interface MatchAffinityFeedRF05Props {
  candidates: ScoredCandidate[];
  userCity: string;
  filterGoal: ConnectionGoal | 'Todos';
  filterCity: string;
  availableCities: string[];
  onFilterGoalChange: (goal: ConnectionGoal | 'Todos') => void;
  onFilterCityChange: (city: string) => void;
  onPass: (candidate: ScoredCandidate) => void;
  onConnect: (candidate: ScoredCandidate) => void;
  onRequestBlock: (candidate: ScoredCandidate) => void;
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
  userCity,
  filterGoal,
  filterCity,
  availableCities,
  onFilterGoalChange,
  onFilterCityChange,
  onPass,
  onConnect,
  onRequestBlock,
  onResetPassed,
  recentMatch,
  onOpenMatchChat,
  onDismissMatchBanner,
}: MatchAffinityFeedRF05Props) {
  const [expandedBioId, setExpandedBioId] = useState<string | null>(null);
  const currentCandidate = candidates[0] ?? null;

  return (
    <section className="wave2-section" aria-labelledby="discover-heading">
      <header className="wave2-section__header">
        <div>
          <span className="wave2-eyebrow">RF-05 • Conexões por afinidade</span>
          <h1 id="discover-heading" className="wave2-title">
            Pessoas compatíveis em Sergipe
          </h1>
          <p className="wave2-subtitle">
            Ordenamos os perfis pela afinidade de hobbies e proximidade com{' '}
            <strong>{userCity || 'sua cidade em Sergipe'}</strong>. Sem gestos de deslizar: escolha
            com calma usando os botões abaixo.
          </p>
        </div>

        <div className="wave2-filters" role="region" aria-label="Filtros de afinidade">
          <div className="wave2-filter-group">
            <label htmlFor="filter-goal" className="wave2-filter-label">
              Objetivo
            </label>
            <select
              id="filter-goal"
              className="form-input wave2-select"
              value={filterGoal}
              onChange={(event) => onFilterGoalChange(event.target.value as ConnectionGoal | 'Todos')}
            >
              {GOAL_FILTERS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal === 'Todos' ? 'Todos os objetivos' : goal}
                </option>
              ))}
            </select>
          </div>

          <div className="wave2-filter-group">
            <label htmlFor="filter-city" className="wave2-filter-label">
              Cidade (SE)
            </label>
            <select
              id="filter-city"
              className="form-input wave2-select"
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
      </header>

      {recentMatch && (
        <div className="match-celebration" role="status" aria-live="polite">
          <div className="match-celebration__content">
            <span className="match-celebration__badge">Nova conexão por afinidade</span>
            <h2 className="match-celebration__title">
              Você e {recentMatch.fullName} se conectaram ({recentMatch.affinityPercent}% de afinidade)
            </h2>
            <p className="match-celebration__text">
              Vocês compartilham interesses em comum e agora podem conversar com tranquilidade no chat
              simplificado.
            </p>
          </div>
          <div className="match-celebration__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onOpenMatchChat(recentMatch.id)}
            >
              Conversar com {recentMatch.fullName.split(' ')[0]}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onDismissMatchBanner}
            >
              Continuar descobrindo
            </button>
          </div>
        </div>
      )}

      {currentCandidate ? (
        <div className="discover-layout">
          <article className="candidate-card" aria-label={`Perfil de ${currentCandidate.fullName}`}>
            <div className="candidate-card__top">
              <div className="candidate-card__identity">
                <img
                  src={currentCandidate.avatarUrl}
                  alt={`Foto de ${currentCandidate.fullName}`}
                  className="candidate-card__avatar"
                />
                <div>
                  <div className="candidate-card__name-row">
                    <h2 className="candidate-card__name">
                      {currentCandidate.fullName}, {currentCandidate.age}
                    </h2>
                    {currentCandidate.verifiedIdentity && (
                      <span className="candidate-badge candidate-badge--verified">
                        ✓ Perfil verificado
                      </span>
                    )}
                  </div>
                  <p className="candidate-card__meta">
                    {currentCandidate.city} (SE) • {currentCandidate.neighborhood} •{' '}
                    {currentCandidate.lastActiveLabel}
                  </p>
                  <p className="candidate-card__goal">
                    Busca: <strong>{currentCandidate.goal}</strong>
                  </p>
                </div>
              </div>

              <div
                className="affinity-score-pill"
                aria-label={`${currentCandidate.affinityPercent}% de afinidade`}
              >
                <span className="affinity-score-pill__value">
                  {currentCandidate.affinityPercent}%
                </span>
                <span className="affinity-score-pill__label">de afinidade</span>
              </div>
            </div>

            <div className="candidate-card__body">
              <h3 className="candidate-card__section-label">Sobre</h3>
              <p className="candidate-card__bio">
                {expandedBioId === currentCandidate.id || currentCandidate.bio.length <= 180
                  ? currentCandidate.bio
                  : `${currentCandidate.bio.slice(0, 180)}...`}
              </p>
              {currentCandidate.bio.length > 180 && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    setExpandedBioId((prev) =>
                      prev === currentCandidate.id ? null : currentCandidate.id
                    )
                  }
                >
                  {expandedBioId === currentCandidate.id ? 'Mostrar menos' : 'Ler apresentação completa'}
                </button>
              )}

              <div className="candidate-card__hobbies-block">
                <h3 className="candidate-card__section-label">
                  Interesses e afinidades ({currentCandidate.sharedHobbies.length} em comum com você)
                </h3>
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
                        {isShared ? '★ ' : ''}
                        {getHobbyLabel(hobbyId)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="candidate-card__actions" role="group" aria-label="Ações para este perfil">
              <button
                type="button"
                className="btn btn--secondary candidate-action-btn"
                onClick={() => onPass(currentCandidate)}
              >
                <span aria-hidden="true">✕</span>
                <span>Passar por enquanto</span>
              </button>

              <button
                type="button"
                className="btn btn--primary candidate-action-btn"
                onClick={() => onConnect(currentCandidate)}
              >
                <span aria-hidden="true">♥</span>
                <span>Conectar por afinidade</span>
              </button>
            </div>

            <div className="candidate-card__safety-row">
              <span className="candidate-card__queue-hint">
                {candidates.length === 1
                  ? 'Último perfil disponível com os filtros atuais'
                  : `Mais ${candidates.length - 1} perfis compatíveis aguardando sua avaliação`}
              </span>
              <button
                type="button"
                className="btn-safety-link"
                onClick={() => onRequestBlock(currentCandidate)}
              >
                Bloquear este contato
              </button>
            </div>
          </article>

          {candidates.length > 1 && (
            <aside className="discover-queue" aria-label="Próximos perfis compatíveis">
              <h2 className="discover-queue__title">Próximos por afinidade</h2>
              <ul className="discover-queue__list">
                {candidates.slice(1, 4).map((nextProfile) => (
                  <li key={nextProfile.id} className="discover-queue__item">
                    <img
                      src={nextProfile.avatarUrl}
                      alt=""
                      className="discover-queue__avatar"
                      aria-hidden="true"
                    />
                    <div className="discover-queue__info">
                      <strong>
                        {nextProfile.fullName}, {nextProfile.age}
                      </strong>
                      <span>
                        {nextProfile.city} (SE) • {nextProfile.affinityPercent}% afinidade
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      ) : (
        <div className="wave2-empty-card" role="status">
          <h2 className="wave2-empty-card__title">Você já viu todos os perfis disponíveis agora</h2>
          <p className="wave2-empty-card__text">
            Você pode ajustar os filtros de objetivo/cidade acima ou rever perfis que passou
            anteriormente.
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
              Ver novamente perfis disponíveis
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
