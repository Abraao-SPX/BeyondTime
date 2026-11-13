import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  formatBirthDateInput,
  validateBirthDate50Plus,
} from '../../utils/validation';

interface Step2DadosPessoaisProps {
  fullName: string;
  birthDate: string;
  onFullNameChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onNext: () => void;
}

export function Step2DadosPessoais({
  fullName,
  birthDate,
  onFullNameChange,
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setNameError('Informe como você gosta de ser chamado(a) com pelo menos 2 letras.');
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
        Seus dados pessoais
      </h1>
      <p className="auth-card__subtitle">
        O BeyondTime é uma comunidade exclusiva para pessoas com 50 anos ou mais.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="step2-name">
            Como você gosta de ser chamado(a)?
          </label>
          <input
            ref={nameInputRef}
            id="step2-name"
            name="fullName"
            type="text"
            className="form-input"
            autoComplete="name"
            placeholder="Digite seu nome e sobrenome"
            value={fullName}
            onChange={(event) => {
              onFullNameChange(event.target.value);
              if (nameError !== null) setNameError(null);
            }}
            aria-invalid={nameError !== null ? 'true' : undefined}
            aria-describedby="step2-name-error"
          />
          {nameError !== null && (
            <p id="step2-name-error" className="form-error" role="alert">
              {nameError}
            </p>
          )}
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
