import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LegalDocKey, OnboardingFormData } from '../../types/auth';
import {
  calculateAgeFromBirthDate,
  MIN_PASSWORD_LENGTH,
  validatePasswordMatch,
} from '../../utils/validation';

interface Step7SenhaLgpdProps {
  formData: OnboardingFormData;
  isCompleted: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleLgpd: (accepted: boolean) => void;
  onComplete: () => void;
  onEditProfile: () => void;
  onFinishToLogin: () => void;
}

const LEGAL_PREVIEWS: Record<LegalDocKey, string> = {
  terms:
    'Termos de Uso: o BeyondTime é uma plataforma 50+ para conexões respeitosas, com diretrizes claras contra fraudes, assédio e solicitações financeiras.',
  privacy:
    'Política de Privacidade e Segurança: seus dados pessoais e preferências são tratados conforme a LGPD, sem exibição pública de endereço ou telefone.',
};

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="btn-eye__icon"
        aria-hidden="true"
      >
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <path d="M1 1l22 22" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="btn-eye__icon"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function Step7SenhaLgpd({
  formData,
  isCompleted,
  onPasswordChange,
  onConfirmPasswordChange,
  onToggleLgpd,
  onComplete,
  onEditProfile,
  onFinishToLogin,
}: Step7SenhaLgpdProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const passwordsMatch =
    formData.password.length >= MIN_PASSWORD_LENGTH &&
    formData.password === formData.confirmPassword;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passwordError = validatePasswordMatch(
      formData.password,
      formData.confirmPassword
    );
    if (passwordError !== null) {
      setFormError(passwordError);
      passwordInputRef.current?.focus();
      return;
    }

    if (!formData.acceptedLgpd) {
      setFormError(
        'Para concluir o cadastro, marque a caixa confirmando que leu e aceita os Termos de Uso e a Política de Privacidade e Segurança.'
      );
      return;
    }

    setFormError(null);
    onComplete();
  }

  function handleToggleLegalPreview(docKey: LegalDocKey) {
    setActiveLegalDoc((current) => (current === docKey ? null : docKey));
  }

  if (isCompleted) {
    const calculatedAge = calculateAgeFromBirthDate(formData.birthDate);
    return (
      <div className="completion-summary" aria-live="polite">
        <p className="defensive-modal__badge">Perfil salvo</p>
        <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
          Perfil criado com sucesso
        </h1>
        <p className="auth-card__subtitle">
          Seus dados e preferências foram salvos. Você pode editar seu perfil a qualquer momento.
        </p>

        {formData.photoPreviewUrl !== null && (
          <div className="photo-preview">
            <img
              src={formData.photoPreviewUrl}
              alt="Foto do seu perfil BeyondTime"
              className="photo-preview__img"
            />
          </div>
        )}

        <div className="summary-box">
          <p>
            <strong>Nome:</strong> {formData.fullName || 'Não informado'}
          </p>
          <p>
            <strong>Idade:</strong>{' '}
            {calculatedAge !== null ? `${calculatedAge} anos` : formData.birthDate}
          </p>
          <p>
            <strong>Cidade:</strong> {formData.city}
          </p>
          <p>
            <strong>Objetivo:</strong> {formData.goal}
          </p>
          <p>
            <strong>Interesses escolhidos:</strong> {formData.hobbies.join(', ')}
          </p>
        </div>

        <div className="action-stack action-stack--compact">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onFinishToLogin}
          >
            Ir para a tela de entrada
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onEditProfile}
          >
            Editar perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Crie sua senha de acesso
      </h1>
      <p className="auth-card__subtitle">
        Escolha uma senha segura para proteger sua conta.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="step7-password">
            Criar senha
          </label>
          <div className="password-row">
            <input
              ref={passwordInputRef}
              id="step7-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input form-input--password"
              autoComplete="new-password"
              placeholder="Digite sua senha"
              value={formData.password}
              onChange={(event) => {
                onPasswordChange(event.target.value);
                if (formError !== null) setFormError(null);
              }}
              aria-describedby="step7-password-help"
            />
            <button
              type="button"
              className="btn-eye"
              aria-label="Mostrar ou ocultar senha"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
          <p id="step7-password-help" className="form-helper">
            Pelo menos {MIN_PASSWORD_LENGTH} caracteres.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="step7-confirm-password">
            Confirmar senha
          </label>
          <div className="password-row">
            <input
              id="step7-confirm-password"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              className="form-input form-input--password"
              autoComplete="new-password"
              placeholder="Digite a senha novamente"
              value={formData.confirmPassword}
              onChange={(event) => {
                onConfirmPasswordChange(event.target.value);
                if (formError !== null) setFormError(null);
              }}
            />
            <button
              type="button"
              className="btn-eye"
              aria-label="Mostrar ou ocultar confirmação de senha"
              aria-pressed={showConfirm}
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              <EyeIcon visible={showConfirm} />
            </button>
          </div>
          {passwordsMatch && (
            <p className="password-match" aria-live="polite">
              As senhas coincidem
            </p>
          )}
        </div>

        <div className="lgpd-consent">
          <label className="lgpd-checkbox-row" htmlFor="step7-lgpd">
            <input
              id="step7-lgpd"
              type="checkbox"
              className="lgpd-checkbox-input"
              checked={formData.acceptedLgpd}
              onChange={(event) => {
                onToggleLgpd(event.target.checked);
                if (formError !== null) setFormError(null);
              }}
            />
            <span className="lgpd-checkbox-box" aria-hidden="true">
              {formData.acceptedLgpd && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lgpd-checkbox-box__icon"
                >
                  <path d="M5 12l5 5L19 7" />
                </svg>
              )}
            </span>
            <span className="lgpd-checkbox-text">
              Li e aceito os <strong>Termos de Uso</strong> e a{' '}
              <strong>Política de Privacidade e Segurança</strong> do BeyondTime.
            </span>
          </label>

          <div className="lgpd-doc-buttons">
            <button
              type="button"
              className="btn-legal-outline"
              onClick={() => handleToggleLegalPreview('terms')}
            >
              Termos de Uso
            </button>
            <button
              type="button"
              className="btn-legal-outline"
              onClick={() => handleToggleLegalPreview('privacy')}
            >
              Política de Privacidade e Segurança
            </button>
          </div>

          {activeLegalDoc !== null && (
            <p className="form-feedback" aria-live="polite">
              {LEGAL_PREVIEWS[activeLegalDoc]}
            </p>
          )}
        </div>

        {formError !== null && (
          <p className="form-error form-error--block" role="alert">
            {formError}
          </p>
        )}

        <button type="submit" className="btn btn--primary">
          Concluir cadastro
        </button>
      </form>
    </div>
  );
}
