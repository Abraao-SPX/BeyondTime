import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { LegalDocKey, OnboardingFormData, OnboardingStep } from '../../types/auth';
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
  onEditStep?: (step: OnboardingStep) => void;
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
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
  onEditStep,
}: Step7SenhaLgpdProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [isCompleted]);

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

  const calculatedAge = calculateAgeFromBirthDate(formData.birthDate);

  if (isCompleted) {
    return (
      <div className="completion-summary" aria-live="polite">
        <p className="defensive-modal__badge">Perfil salvo</p>
        <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
          Perfil criado com sucesso!
        </h1>
        <p className="auth-card__subtitle">
          Seus dados e preferências foram salvos com segurança. Você já pode acessar a comunidade.
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
          {formData.preferredName && (
            <p>
              <strong>Prefere ser chamado(a):</strong> {formData.preferredName}
            </p>
          )}
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
            <strong>Interesses:</strong> {formData.hobbies.join(', ')}
          </p>
        </div>

        <div className="action-stack">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onFinishToLogin}
          >
            Ir para o login e entrar
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onEditProfile}
          >
            Editar dados do perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        Crie sua senha e confira tudo
      </h1>
      <p className="auth-card__subtitle">
        Guarde bem essa senha para entrar de novo quando quiser.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="step7-password">
            Crie uma senha (mínimo de {MIN_PASSWORD_LENGTH} caracteres)
          </label>
          <div className="input-with-action">
            <input
              ref={passwordInputRef}
              id="step7-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              autoComplete="new-password"
              placeholder="Digite sua senha secreta"
              value={formData.password}
              onChange={(event) => {
                onPasswordChange(event.target.value);
                if (formError !== null) setFormError(null);
              }}
              aria-describedby="step7-rules"
            />
            <button
              type="button"
              className="btn-eye"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar senha' : 'Ver senha em texto'}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="step7-confirm">
            Confirme sua senha
          </label>
          <div className="input-with-action">
            <input
              id="step7-confirm"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-input"
              autoComplete="new-password"
              placeholder="Digite a mesma senha novamente"
              value={formData.confirmPassword}
              onChange={(event) => {
                onConfirmPasswordChange(event.target.value);
                if (formError !== null) setFormError(null);
              }}
            />
            <button
              type="button"
              className="btn-eye"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword
                  ? 'Ocultar confirmação da senha'
                  : 'Ver confirmação da senha em texto'
              }
            >
              <EyeIcon visible={showConfirmPassword} />
            </button>
          </div>
        </div>

        {/* Revisão Interativa dos Dados (Conforme Wireframe) */}
        <div className="review-card">
          <div className="review-card__header">
            <h2 className="review-card__title">Revise seus dados:</h2>
            <span className="review-card__tip">Confira se está tudo certinho antes de concluir</span>
          </div>

          <ul className="review-list">
            <li className="review-item">
              <div className="review-item__info">
                <span className="review-item__label">Nome completo</span>
                <span className="review-item__value">
                  {formData.fullName || 'Não informado'}
                  {formData.preferredName ? ` (chamado de ${formData.preferredName})` : ''}
                </span>
              </div>
              {onEditStep && (
                <button
                  type="button"
                  className="review-item__edit-btn"
                  onClick={() => onEditStep(2)}
                  aria-label="Editar nome e dados pessoais"
                >
                  Editar
                </button>
              )}
            </li>

            <li className="review-item">
              <div className="review-item__info">
                <span className="review-item__label">Data de nascimento</span>
                <span className="review-item__value">
                  {formData.birthDate || 'Não informado'}
                  {calculatedAge !== null ? ` (${calculatedAge} anos)` : ''}
                </span>
              </div>
              {onEditStep && (
                <button
                  type="button"
                  className="review-item__edit-btn"
                  onClick={() => onEditStep(2)}
                  aria-label="Editar data de nascimento"
                >
                  Editar
                </button>
              )}
            </li>

            <li className="review-item">
              <div className="review-item__info">
                <span className="review-item__label">Localização</span>
                <span className="review-item__value">{formData.city}</span>
              </div>
              {onEditStep && (
                <button
                  type="button"
                  className="review-item__edit-btn"
                  onClick={() => onEditStep(3)}
                  aria-label="Editar cidade de localização"
                >
                  Editar
                </button>
              )}
            </li>

            <li className="review-item">
              <div className="review-item__info">
                <span className="review-item__label">Foto de perfil</span>
                <span className="review-item__value">
                  {formData.photoPreviewUrl ? 'Foto selecionada ✓' : 'Adicionar mais tarde'}
                </span>
              </div>
              {onEditStep && (
                <button
                  type="button"
                  className="review-item__edit-btn"
                  onClick={() => onEditStep(4)}
                  aria-label="Editar foto de perfil"
                >
                  Editar
                </button>
              )}
            </li>

            <li className="review-item">
              <div className="review-item__info">
                <span className="review-item__label">Seus interesses</span>
                <span className="review-item__value">
                  {formData.hobbies.length > 0
                    ? formData.hobbies.join(', ')
                    : 'Nenhum hobby selecionado'}
                </span>
              </div>
              {onEditStep && (
                <button
                  type="button"
                  className="review-item__edit-btn"
                  onClick={() => onEditStep(5)}
                  aria-label="Editar interesses e hobbies"
                >
                  Editar
                </button>
              )}
            </li>

            <li className="review-item">
              <div className="review-item__info">
                <span className="review-item__label">O que procura</span>
                <span className="review-item__value">{formData.goal}</span>
              </div>
              {onEditStep && (
                <button
                  type="button"
                  className="review-item__edit-btn"
                  onClick={() => onEditStep(6)}
                  aria-label="Editar o que procura"
                >
                  Editar
                </button>
              )}
            </li>
          </ul>
        </div>

        <div className="checkbox-group">
          <input
            id="step7-lgpd"
            name="acceptedLgpd"
            type="checkbox"
            className="checkbox-input"
            checked={formData.acceptedLgpd}
            onChange={(event) => {
              onToggleLgpd(event.target.checked);
              if (formError !== null) setFormError(null);
            }}
          />
          <label className="checkbox-label" htmlFor="step7-lgpd">
            Li e concordo com os{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => handleToggleLegalPreview('terms')}
            >
              Termos de Uso
            </button>{' '}
            e a{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => handleToggleLegalPreview('privacy')}
            >
              Política de Privacidade e Segurança
            </button>
            .
          </label>
        </div>

        {activeLegalDoc !== null && (
          <div className="callout-legal" role="region" aria-live="polite">
            <p>{LEGAL_PREVIEWS[activeLegalDoc]}</p>
            <button
              type="button"
              className="btn-legal-close"
              onClick={() => setActiveLegalDoc(null)}
            >
              Fechar resumo
            </button>
          </div>
        )}

        {formError !== null && (
          <p className="form-error" role="alert">
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
