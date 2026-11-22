import { useState } from 'react';
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
  const [recoverChannel, setRecoverChannel] = useState<'email' | 'sms'>('email');

  const {
    errorMessage,
    feedbackMessage,
    isSubmitting,
    inputRef,
    headingRef,
    handleInputChange,
    handleSubmit,
  } = useContactForm({
    contact,
    onContactChange,
    successMessage:
      'Código de verificação de 6 números enviado com sucesso! Verifique sua caixa de entrada ou mensagens SMS.',
  });

  return (
    <section id="view-recover" className="auth-view" aria-labelledby="recover-title">
      <div className="auth-split-container">
        {/* Coluna Esquerda: Arco acolhedor com ilustração de segurança */}
        <div className="auth-split__media" aria-hidden="true">
          <div className="arch-card">
            <div className="arch-card__badge">Acesso Seguro</div>
            <div className="arch-card__figure">
              <div className="arch-card__circle" />
              <div className="arch-card__portrait">
                <svg viewBox="0 0 120 120" fill="none" className="arch-card__svg">
                  <path d="M60 25l32 12v30c0 24-14 38-32 45-18-7-32-21-32-45V37l32-12z" stroke="#8C2D52" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M50 62l8 8 16-16" stroke="#C48214" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <p className="arch-card__quote">
              &ldquo;Sua segurança e tranquilidade são nossa prioridade máxima. Enviaremos um código simples para você redefinir sua senha.&rdquo;
            </p>
          </div>
        </div>

        {/* Coluna Direita: Formulário de Recuperação */}
        <div className="auth-split__form">
          <div className="auth-card">
            <button
              type="button"
              className="btn--back"
              onClick={(event) => onNavigate('login', event.currentTarget)}
            >
              &lt; Voltar ao login
            </button>

            <h1 id="recover-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
              Vamos recuperar o seu acesso
            </h1>
            <p className="auth-card__subtitle">
              Escolha onde quer receber seu código. Depois você cria uma nova senha de forma simples.
            </p>

            {/* Opções de Canal (Email vs SMS) */}
            <div className="recover-channels" role="radiogroup" aria-label="Canal para receber código">
              <button
                type="button"
                role="radio"
                aria-checked={recoverChannel === 'email'}
                className={`channel-pill ${recoverChannel === 'email' ? 'channel-pill--selected' : ''}`}
                onClick={() => setRecoverChannel('email')}
              >
                <span className="channel-pill__dot" aria-hidden="true" />
                <span>Por e-mail</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={recoverChannel === 'sms'}
                className={`channel-pill ${recoverChannel === 'sms' ? 'channel-pill--selected' : ''}`}
                onClick={() => setRecoverChannel('sms')}
              >
                <span className="channel-pill__dot" aria-hidden="true" />
                <span>Por SMS</span>
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="recover-contact">
                  {recoverChannel === 'email' ? 'E-mail cadastrado' : 'Celular cadastrado (com DDD)'}
                </label>
                <input
                  ref={inputRef}
                  id="recover-contact"
                  name="contact"
                  type="text"
                  className="form-input form-input--recover"
                  autoComplete="username"
                  placeholder={
                    recoverChannel === 'email'
                      ? 'exemplo@email.com'
                      : '(79) 99999-9999'
                  }
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
                Enviaremos um código de segurança rápido. Você não precisa se preocupar: se não receber, poderá solicitar novamente em 60 segundos.
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
                  className="btn btn--secondary"
                  onClick={(event) => onNavigate('login', event.currentTarget)}
                >
                  Lembrou da sua senha? <span className="underline-bold">Fazer login</span>
                </button>
              </div>
            </form>

            {feedbackMessage !== null && (
              <p className="form-feedback" aria-live="polite">
                {feedbackMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
