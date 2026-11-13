import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthViewId, SocialProvider } from '../types/auth';
import { validateContactValue } from '../utils/validation';
import { SocialAuthGrid } from './SocialAuthGrid';

interface TelaLoginProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
}

export function TelaLogin({
  contact,
  onContactChange,
  onNavigate,
}: TelaLoginProps) {
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
        'Identificação validada. Prosseguindo para a verificação segura da sua conta.'
      );
    }, 700);
  }

  function handleSocialSelect(provider: SocialProvider) {
    setFeedbackMessage(
      `Entrada com ${provider} preparada para conexão segura via OAuth 2.0.`
    );
  }

  return (
    <section id="view-login" className="auth-view" aria-labelledby="login-title">
      <h1
        id="login-title"
        ref={headingRef}
        tabIndex={-1}
        className="auth-card__title auth-card__title--center"
      >
        Conexões reais não têm idade
      </h1>
      <p className="auth-card__subtitle auth-card__subtitle--center">
        Um espaço seguro para amizades, companhias e relacionamentos.
      </p>

      <SocialAuthGrid onSelectProvider={handleSocialSelect} />

      <div className="auth-divider" aria-hidden="true">
        ou continue com e-mail
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <div className="form-group__header">
            <label className="form-label" htmlFor="login-contact">
              E-mail ou celular
            </label>
            <button
              type="button"
              className="link-button"
              onClick={(event) => onNavigate('recover', event.currentTarget)}
            >
              Esqueceu a senha?
            </button>
          </div>
          <input
            ref={inputRef}
            id="login-contact"
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
            aria-describedby="login-contact-error"
          />
          {errorMessage !== null && (
            <p id="login-contact-error" className="form-error" role="alert">
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
          {isSubmitting ? 'Verificando acesso...' : 'Continuar'}
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
          onClick={(event) => onNavigate('register', event.currentTarget)}
        >
          Ainda não tem conta? <span className="underline-bold">Crie conta agora</span>
        </button>
      </div>
    </section>
  );
}
