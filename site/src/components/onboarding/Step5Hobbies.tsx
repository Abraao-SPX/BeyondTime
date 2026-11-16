import { useEffect, useRef, useState } from 'react';
import { fetchHobbiesCatalog } from '../../services/apiClient';
import {
  MAX_HOBBIES_COUNT,
  MIN_HOBBIES_COUNT,
  validateHobbiesSelection,
} from '../../utils/validation';

const FALLBACK_HOBBIES = [
  'Música Popular Brasileira (MPB)',
  'Forró Tradicional e Pé de Serra',
  'Dança de Salão',
  'Leitura e Clubes do Livro',
  'Artesanato e Feiras Culturais',
  'Cinema e Teatro',
  'Fotografia e Memórias',
  'Jogos de Mesa, Xadrez e Dominó',
  'Jardinagem e Plantas',
  'Caminhada na Orla e Parques',
  'Praia e Banho de Mar',
  'Culinária Regional Sergipana',
  'Café da Tarde e Boa Conversa',
  'Viagens e Passeios Culturais',
  'Ações Sociais e Voluntariado',
] as const;

interface Step5HobbiesProps {
  selectedHobbies: string[];
  onToggleHobby: (hobby: string) => void;
  onNext: () => void;
}

export function Step5Hobbies({
  selectedHobbies,
  onToggleHobby,
  onNext,
}: Step5HobbiesProps) {
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([
    ...FALLBACK_HOBBIES,
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    let active = true;
    fetchHobbiesCatalog()
      .then((items) => {
        if (!active || items.length === 0) return;
        setAvailableHobbies(items.map((item) => item.name));
      })
      .catch(() => {
        // Mantém fallback local caso o backend esteja offline
      });
    return () => {
      active = false;
    };
  }, []);

  function handleToggle(hobby: string) {
    const exists = selectedHobbies.includes(hobby);
    if (!exists && selectedHobbies.length >= MAX_HOBBIES_COUNT) {
      setErrorMessage(`Você pode selecionar no máximo ${MAX_HOBBIES_COUNT} interesses.`);
      return;
    }
    setErrorMessage(null);
    onToggleHobby(hobby);
  }

  function handleContinue() {
    const validationError = validateHobbiesSelection(selectedHobbies);
    if (validationError !== null) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage(null);
    onNext();
  }

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Seus interesses e hobbies
      </h1>
      <p className="auth-card__subtitle">
        Escolha de {MIN_HOBBIES_COUNT} a {MAX_HOBBIES_COUNT} atividades que você gosta ({selectedHobbies.length} selecionados).
      </p>

      <div className="goal-cards" role="group" aria-label="Lista de interesses">
        {availableHobbies.map((hobby) => {
          const isSelected = selectedHobbies.includes(hobby);
          return (
            <button
              key={hobby}
              type="button"
              className={`goal-card${isSelected ? ' goal-card--selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => handleToggle(hobby)}
            >
              <span className="goal-card__title">{hobby}</span>
            </button>
          );
        })}
      </div>

      {errorMessage !== null && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      <button type="button" className="btn btn--primary" onClick={handleContinue}>
        Avançar
      </button>
    </div>
  );
}
