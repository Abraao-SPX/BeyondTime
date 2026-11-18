import { useContactForm } from '../hooks/useContactForm';
import type { useOnboardingWizard } from '../hooks/useOnboardingWizard';
import type { AuthViewId, SocialProvider } from '../types/auth';
import { OnboardingStepHeader } from './onboarding/OnboardingStepHeader';
import { Step2DadosPessoais } from './onboarding/Step2DadosPessoais';
import { Step3Localizacao } from './onboarding/Step3Localizacao';
import { Step4FotoPerfil } from './onboarding/Step4FotoPerfil';
import { Step5Interesses } from './onboarding/Step5Interesses';
import { Step6Objetivo } from './onboarding/Step6Objetivo';
import { Step7SenhaLgpd } from './onboarding/Step7SenhaLgpd';
import { SocialAuthGrid } from './SocialAuthGrid';

type OnboardingWizardState = ReturnType<typeof useOnboardingWizard>;

interface CriarMinhaContaProps {
  wizard: OnboardingWizardState;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
}

export function CriarMinhaConta({
  wizard,
  onNavigate,
}: CriarMinhaContaProps) {
  const {
    step,
    formData,
    isCompleted,
    updateField,
    toggleHobby,
    goNext,
    goBack,
    completeOnboarding,
    startEditingProfile,
    resetWizard,
  } = wizard;

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
    contact: formData.contact,
    onContactChange: (value) => updateField('contact', value),
    successMessage: 'Contato validado. Avançando para o Passo 2 de 7.',
    submitDelayMs: 350,
    onValidSubmit: goNext,
  });

  function handleSocialSelect(provider: SocialProvider) {
    setFeedbackMessage(
      `Cadastro com ${provider} preparado para conexão segura via OAuth 2.0.`
    );
  }

  function handleFinishToLogin() {
    resetWizard();
    onNavigate('login', document.body);
  }

  return (
    <section id="view-register" className="auth-view" aria-labelledby="register-title">
      {!isCompleted && (
        <OnboardingStepHeader
          step={step}
          onBack={step > 1 ? goBack : undefined}
        />
      )}

      {step === 1 && (
        <div>
          <h1 id="register-title" ref={headingRef} tabIndex={-1} className="auth-card__title">
            Criar minha conta
          </h1>
          <p className="auth-card__subtitle">
            Entre ou cadastre-se para encontrar conexões reais e seguras.
          </p>

          <SocialAuthGrid onSelectProvider={handleSocialSelect} />

          <div className="auth-divider" aria-hidden="true">
            ou continue com e-mail
          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="form-group">
              <label className="form-label" htmlFor="register-contact">
                E-mail ou celular
              </label>
              <input
                ref={inputRef}
                id="register-contact"
                name="contact"
                type="text"
                className="form-input"
                autoComplete="username"
                placeholder="Digite seu e-mail ou celular"
                value={formData.contact}
                onChange={(event) => handleInputChange(event.target.value)}
                aria-invalid={errorMessage !== null ? 'true' : undefined}
                aria-describedby="register-contact-error"
              />
              {errorMessage !== null && (
                <p id="register-contact-error" className="form-error" role="alert">
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
              {isSubmitting ? 'Preparando próxima etapa...' : 'Continuar'}
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
        </div>
      )}

      {step === 2 && (
        <Step2DadosPessoais
          fullName={formData.fullName}
          birthDate={formData.birthDate}
          onFullNameChange={(value) => updateField('fullName', value)}
          onBirthDateChange={(value) => updateField('birthDate', value)}
          onNext={goNext}
        />
      )}

      {step === 3 && (
        <Step3Localizacao
          city={formData.city}
          onCityChange={(value) => updateField('city', value)}
          onNext={goNext}
        />
      )}

      {step === 4 && (
        <Step4FotoPerfil
          photoPreviewUrl={formData.photoPreviewUrl}
          photoFileName={formData.photoFileName}
          onPhotoSelect={(previewUrl, fileName) => {
            updateField('photoPreviewUrl', previewUrl);
            updateField('photoFileName', fileName);
          }}
          onNext={goNext}
        />
      )}

      {step === 5 && (
        <Step5Interesses
          selectedHobbies={formData.hobbies}
          onToggleHobby={toggleHobby}
          onNext={goNext}
        />
      )}

      {step === 6 && (
        <Step6Objetivo
          selectedGoal={formData.goal}
          onSelectGoal={(goal) => updateField('goal', goal)}
          onNext={goNext}
        />
      )}

      {step === 7 && (
        <Step7SenhaLgpd
          formData={formData}
          isCompleted={isCompleted}
          onPasswordChange={(value) => updateField('password', value)}
          onConfirmPasswordChange={(value) => updateField('confirmPassword', value)}
          onToggleLgpd={(accepted) => updateField('acceptedLgpd', accepted)}
          onComplete={completeOnboarding}
          onEditProfile={startEditingProfile}
          onFinishToLogin={handleFinishToLogin}
        />
      )}

      {!isCompleted && (
        <div className="card-footer-action">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={(event) => onNavigate('login', event.currentTarget)}
          >
            Já possui uma conta? <span className="underline-bold">Entrar</span>
          </button>
        </div>
      )}
    </section>
  );
}
