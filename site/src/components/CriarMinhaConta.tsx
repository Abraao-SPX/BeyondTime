import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, registerAccount, upsertMyProfile } from '../services/apiClient';
import { saveUserProfile } from '../services/profileStorage';
import type {
  AuthSession,
  AuthViewId,
  OnboardingFormData,
  OnboardingStep,
  SocialProvider,
} from '../types/auth';
import { calculateAgeFromBirthDate } from '../utils/validation';
import { OnboardingStepHeader } from './onboarding/OnboardingStepHeader';
import { Step2DadosPessoais } from './onboarding/Step2DadosPessoais';
import { Step3Localizacao } from './onboarding/Step3Localizacao';
import { Step4FotoPerfil } from './onboarding/Step4FotoPerfil';
import { Step5Hobbies } from './onboarding/Step5Hobbies';
import { Step6Objetivo } from './onboarding/Step6Objetivo';
import { Step7SenhaLgpd } from './onboarding/Step7SenhaLgpd';
import { SocialAuthGrid } from './SocialAuthGrid';

interface CriarMinhaContaProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
  onAuthSuccess: (session: AuthSession) => void;
}

function toIsoBirthDate(brDate: string): string {
  const [day, month, year] = brDate.trim().split('/');
  return `${year}-${month}-${day}`;
}

export function CriarMinhaConta({
  contact,
  onContactChange,
  onNavigate,
  onAuthSuccess,
}: CriarMinhaContaProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<AuthSession | null>(null);

  const [formData, setFormData] = useState<OnboardingFormData>({
    contact,
    fullName: '',
    birthDate: '',
    city: 'Aracaju (SE)',
    photoPreviewUrl: null,
    photoFileName: null,
    hobbies: [],
    goal: 'Amizade',
    password: '',
    confirmPassword: '',
    acceptedLgpd: false,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  function handleSocialSelect(provider: SocialProvider) {
    setFeedbackMessage(
      `Cadastro com ${provider} preparado para conexão segura via OAuth 2.0.`
    );
  }

  function handleStep1Submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = contact.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setStep1Error('Informe um endereço de e-mail válido para criar sua conta.');
      inputRef.current?.focus();
      return;
    }
    setStep1Error(null);
    setFormData((prev) => ({ ...prev, contact: trimmed }));
    setStep(2);
  }

  function handleToggleHobby(hobby: string) {
    setFormData((prev) => {
      const exists = prev.hobbies.includes(hobby);
      return {
        ...prev,
        hobbies: exists
          ? prev.hobbies.filter((h) => h !== hobby)
          : [...prev.hobbies, hobby],
      };
    });
  }

  async function handleCompleteOnboarding() {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const isoBirthDate = toIsoBirthDate(formData.birthDate);
      let session = createdSession;
      if (!session) {
        session = await registerAccount({
          email: contact.trim(),
          password: formData.password,
          birthDate: isoBirthDate,
        });
        setCreatedSession(session);
      }

      await upsertMyProfile(session, {
        fullName: formData.fullName.trim(),
        city: formData.city,
        hobbies: formData.hobbies,
        goal: formData.goal,
      });

      const age = calculateAgeFromBirthDate(formData.birthDate) ?? 50;
      saveUserProfile({
        userId: session.userId,
        contact: contact.trim(),
        fullName: formData.fullName.trim(),
        birthDate: formData.birthDate,
        age,
        city: formData.city,
        photoDataUrl: formData.photoPreviewUrl,
        photoFileName: formData.photoFileName,
        hobbies: formData.hobbies,
        goal: formData.goal,
        updatedAt: new Date().toISOString(),
      });

      setIsCompleted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Não foi possível concluir seu cadastro no servidor. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    if (step > 1 && !isCompleted) {
      setStep((prev) => (prev - 1) as OnboardingStep);
    }
  }

  return (
    <section id="view-register" className="auth-view" aria-labelledby="register-title">
      <OnboardingStepHeader
        step={step}
        onBack={step > 1 && !isCompleted ? handleBack : undefined}
      />

      {step === 1 && (
        <>
          <h1 id="register-title" tabIndex={-1} className="auth-card__title">
            Criar minha conta
          </h1>
          <p className="auth-card__subtitle">
            Entre ou cadastre-se para encontrar conexões reais e seguras.
          </p>

          <SocialAuthGrid onSelectProvider={handleSocialSelect} />

          <div className="auth-divider" aria-hidden="true">
            ou continue com e-mail
          </div>

          <form className="auth-form" onSubmit={handleStep1Submit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="register-contact">
                E-mail
              </label>
              <input
                ref={inputRef}
                id="register-contact"
                name="contact"
                type="email"
                className="form-input"
                autoComplete="email"
                placeholder="Digite seu e-mail"
                value={contact}
                onChange={(event) => {
                  onContactChange(event.target.value);
                  if (step1Error) setStep1Error(null);
                }}
                aria-invalid={step1Error !== null ? 'true' : undefined}
              />
              {step1Error !== null && (
                <p className="form-error" role="alert">
                  {step1Error}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn--primary">
              Continuar
            </button>
          </form>

          {feedbackMessage !== null && (
            <p className="form-feedback" aria-live="polite">
              {feedbackMessage}
            </p>
          )}

          <div className="card-footer-action">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={(event) => onNavigate('login', event.currentTarget)}
            >
              Já possui uma conta? <span className="underline-bold">Entrar</span>
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <Step2DadosPessoais
          fullName={formData.fullName}
          birthDate={formData.birthDate}
          onFullNameChange={(value) => setFormData((prev) => ({ ...prev, fullName: value }))}
          onBirthDateChange={(value) => setFormData((prev) => ({ ...prev, birthDate: value }))}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3Localizacao
          city={formData.city}
          onCityChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <Step4FotoPerfil
          photoPreviewUrl={formData.photoPreviewUrl}
          photoFileName={formData.photoFileName}
          onPhotoSelect={(previewUrl, fileName) =>
            setFormData((prev) => ({
              ...prev,
              photoPreviewUrl: previewUrl,
              photoFileName: fileName,
            }))
          }
          onNext={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <Step5Hobbies
          selectedHobbies={formData.hobbies}
          onToggleHobby={handleToggleHobby}
          onNext={() => setStep(6)}
        />
      )}

      {step === 6 && (
        <Step6Objetivo
          selectedGoal={formData.goal}
          onSelectGoal={(goal) => setFormData((prev) => ({ ...prev, goal }))}
          onNext={() => setStep(7)}
        />
      )}

      {step === 7 && (
        <>
          <Step7SenhaLgpd
            formData={formData}
            isCompleted={isCompleted}
            isSubmitting={isSubmitting}
            onPasswordChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            onConfirmPasswordChange={(value) =>
              setFormData((prev) => ({ ...prev, confirmPassword: value }))
            }
            onToggleLgpd={(accepted) =>
              setFormData((prev) => ({ ...prev, acceptedLgpd: accepted }))
            }
            onComplete={handleCompleteOnboarding}
            onEditProfile={() => {
              setIsCompleted(false);
              setStep(2);
            }}
            onFinishToLogin={() => {
              if (createdSession) {
                onAuthSuccess(createdSession);
              }
            }}
          />
          {isSubmitting && (
            <p className="form-feedback" aria-live="polite">
              Registrando sua conta com segurança no servidor...
            </p>
          )}
          {submitError !== null && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}
        </>
      )}
    </section>
  );
}
