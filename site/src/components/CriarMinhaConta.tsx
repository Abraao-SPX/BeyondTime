import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthViewId, SocialProvider } from '../types/auth';
import { validateContactValue } from '../utils/validation';
import { SocialAuthGrid } from './SocialAuthGrid';

interface CriarMinhaContaProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
}

export function CriarMinhaConta({
  contact,
  onContactChange,
  onNavigate,
}: CriarMinhaContaProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFeedbackMessage(null);
    const validationError = validateContactValue(contact);
    if (validationError !== null) {
      setErrorMessage(validationError);
      inputRef.current?.focus();
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    timerRef.current = window.setTimeout(() => {
      setIsSubmitting(false);
      setFeedbackMessage(
        'Contato validado para o Passo 1 de 7. Preparando a próxima etapa do cadastro.'
      );
    }, 700);
  }

  function handleSocialSelect(provider: SocialProvider) {
    setFeedbackMessage(
      `Cadastro com ${provider} preparado para conexão segura via OAuth 2.0.`
    );
  }

  return (
    <section id="view-register" className="auth-view" aria-labelledby="register-title">
      <div className="register-progress">
        <span className="register-progress__welcome">Boas-vindas</span>
        <div className="register-progress__status">
          <span className="register-progress__label">Passo 1 de 7 (14%)</span>
          <div
            className="register-progress__track"
            role="progressbar"
            aria-valuenow={14}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do cadastro: passo 1 de 7"
          >
            <div className="register-progress__fill" />
          </div>
        </div>
      </div>

      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Criar minha conta
      </h1>
      <p className="auth-card__subtitle">
        Entre ou cadastre-se para encontrar conexões reais e seguras.
      </p>

      <SocialAuthGrid onSelectProvider={handleSocialSelect} />

      <div className="auth-divider" aria-hidden="true">
        ou continue com e-mail
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="register-contact">
            E-mail ou celular
          </label>
          <input
            ref={inputRef}
            id="register-contact"
            name="contact"
            type="text"
            className="form-input"
            autoComplete="username"
            placeholder="Digite seu e-mail ou celular"
            value={contact}
            onChange={(event) => {
              onContactChange(event.target.value);
              if (errorMessage !== null) setErrorMessage(null);
            }}
            aria-invalid={errorMessage !== null ? 'true' : undefined}
            aria-describedby="register-contact-error"
          />
          {errorMessage !== null && (
            <p id="register-contact-error" className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Preparando próxima etapa...' : 'Continuar'}
        </button>
      </form>

      {isSubmitting && (
        <div className="skeleton-loader" aria-hidden="true">
          <div className="skeleton-loader__bar" />
          <div className="skeleton-loader__bar skeleton-loader__bar--short" />
        </div>
      )}

      {feedbackMessage !== null && (
        <p className="form-feedback" aria-live="polite">
          {feedbackMessage}
        </p>
      )}

      <div className="card-footer-action">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={(event) => onNavigate('login', event.currentTarget)}
        >
          Já possui uma conta? <span className="underline-bold">Entrar</span>
        </button>
      </div>
    </section>
  );
}
