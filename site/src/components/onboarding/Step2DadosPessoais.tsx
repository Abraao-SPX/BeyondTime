import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  calculateAgeFromBirthDate,
  formatBirthDateInput,
  MIN_ALLOWED_AGE,
  validateBirthDate50Plus,
} from '../../utils/validation';

interface Step2DadosPessoaisProps {
  fullName: string;
  preferredName?: string;
  birthDate: string;
  onFullNameChange: (value: string) => void;
  onPreferredNameChange?: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onNext: () => void;
}

export function Step2DadosPessoais({
  fullName,
  preferredName = '',
  birthDate,
  onFullNameChange,
  onPreferredNameChange,
  onBirthDateChange,
  onNext,
}: Step2DadosPessoaisProps) {
  const [nameError, setNameError] = useState<string | null>(null);
  const [birthDateError, setBirthDateError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const birthDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const calculatedAge = calculateAgeFromBirthDate(birthDate);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setNameError('Informe seu nome completo com pelo menos 2 letras.');
      nameInputRef.current?.focus();
      return;
    }
    setNameError(null);

    const ageValidationError = validateBirthDate50Plus(birthDate);
    if (ageValidationError !== null) {
      setBirthDateError(ageValidationError);
      birthDateInputRef.current?.focus();
      return;
    }

    setBirthDateError(null);
    onNext();
  }

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Conta um pouco sobre você
      </h1>
      <p className="auth-card__subtitle">
        Queremos conhecer você melhor. O BeyondTime é um espaço seguro e exclusivo para pessoas com 50 anos ou mais.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="step2-fullname">
            Nome completo
          </label>
          <input
            ref={nameInputRef}
            id="step2-fullname"
            name="fullName"
            type="text"
            className="form-input"
            autoComplete="name"
            placeholder="Ex.: Maria de Fátima Santos"
            value={fullName}
            onChange={(event) => {
              onFullNameChange(event.target.value);
              if (nameError !== null) setNameError(null);
            }}
            aria-invalid={nameError !== null ? 'true' : undefined}
            aria-describedby="step2-fullname-error"
          />
          {nameError !== null && (
            <p id="step2-fullname-error" className="form-error" role="alert">
              {nameError}
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="step2-preferred-name">
            Como gostaria de ser chamado(a)? <span className="form-label__hint">(opcional)</span>
          </label>
          <input
            id="step2-preferred-name"
            name="preferredName"
            type="text"
            className="form-input"
            placeholder="Ex.: Fátima"
            value={preferredName}
            onChange={(event) => onPreferredNameChange?.(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="step2-birthdate">
            Data de nascimento
          </label>
          <input
            ref={birthDateInputRef}
            id="step2-birthdate"
            name="birthDate"
            type="text"
            inputMode="numeric"
            maxLength={10}
            className="form-input"
            autoComplete="bday"
            placeholder="DD/MM/AAAA"
            value={birthDate}
            onChange={(event) => {
              onBirthDateChange(formatBirthDateInput(event.target.value));
              if (birthDateError !== null) setBirthDateError(null);
            }}
            aria-invalid={birthDateError !== null ? 'true' : undefined}
            aria-describedby="step2-birthdate-error"
          />

          {calculatedAge !== null && calculatedAge >= MIN_ALLOWED_AGE && (
            <p className="age-confirmation-badge" role="status">
              ✓ {calculatedAge} anos confirmados. Seja muito bem-vindo(a)!
            </p>
          )}

          {birthDateError !== null && (
            <div
              id="step2-birthdate-error"
              className="callout-danger-amber"
              role="alert"
            >
              {birthDateError}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn--primary">
          Avançar
        </button>
      </form>
    </div>
  );
}
