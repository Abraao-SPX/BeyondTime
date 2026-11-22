import { useState } from 'react';
import type { FormEvent } from 'react';
import { useContactForm } from '../hooks/useContactForm';
import type { AuthViewId, SocialProvider } from '../types/auth';
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const {
    errorMessage,
    feedbackMessage,
    setFeedbackMessage,
    isSubmitting,
    inputRef,
    headingRef,
    handleInputChange,
    handleSubmit: handleContactSubmit,
  } = useContactForm({
    contact,
    onContactChange,
    successMessage: 'Acesso validado! Entrando no BeyondTime...',
  });

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.trim().length === 0) {
      setPasswordError('Digite sua senha para entrar.');
      return;
    }
    setPasswordError(null);
    handleContactSubmit(event);
  }

  function handleSocialSelect(provider: SocialProvider) {
    setFeedbackMessage(
      `Entrada com ${provider} preparada para conexão segura via OAuth 2.0.`
    );
  }

  return (
    <section id="view-login" className="auth-view" aria-labelledby="login-title">
      <div className="auth-split-container">
        {/* Coluna Esquerda: Arco acolhedor com ilustração institucional */}
        <div className="auth-split__media" aria-hidden="true">
          <div className="arch-card">
            <div className="arch-card__badge">Comunidade 50+</div>
            <div className="arch-card__figure">
              <div className="arch-card__circle" />
              <div className="arch-card__portrait">
                <svg viewBox="0 0 120 120" fill="none" className="arch-card__svg">
                  <circle cx="60" cy="45" r="24" fill="#C48214" opacity="0.3" />
                  <path d="M20 105c0-22 18-40 40-40s40 18 40 40" stroke="#8C2D52" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="60" cy="45" r="18" fill="#8C2D52" />
                </svg>
              </div>
            </div>
            <p className="arch-card__quote">
              &ldquo;Um lugar acolhedor feito especialmente para quem já viveu grandes histórias e quer escrever novas.&rdquo;
            </p>
          </div>
        </div>

        {/* Coluna Direita: Cartão de Login */}
        <div className="auth-split__form">
          <div className="auth-card">
            <h1
              id="login-title"
              ref={headingRef}
              tabIndex={-1}
              className="auth-card__title"
            >
              Que bom ver você de volta
            </h1>
            <p className="auth-card__subtitle">
              Entre para continuar suas conversas com respeito e carinho.
            </p>

            <form className="auth-form" onSubmit={handleFormSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-contact">
                  E-mail ou celular
                </label>
                <input
                  ref={inputRef}
                  id="login-contact"
                  name="contact"
                  type="text"
                  className="form-input"
                  autoComplete="username"
                  placeholder="Digite seu e-mail ou celular"
                  value={contact}
                  onChange={(event) => handleInputChange(event.target.value)}
                  aria-invalid={errorMessage !== null ? 'true' : undefined}
                  aria-describedby="login-contact-error"
                />
                {errorMessage !== null && (
                  <p id="login-contact-error" className="form-error" role="alert">
                    {errorMessage}
                  </p>
                )}
              </div>

              <div className="form-group">
                <div className="form-group__header">
                  <label className="form-label" htmlFor="login-password">
                    Sua senha
                  </label>
                  <button
                    type="button"
                    className="link-button"
                    onClick={(event) => onNavigate('recover', event.currentTarget)}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="input-with-action">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-eye"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                {passwordError !== null && (
                  <p className="form-error" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Verificando acesso...' : 'Entrar'}
              </button>
            </form>

            <div className="auth-divider" aria-hidden="true">
              ou entre com sua conta social
            </div>

            <SocialAuthGrid onSelectProvider={handleSocialSelect} />

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
                Ainda não tem conta? <span className="underline-bold">Criar minha conta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
