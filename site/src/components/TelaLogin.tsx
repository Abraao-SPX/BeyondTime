import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, loginWithEmail, loginWithSocial } from '../services/apiClient';
import {
  authenticateWithFirebasePopup,
  getFreshFirebaseIdToken,
  signOutFirebaseSilently,
} from '../services/firebaseClient';
import type {
  AuthSession,
  AuthViewId,
  SocialOnboardingDraft,
  SocialProvider,
} from '../types/auth';
import {
  containsDangerousXss,
  MAX_LOGIN_ATTEMPTS,
  sanitizeTextInput,
} from '../utils/validation';
import { SocialAuthGrid } from './SocialAuthGrid';
import { SocialBirthDateModal } from './SocialBirthDateModal';
import { PasswordInput } from './PasswordInput';

function fromIsoBirthDateToBr(isoDate: string): string {
  const parts = isoDate.trim().split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

interface TelaLoginProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
  onAuthSuccess: (session: AuthSession, socialDraft?: SocialOnboardingDraft) => void;
}

export function TelaLogin({
  contact,
  onContactChange,
  onNavigate,
  onAuthSuccess,
}: TelaLoginProps) {
  const [password, setPassword] = useState('');
  const rememberMe = false;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockCountdownSeconds, setLockCountdownSeconds] = useState(0);

  // Estados para o fluxo social 50+
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);
  const [socialPendingToken, setSocialPendingToken] = useState<string | null>(null);
  const [socialProviderName, setSocialProviderName] = useState<SocialProvider | null>(null);
  const [socialPendingFullName, setSocialPendingFullName] = useState<string | undefined>(undefined);
  const [socialPendingPhotoUrl, setSocialPendingPhotoUrl] = useState<string | undefined>(undefined);
  const [isBirthDateModalOpen, setIsBirthDateModalOpen] = useState(false);
  const [socialModalError, setSocialModalError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const isLockCountdownActive = lockCountdownSeconds > 0;

  useEffect(() => {
    if (!isLockCountdownActive) return;
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
  }, [isLockCountdownActive]);

  async function handleSocialSelect(provider: SocialProvider) {
    setErrorMessage(null);
    setFeedbackMessage(`Autenticando com ${provider}...`);
    setIsSocialSubmitting(true);

    try {
      const authResult = await authenticateWithFirebasePopup(provider);
      onContactChange(authResult.email);

      try {
        const session = await loginWithSocial(authResult.idToken, undefined, provider, rememberMe);
        await signOutFirebaseSilently();
        setFeedbackMessage(`Acesso com ${provider} autorizado! Carregando seu painel...`);
        onAuthSuccess(session, {
          fullName: authResult.fullName || undefined,
          photoUrl: authResult.photoUrl || undefined,
          provider,
        });
      } catch (apiErr) {
        if (apiErr instanceof ApiError && apiErr.code === 'BIRTH_DATE_REQUIRED_FOR_NEW_OAUTH_ACCOUNT') {
          // Usuário novo autenticado no Google/Facebook que ainda não cadastrou data de nascimento (RF02)
          setSocialPendingToken(authResult.idToken);
          setSocialProviderName(provider);
          setSocialPendingFullName(authResult.fullName || undefined);
          setSocialPendingPhotoUrl(authResult.photoUrl || undefined);
          setSocialModalError(null);
          setIsBirthDateModalOpen(true);
          setFeedbackMessage(null);
        } else if (apiErr instanceof ApiError) {
          setErrorMessage(apiErr.message);
          setFeedbackMessage(null);
        } else {
          setErrorMessage(`Não foi possível autenticar com ${provider}. Tente novamente.`);
          setFeedbackMessage(null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Erro ao autenticar com ${provider}.`;
      setErrorMessage(msg);
      setFeedbackMessage(null);
    } finally {
      setIsSocialSubmitting(false);
    }
  }

  async function handleSocialBirthDateConfirm(isoBirthDate: string) {
    if (!socialPendingToken) return;

    setIsSocialSubmitting(true);
    setSocialModalError(null);

    try {
      const freshToken = await getFreshFirebaseIdToken(socialPendingToken);
      const session = await loginWithSocial(
        freshToken,
        isoBirthDate,
        socialProviderName || undefined,
        rememberMe
      );
      await signOutFirebaseSilently();
      const draft: SocialOnboardingDraft = {
        fullName: socialPendingFullName,
        birthDate: fromIsoBirthDateToBr(isoBirthDate),
        photoUrl: socialPendingPhotoUrl,
        provider: socialProviderName || undefined,
      };
      setIsBirthDateModalOpen(false);
      setSocialPendingToken(null);
      setSocialPendingFullName(undefined);
      setSocialPendingPhotoUrl(undefined);
      setFeedbackMessage('Cadastro social validado com sucesso! Carregando seu perfil...');
      onAuthSuccess(session, draft);
    } catch (err) {
      if (err instanceof ApiError) {
        setSocialModalError(err.message);
      } else {
        setSocialModalError('Não foi possível validar sua data de nascimento. Tente novamente.');
      }
    } finally {
      setIsSocialSubmitting(false);
    }
  }

  function handleSocialBirthDateCancel() {
    void signOutFirebaseSilently();
    setIsBirthDateModalOpen(false);
    setSocialPendingToken(null);
    setSocialProviderName(null);
    setSocialPendingFullName(undefined);
    setSocialPendingPhotoUrl(undefined);
    setSocialModalError(null);
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
      const session = await loginWithEmail(trimmedEmail, password, rememberMe);
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

  const isAnySubmitting = isSubmitting || isSocialSubmitting;

  return (
    <section className="auth-step" aria-labelledby="login-title">
      <header className="auth-step__header">
        <h1 id="login-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
          Entrar no BeyondTime
        </h1>
        <p className="auth-card__subtitle">
          Bem-vindo de volta! Conecte-se para encontrar pessoas e grupos com afinidade em Sergipe.
        </p>
      </header>

      <SocialAuthGrid onSelectProvider={handleSocialSelect} disabled={isAnySubmitting} />

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
            aria-describedby={errorMessage !== null ? 'login-contact-error' : undefined}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Senha
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
          />
        </div>
          {errorMessage !== null && (
            <p id="login-contact-error" className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isAnySubmitting || lockCountdownSeconds > 0}
          aria-busy={isAnySubmitting}
        >
          {lockCountdownSeconds > 0
            ? `Bloqueado temporariamente (${lockCountdownSeconds}s)`
            : isAnySubmitting
              ? 'Verificando acesso...'
              : 'Entrar'}
        </button>
      </form>

      {isAnySubmitting && (
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

      <SocialBirthDateModal
        isOpen={isBirthDateModalOpen}
        providerName={socialProviderName}
        isSubmitting={isSocialSubmitting}
        errorMessage={socialModalError}
        onConfirm={handleSocialBirthDateConfirm}
        onCancel={handleSocialBirthDateCancel}
      />
    </section>
  );
}
