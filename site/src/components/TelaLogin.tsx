import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, loginWithEmail } from '../services/apiClient';
import type { AuthSession, AuthViewId, SocialProvider } from '../types/auth';
import {
  containsDangerousXss,
  MAX_LOGIN_ATTEMPTS,
  sanitizeTextInput,
} from '../utils/validation';
import { SocialAuthGrid } from './SocialAuthGrid';

interface TelaLoginProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
  onAuthSuccess: (session: AuthSession) => void;
}

export function TelaLogin({
  contact,
  onContactChange,
  onNavigate,
  onAuthSuccess,
}: TelaLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockCountdownSeconds, setLockCountdownSeconds] = useState(0);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lockCountdownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockCountdownSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockCountdownSeconds]);

  function handleSocialSelect(provider: SocialProvider) {
    setFeedbackMessage(
      `Entrada com ${provider} preparada para conexão segura via OAuth 2.0.`
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedbackMessage(null);

    if (lockCountdownSeconds > 0) {
      setErrorMessage(
        `Acesso temporariamente bloqueado por excesso de tentativas. Aguarde ${lockCountdownSeconds}s ou use "Esqueceu a senha?".`
      );
      return;
    }

    if (containsDangerousXss(contact)) {
      setErrorMessage('Formato de e-mail inválido. Scripts ou tags HTML não são permitidos.');
      inputRef.current?.focus();
      return;
    }

    const trimmedEmail = sanitizeTextInput(contact);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setErrorMessage('Informe o e-mail cadastrado para entrar.');
      inputRef.current?.focus();
      return;
    }

    if (password.length === 0) {
      setErrorMessage('Digite sua senha para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await loginWithEmail(trimmedEmail, password);
      setFailedAttempts(0);
      setLockCountdownSeconds(0);
      setFeedbackMessage('Acesso confirmado. Carregando sua conta...');
      onAuthSuccess(session);
    } catch (err) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (err instanceof ApiError) {
        if (err.status === 429 || nextAttempts >= MAX_LOGIN_ATTEMPTS) {
          setLockCountdownSeconds(60);
        }
        const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - nextAttempts);
        if (err.status === 401 && remaining > 0) {
          setErrorMessage(
            `${err.message} (Tentativa ${nextAttempts} de ${MAX_LOGIN_ATTEMPTS} — restam ${remaining}).`
          );
        } else {
          setErrorMessage(err.message);
        }
      } else {
        if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
          setLockCountdownSeconds(60);
          setErrorMessage(
            `Limite de ${MAX_LOGIN_ATTEMPTS} tentativas excedido. Aguarde 60 segundos antes de tentar novamente.`
          );
        } else {
          setErrorMessage('Não foi possível entrar agora. Tente novamente.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
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
              E-mail
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
            type="email"
            className="form-input"
            autoComplete="username"
            placeholder="Digite seu e-mail cadastrado"
            value={contact}
            onChange={(event) => {
              onContactChange(event.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            aria-invalid={errorMessage !== null ? 'true' : undefined}
            aria-describedby="login-contact-error"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Senha
          </label>
          <div className="password-field">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input form-input--password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
            />
            <button
              type="button"
              className="btn-eye"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errorMessage !== null && (
            <p id="login-contact-error" className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isSubmitting || lockCountdownSeconds > 0}
          aria-busy={isSubmitting}
        >
          {lockCountdownSeconds > 0
            ? `Bloqueado temporariamente (${lockCountdownSeconds}s)`
            : isSubmitting
              ? 'Verificando acesso...'
              : 'Entrar'}
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
