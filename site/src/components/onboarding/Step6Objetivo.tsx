import { useEffect, useRef } from 'react';
import type { ConnectionGoal } from '../../types/auth';

interface GoalOption {
  value: ConnectionGoal;
  description: string;
}

const GOAL_OPTIONS: readonly GoalOption[] = [
  {
    value: 'Amizade',
    description: 'Para conversar, trocar ideias e criar novos laços sinceros.',
  },
  {
    value: 'Relacionamento',
    description: 'Para encontrar um novo amor e viver momentos especiais juntos.',
  },
  {
    value: 'Companhia',
    description: 'Para passear, tomar um café, ir a eventos ou viajar acompanhado(a).',
  },
];

interface Step6ObjetivoProps {
  selectedGoal: ConnectionGoal;
  onSelectGoal: (goal: ConnectionGoal) => void;
  onNext: () => void;
}

export function Step6Objetivo({
  selectedGoal,
  onSelectGoal,
  onNext,
}: Step6ObjetivoProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        O que você procura hoje?
      </h1>
      <p className="auth-card__subtitle">
        Selecione o tipo de conexão que você deseja encontrar no BeyondTime.
      </p>

      <div className="goal-list" role="radiogroup" aria-label="Tipo de conexão desejada">
        {GOAL_OPTIONS.map((option) => {
          const isSelected = selectedGoal === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={isSelected ? 'goal-card goal-card--selected' : 'goal-card'}
              onClick={() => onSelectGoal(option.value)}
            >
              <span className="goal-card__content">
                <strong className="goal-card__title">{option.value}</strong>
                <span className="goal-card__desc">{option.description}</span>
              </span>
              <span
                className={
                  isSelected
                    ? 'goal-card__indicator goal-card__indicator--selected'
                    : 'goal-card__indicator'
                }
                aria-hidden="true"
              >
                {isSelected && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="goal-card__check"
                  >
                    <path d="M5 12l5 5L19 7" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" className="btn btn--primary" onClick={onNext}>
        Avançar
      </button>
    </div>
  );
}
