import { useEffect, useRef, useState } from 'react';
import {
  HOBBIES_CATALOG,
  HOBBY_CATEGORIES,
  MAX_HOBBIES_SELECTION,
  MIN_HOBBIES_SELECTION,
} from '../../data/hobbiesTaxonomy';
import type { HobbyCategory } from '../../types/auth';

interface Step5InteressesProps {
  selectedHobbies: string[];
  onToggleHobby: (hobby: string) => void;
  onNext: () => void;
}

export function Step5Interesses({
  selectedHobbies,
  onToggleHobby,
  onNext,
}: Step5InteressesProps) {
  const [activeCategory, setActiveCategory] =
    useState<HobbyCategory>('Música e Dança');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const canAdvance = selectedHobbies.length >= MIN_HOBBIES_SELECTION;
  const reachedLimit = selectedHobbies.length >= MAX_HOBBIES_SELECTION;

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Sobre você
      </h1>
      <p className="auth-card__subtitle">
        Escolha de {MIN_HOBBIES_SELECTION} a {MAX_HOBBIES_SELECTION} interesses. Usaremos seus hobbies para encontrar pessoas com afinidades em comum.
      </p>

      <p className="hobbies-counter" aria-live="polite">
        Selecionados: {selectedHobbies.length} de {MAX_HOBBIES_SELECTION} (mínimo {MIN_HOBBIES_SELECTION})
      </p>

      <div className="category-pills" role="group" aria-label="Categorias de interesses">
        {HOBBY_CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              className={isActive ? 'category-pill category-pill--active' : 'category-pill'}
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="hobbies-grid" role="group" aria-label="Lista de interesses">
        {HOBBIES_CATALOG.filter((h) => h.category === activeCategory).map((hobby) => {
          const isSelected = selectedHobbies.includes(hobby.label);
          const isDisabled = !isSelected && reachedLimit;
          return (
            <button
              key={hobby.id}
              type="button"
              className={isSelected ? 'hobby-chip hobby-chip--selected' : 'hobby-chip'}
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onToggleHobby(hobby.label)}
            >
              {hobby.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={canAdvance ? 'btn btn--primary' : 'btn btn--disabled-cta'}
        disabled={!canAdvance}
        onClick={onNext}
      >
        {canAdvance
          ? 'Avançar'
          : `Selecione ${MIN_HOBBIES_SELECTION} interesses para avançar`}
      </button>
    </div>
  );
}
