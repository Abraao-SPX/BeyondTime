import { useContactForm } from '../hooks/useContactForm';
import type { AuthViewId } from '../types/auth';

interface RecuperarSenhaProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
}

export function RecuperarSenha({
  contact,
  onContactChange,
  onNavigate,
}: RecuperarSenhaProps) {
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
      'Se o contato estiver cadastrado, você receberá um código de segurança de 6 números em instantes.',
  });

  function handleSupportClick() {
    setFeedbackMessage(
      'Se não lembrar seu e-mail ou celular, verifique suas mensagens SMS ou entre em contato com nossa equipe de suporte.'
    );
  }

  return (
    <section id="view-recover" className="auth-view" aria-labelledby="recover-title">
      <button
        type="button"
        className="btn--back"
        onClick={(event) => onNavigate('login', event.currentTarget)}
      >
        &lt; Voltar ao login
      </button>

      <h1 id="recover-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Recuperar seu acesso
      </h1>
      <p className="auth-card__subtitle">
        Digite seu e-mail ou celular cadastrado para receber o código de 6 números.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="recover-contact">
            E-mail ou celular
          </label>
          <input
            ref={inputRef}
            id="recover-contact"
            name="contact"
            type="text"
            className="form-input form-input--recover"
            autoComplete="username"
            placeholder="exemplo@email.com ou (79) 99999-9999"
            value={contact}
            onChange={(event) => handleInputChange(event.target.value)}
            aria-invalid={errorMessage !== null ? 'true' : undefined}
            aria-describedby="recover-contact-error"
          />
          {errorMessage !== null && (
            <p id="recover-contact-error" className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="callout-amber" role="note">
          Enviaremos um código de segurança rápido. Se precisar, poderá pedir um novo código na próxima etapa.
        </div>

        <div className="action-stack">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Enviando código...' : 'Enviar código de segurança'}
          </button>

          <button
            type="button"
            className="btn btn--secondary btn--secondary-recover"
            onClick={handleSupportClick}
          >
            Preciso de ajuda para entrar
          </button>
        </div>
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
    </section>
  );
}
