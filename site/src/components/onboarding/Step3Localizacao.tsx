import { useEffect, useRef } from 'react';
import type { FormEvent } from 'react';

const SERGIPE_CITIES = [
  'Aracaju (SE)',
  'Nossa Senhora do Socorro (SE)',
  'São Cristóvão (SE)',
  'Barra dos Coqueiros (SE)',
  'Lagarto (SE)',
  'Itabaiana (SE)',
  'Estância (SE)',
  "Itaporanga d'Ajuda (SE)",
] as const;

interface Step3LocalizacaoProps {
  city: string;
  onCityChange: (value: string) => void;
  onNext: () => void;
}

export function Step3Localizacao({
  city,
  onCityChange,
  onNext,
}: Step3LocalizacaoProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onNext();
  }

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Sua localização
      </h1>
      <p className="auth-card__subtitle">
        Aproximamos você de pessoas que moram por perto em Sergipe.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="step3-city">
            Cidade
          </label>
          <select
            id="step3-city"
            name="city"
            className="form-select"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
          >
            {SERGIPE_CITIES.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
        </div>

        <div className="callout-amber-lgpd" role="note">
          <svg
            className="callout-amber-lgpd__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p className="callout-amber-lgpd__text">
            Sua localização exata e endereço nunca serão exibidos. Mostraremos apenas a sua cidade para outros usuários.
          </p>
        </div>

        <button type="submit" className="btn btn--primary">
          Avançar
        </button>
      </form>
    </div>
  );
}
