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
  const {
    errorMessage,
    feedbackMessage,
    setFeedbackMessage,
    isSubmitting,
    inputRef,
    headingRef,
    handleInputChange,
    handleSubmit,
  } = useContactForm({
    contact,
    onContactChange,
    successMessage:
      'Identificação validada. Prosseguindo para a verificação segura da sua conta.',
  });

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
