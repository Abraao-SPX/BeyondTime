import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ApiError,
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from '../services/apiClient';
import type { AuthViewId } from '../types/auth';
import { validatePasswordMatch } from '../utils/validation';

interface RecuperarSenhaProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
}

type RecoveryStep = 'REQUEST_CODE' | 'VERIFY_CODE' | 'NEW_PASSWORD' | 'DONE';

export function RecuperarSenha({
  contact,
  onContactChange,
  onNavigate,
}: RecuperarSenhaProps) {
  const [step, setStep] = useState<RecoveryStep>('REQUEST_CODE');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedbackMessage(null);

    const trimmed = contact.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setErrorMessage('Informe um e-mail válido cadastrado.');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(trimmed);
      setFeedbackMessage(
        import.meta.env.DEV && res.debugResetCode
          ? `${res.message} (Código de teste: ${res.debugResetCode})`
          : res.message
      );
      setStep('VERIFY_CODE');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : 'Falha ao solicitar código de recuperação.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedCode = code.trim();
    if (!/^[A-Za-z0-9]{6}$/.test(trimmedCode)) {
      setErrorMessage('Digite o código de exatamente 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyPasswordResetCode(contact.trim(), trimmedCode);
      setFeedbackMessage(res.message);
      setStep('NEW_PASSWORD');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Código inválido ou expirado.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const pwdError = validatePasswordMatch(newPassword, confirmPassword);
    if (pwdError !== null) {
      setErrorMessage(pwdError);
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(
        contact.trim(),
        code.trim(),
        newPassword,
        confirmPassword
      );
      setFeedbackMessage('Senha redefinida com sucesso! Você já pode entrar.');
      setStep('DONE');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSupportClick() {
    setFeedbackMessage(
      'Se não lembrar seu e-mail cadastrado, entre em contato com nossa equipe de suporte.'
    );
  }

  return (
    <section id="view-recover" className="auth-view" aria-labelledby="recover-title">
      <button
        type="button"
        className="btn--back"
        onClick={(event) => onNavigate('login', event.currentTarget)}
      >
        Voltar ao login
      </button>

      <h1 id="recover-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Recuperar seu acesso
      </h1>

      {step === 'REQUEST_CODE' && (
        <>
          <p className="auth-card__subtitle">
            Digite seu e-mail cadastrado para receber o código de 6 caracteres.
          </p>
          <form className="auth-form" onSubmit={handleRequestCode} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="recover-contact">
                E-mail cadastrado
              </label>
              <input
                ref={inputRef}
                id="recover-contact"
                name="contact"
                type="email"
                className="form-input form-input--recover"
                autoComplete="username"
                placeholder="exemplo@email.com"
                value={contact}
                onChange={(event) => {
                  onContactChange(event.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              {errorMessage !== null && (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="callout-amber" role="note">
              Enviaremos um código de segurança rápido válido por 15 minutos.
            </div>

            <div className="action-stack">
              <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
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
        </>
      )}

      {step === 'VERIFY_CODE' && (
        <>
          <p className="auth-card__subtitle">
            Informe o código de 6 caracteres enviado para <strong>{contact}</strong>.
          </p>
          <form className="auth-form" onSubmit={handleVerifyCode} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="recover-code">
                Código de segurança
              </label>
              <input
                id="recover-code"
                type="text"
                maxLength={6}
                className="form-input form-input--recover"
                placeholder="Ex.: A1B2C3"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              {errorMessage !== null && (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Validando código...' : 'Validar código'}
            </button>
          </form>
        </>
      )}

      {step === 'NEW_PASSWORD' && (
        <>
          <p className="auth-card__subtitle">
            Código confirmado! Escolha uma nova senha (mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial como . , @ !).
          </p>
          <form className="auth-form" onSubmit={handleResetPassword} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="recover-new-pwd">
                Nova senha
              </label>
              <input
                id="recover-new-pwd"
                type="password"
                className="form-input"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="recover-confirm-pwd">
                Confirmar nova senha
              </label>
              <input
                id="recover-confirm-pwd"
                type="password"
                className="form-input"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {errorMessage !== null && (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando senha...' : 'Salvar nova senha'}
            </button>
          </form>
        </>
      )}

      {step === 'DONE' && (
        <div className="action-stack">
          <button
            type="button"
            className="btn btn--primary"
            onClick={(event) => onNavigate('login', event.currentTarget)}
          >
            Ir para a tela de entrada
          </button>
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
