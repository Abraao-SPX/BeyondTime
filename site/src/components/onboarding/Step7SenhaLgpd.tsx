import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthSession, OnboardingFormData, SocialProvider } from '../../types/auth';
import {
  calculateAgeFromBirthDate,
  MIN_PASSWORD_LENGTH,
  validatePasswordMatch,
} from '../../utils/validation';
import { PasswordInput } from '../PasswordInput';
import { FacialVerificationQrModal } from '../wave2/FacialVerificationQrModal';

interface Step7SenhaLgpdProps {
  formData: OnboardingFormData;
  isCompleted: boolean;
  isSubmitting?: boolean;
  isSocialAccount?: boolean;
  isEditMode?: boolean;
  socialProvider?: SocialProvider | null;
  authSession?: AuthSession | null;
  isFaceVerified?: boolean;
  onFaceVerified?: () => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleLgpd: (accepted: boolean) => void;
  onComplete: () => void;
  onEditProfile: () => void;
  onFinishToLogin: () => void;
}

export function Step7SenhaLgpd({
  formData,
  isCompleted,
  isSubmitting = false,
  isSocialAccount = false,
  isEditMode = false,
  socialProvider = null,
  authSession = null,
  isFaceVerified = false,
  onFaceVerified,
  onPasswordChange,
  onConfirmPasswordChange,
  onToggleLgpd,
  onComplete,
  onEditProfile,
  onFinishToLogin,
}: Step7SenhaLgpdProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const hasAutoOpenedQrRef = useRef(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Abre automaticamente o QR Code obrigatório assim que o cadastro é salvo e o rosto ainda não foi verificado
  useEffect(() => {
    if (isCompleted && !isFaceVerified && !isEditMode && !hasAutoOpenedQrRef.current) {
      hasAutoOpenedQrRef.current = true;
      setShowQrModal(true);
    }
  }, [isCompleted, isFaceVerified, isEditMode]);

  const passwordsMatch =
    formData.password.length >= MIN_PASSWORD_LENGTH &&
    formData.password === formData.confirmPassword;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isEditMode && (!isSocialAccount || formData.password.length > 0 || formData.confirmPassword.length > 0)) {
      const passwordError = validatePasswordMatch(
        formData.password,
        formData.confirmPassword
      );
      if (passwordError !== null) {
        setFormError(passwordError);
        passwordInputRef.current?.focus();
        return;
      }
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

  if (isCompleted) {
    const calculatedAge = calculateAgeFromBirthDate(formData.birthDate);
    const canEnterWorkspace = isFaceVerified || isEditMode;
    const firstName = formData.fullName.trim().split(/\s+/)[0] || undefined;

    return (
      <div className="completion-summary" aria-live="polite">
        <p className="defensive-modal__badge">
          {canEnterWorkspace ? 'Selo de Verificado 50+ Ativo' : 'Etapa final obrigatória — RF-11'}
        </p>
        <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
          {canEnterWorkspace ? 'Perfil verificado com sucesso' : 'Conta criada! Confirme seu rosto'}
        </h1>
        <p className="auth-card__subtitle">
          {canEnterWorkspace
            ? 'Sua identidade foi confirmada e seus dados foram salvos. Você já pode acessar a página principal.'
            : 'Para entrar na página principal do BeyondTime, conclua a verificação facial pelo celular (código QR, sem precisar baixar aplicativo).'}
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
          {(calculatedAge !== null || formData.birthDate) && (
            <p>
              <strong>Idade:</strong>{' '}
              {calculatedAge !== null ? `${calculatedAge} anos` : formData.birthDate}
            </p>
          )}
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

        <div className="photo-verification-banner" style={{ margin: '20px 0' }}>
          <div className="photo-verification-banner__text">
            <strong>
              {isFaceVerified
                ? 'Selo de Verificado 50+ confirmado!'
                : 'Verificação facial obrigatória pelo celular (QR Code)'}
            </strong>
            <p>
              {isFaceVerified
                ? 'Reconhecimento facial e prova de vida aprovados. Seu acesso à página principal está liberado.'
                : 'Aponte a câmera do celular para o código QR e faça a prova de vida direto no navegador, sem instalar app.'}
            </p>
          </div>
          {!isFaceVerified && (
            <button
              type="button"
              className="btn btn--primary"
              style={{ minHeight: '48px' }}
              onClick={() => setShowQrModal(true)}
            >
              Verificar rosto agora (QR Code)
            </button>
          )}
        </div>

        <div className="action-stack action-stack--compact">
          <button
            type="button"
            className="btn btn--primary"
            style={{ minHeight: '52px' }}
            disabled={!canEnterWorkspace}
            onClick={onFinishToLogin}
          >
            {canEnterWorkspace
              ? 'Acessar meu painel'
              : 'Faça a verificação facial acima para entrar'}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ minHeight: '48px' }}
            onClick={onEditProfile}
          >
            Editar perfil
          </button>
        </div>

        {showQrModal && (
          <FacialVerificationQrModal
            authSession={authSession}
            firstName={firstName}
            onClose={() => setShowQrModal(false)}
            onVerified={(res) => {
              if (res.verifiedBadge50plus) {
                onFaceVerified?.();
                setShowQrModal(false);
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {isSocialAccount && socialProvider && (
        <p className="defensive-modal__badge" style={{ marginBottom: '8px' }}>
          Conectado via {socialProvider}
        </p>
      )}
      <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
        {isEditMode
          ? 'Revisar e salvar alterações'
          : isSocialAccount
            ? 'Conclua seu cadastro 50+'
            : 'Crie sua senha de acesso'}
      </h1>
      <p className="auth-card__subtitle">
        {isEditMode
          ? 'Confira o aceite de privacidade e clique abaixo para atualizar seu perfil, foto e hobbies no servidor.'
          : isSocialAccount
            ? 'Confirme o aceite dos termos para finalizar seu cadastro seguro no BeyondTime. A criação de senha local é opcional.'
            : 'Escolha uma senha segura para proteger sua conta.'}
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {!isEditMode && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="step7-password">
                {isSocialAccount ? 'Criar senha de acesso (opcional)' : 'Criar senha'}
              </label>
              <PasswordInput
                ref={passwordInputRef}
                id="step7-password"
                name="password"
                autoComplete="new-password"
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={(event) => {
                  onPasswordChange(event.target.value);
                  if (formError !== null) setFormError(null);
                }}
                aria-describedby="step7-password-help"
              />
              <p id="step7-password-help" className="form-helper">
                Mínimo de {MIN_PASSWORD_LENGTH} caracteres, com letra maiúscula, minúscula, número e caractere especial (ex.: . , @ ! #).
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="step7-confirm-password">
                Confirmar senha
              </label>
              <PasswordInput
                id="step7-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={(event) => {
                  onConfirmPasswordChange(event.target.value);
                  if (formError !== null) setFormError(null);
                }}
              />
              {passwordsMatch && (
                <p className="password-match" aria-live="polite">
                  As senhas coincidem
                </p>
              )}
            </div>
          </>
        )}

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
              Li e aceito os{' '}
              <a
                href="/termos"
                target="_blank"
                rel="noopener noreferrer"
                className="lgpd-inline-link"
                onClick={(event) => event.stopPropagation()}
              >
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="lgpd-inline-link"
                onClick={(event) => event.stopPropagation()}
              >
                Política de Privacidade e Segurança
              </a>{' '}
              do BeyondTime.
            </span>
          </label>
        </div>

        {formError !== null && (
          <p className="form-error form-error--block" role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting
            ? 'Salvando no servidor...'
            : isEditMode
              ? 'Salvar alterações do perfil'
              : 'Concluir cadastro'}
        </button>
      </form>
    </div>
  );
}
