import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ApiError,
  loginWithSocial,
  registerAccount,
  resolveApiAssetUrl,
  uploadMyAvatar,
  upsertMyProfile,
  type ServerProfile,
} from '../services/apiClient';
import {
  authenticateWithFirebasePopup,
  getFreshFirebaseIdToken,
  signOutFirebaseSilently,
} from '../services/firebaseClient';
import { saveUserProfile } from '../services/profileStorage';
import type {
  AuthSession,
  AuthViewId,
  ConnectionGoal,
  OnboardingFormData,
  OnboardingStep,
  SocialOnboardingDraft,
  SocialProvider,
} from '../types/auth';
import {
  calculateAgeFromBirthDate,
  containsDangerousXss,
  sanitizeTextInput,
} from '../utils/validation';
import { HOBBIES_CATALOG } from '../data/hobbiesTaxonomy';
import { OnboardingStepHeader } from './onboarding/OnboardingStepHeader';
import { Step2DadosPessoais } from './onboarding/Step2DadosPessoais';
import { Step3Localizacao } from './onboarding/Step3Localizacao';
import { Step4FotoPerfil } from './onboarding/Step4FotoPerfil';
import { Step5Interesses } from './onboarding/Step5Interesses';
import { Step6Objetivo } from './onboarding/Step6Objetivo';
import { Step7SenhaLgpd } from './onboarding/Step7SenhaLgpd';
import { SocialAuthGrid } from './SocialAuthGrid';

interface CriarMinhaContaProps {
  contact: string;
  onContactChange: (value: string) => void;
  onNavigate: (targetView: AuthViewId, triggerEl: HTMLElement) => void;
  onAuthSuccess: (session: AuthSession) => void;
  existingSession?: AuthSession | null;
  orphanNotice?: string | null;
  socialDraft?: SocialOnboardingDraft | null;
  initialProfile?: ServerProfile | null;
  isEditMode?: boolean;
  onProfileSaved?: (profile: ServerProfile) => void;
  onCancelEdit?: () => void;
}

function toIsoBirthDate(brDate: string): string {
  const [day, month, year] = brDate.trim().split('/');
  return `${year}-${month}-${day}`;
}

function normalizeGoal(goal?: string | null): ConnectionGoal {
  if (goal === 'Relacionamento' || goal === 'Companhia' || goal === 'Amizade') {
    return goal;
  }
  return 'Amizade';
}

function normalizeHobbyKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mapServerHobbiesToLabels(serverHobbies?: string[] | null): string[] {
  if (!serverHobbies || serverHobbies.length === 0) return [];
  const mapped: string[] = [];
  for (const raw of serverHobbies) {
    const key = normalizeHobbyKey(raw);
    const match = HOBBIES_CATALOG.find(
      (item) =>
        normalizeHobbyKey(item.label) === key ||
        normalizeHobbyKey(item.slug) === key ||
        normalizeHobbyKey(item.id) === key ||
        key.includes(normalizeHobbyKey(item.label))
    );
    const label = match ? match.label : raw;
    if (!mapped.includes(label)) {
      mapped.push(label);
    }
  }
  return mapped;
}

function mapSelectedHobbiesForApi(selectedLabels: string[]): string[] {
  return selectedLabels
    .map((label) => {
      const sanitized = sanitizeTextInput(label);
      const match = HOBBIES_CATALOG.find(
        (item) => normalizeHobbyKey(item.label) === normalizeHobbyKey(sanitized)
      );
      return match ? match.slug : sanitized;
    })
    .filter((h) => h.length > 0);
}

export function CriarMinhaConta({
  contact,
  onContactChange,
  onNavigate,
  onAuthSuccess,
  existingSession = null,
  orphanNotice = null,
  socialDraft = null,
  initialProfile = null,
  isEditMode = false,
  onProfileSaved,
  onCancelEdit,
}: CriarMinhaContaProps) {
  // SEC-ALTA-08: Se o usuário já estiver autenticado (recuperação de perfil órfão 404 ou edição),
  // inicia diretamente na etapa 2 (Dados Pessoais) sem forçar re-registro
  const [step, setStep] = useState<OnboardingStep>(() => (existingSession ? 2 : 1));
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(orphanNotice);
  const [createdSession, setCreatedSession] = useState<AuthSession | null>(existingSession);
  const [socialIdToken, setSocialIdToken] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(() => {
    if (socialDraft?.provider) return socialDraft.provider;
    if (existingSession?.authProvider === 'google') return 'Google';
    if (existingSession?.authProvider === 'facebook') return 'Facebook';
    return null;
  });

  const [formData, setFormData] = useState<OnboardingFormData>({
    contact: existingSession?.email || contact,
    fullName: initialProfile?.fullName || socialDraft?.fullName || '',
    birthDate: socialDraft?.birthDate || '',
    city: initialProfile?.city || 'Aracaju (SE)',
    photoPreviewUrl:
      resolveApiAssetUrl(initialProfile?.avatarUrl) || socialDraft?.photoUrl || null,
    photoFileName: null,
    hobbies: mapServerHobbiesToLabels(initialProfile?.hobbies),
    goal: normalizeGoal(initialProfile?.goal),
    password: '',
    confirmPassword: '',
    acceptedLgpd: Boolean(existingSession),
  });

  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSocialSelect(provider: SocialProvider) {
    setStep1Error(null);
    setFeedbackMessage(`Conectando com ${provider}...`);
    setIsSubmitting(true);

    try {
      const authResult = await authenticateWithFirebasePopup(provider);
      setSocialIdToken(authResult.idToken);
      setSocialProvider(provider);

      if (authResult.email) {
        onContactChange(authResult.email);
      }

      setFormData((prev) => ({
        ...prev,
        contact: authResult.email || prev.contact,
        fullName: authResult.fullName || prev.fullName,
        photoPreviewUrl: authResult.photoUrl || prev.photoPreviewUrl,
      }));

      setFeedbackMessage(
        `Conta ${provider} conectada com sucesso! Prossiga com seus dados e data de nascimento.`
      );
      setStep(2);
    } catch (err: any) {
      setStep1Error(err?.message || `Erro ao conectar com ${provider}. Tente novamente.`);
      setFeedbackMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStep1Submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (containsDangerousXss(contact)) {
      setStep1Error('Scripts ou tags HTML não são permitidos no campo de e-mail.');
      inputRef.current?.focus();
      return;
    }
    const trimmed = sanitizeTextInput(contact);
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
        if (socialIdToken) {
          const freshToken = await getFreshFirebaseIdToken(socialIdToken);
          session = await loginWithSocial(freshToken, isoBirthDate, socialProvider || undefined);
          await signOutFirebaseSilently();
        } else {
          session = await registerAccount({
            email: (formData.contact || contact).trim(),
            password: formData.password,
            birthDate: isoBirthDate,
          });
        }
        setCreatedSession(session);
      }

      const sanitizedFullName = sanitizeTextInput(formData.fullName);
      const sanitizedCity = sanitizeTextInput(formData.city);
      const sanitizedHobbies = formData.hobbies
        .map((h) => sanitizeTextInput(h))
        .filter((h) => h.length > 0);
      const apiHobbies = mapSelectedHobbiesForApi(sanitizedHobbies);
      const sanitizedGoal = sanitizeTextInput(formData.goal) as typeof formData.goal;

      const savedServerProfile = await upsertMyProfile(session, {
        fullName: sanitizedFullName,
        city: sanitizedCity,
        hobbies: apiHobbies,
        goal: sanitizedGoal,
      });

      let finalServerProfile: ServerProfile = savedServerProfile;
      if (photoFile !== null) {
        const uploaded = await uploadMyAvatar(session, photoFile);
        finalServerProfile = {
          ...savedServerProfile,
          avatarUrl: uploaded.avatarUrl,
        };
        setFormData((prev) => ({
          ...prev,
          photoPreviewUrl: resolveApiAssetUrl(uploaded.avatarUrl) || prev.photoPreviewUrl,
        }));
      }

      onProfileSaved?.(finalServerProfile);

      const age = calculateAgeFromBirthDate(formData.birthDate) ?? 50;
      saveUserProfile({
        userId: session.userId,
        contact: sanitizeTextInput(formData.contact || contact),
        fullName: sanitizedFullName,
        birthDate: formData.birthDate,
        age,
        city: sanitizedCity,
        photoDataUrl: null,
        photoFileName: formData.photoFileName ? sanitizeTextInput(formData.photoFileName) : null,
        hobbies: sanitizedHobbies,
        goal: sanitizedGoal,
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
    if (isEditMode && step === 2 && !isCompleted && onCancelEdit) {
      onCancelEdit();
      return;
    }
    const minStep: OnboardingStep = existingSession ? 2 : 1;
    if (step > minStep && !isCompleted) {
      setStep((prev) => (prev - 1) as OnboardingStep);
    }
  }

  const canGoBack = !isCompleted && (isEditMode ? step >= 2 : step > (existingSession ? 2 : 1));

  return (
    <section id="view-register" className="auth-view" aria-labelledby="register-title">
      <OnboardingStepHeader
        step={step}
        onBack={canGoBack ? handleBack : undefined}
      />

      {feedbackMessage !== null && step > 1 && (
        <div className="callout-amber" role="status" style={{ marginBottom: '16px' }}>
          {feedbackMessage}
        </div>
      )}

      {step === 1 && (
        <>
          <h1 id="register-title" tabIndex={-1} className="auth-card__title">
            Criar minha conta
          </h1>
          <p className="auth-card__subtitle">
            Entre ou cadastre-se para encontrar conexões reais e seguras.
          </p>

          <SocialAuthGrid onSelectProvider={handleSocialSelect} disabled={isSubmitting} />

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
          birthDateAlreadyVerified={Boolean(existingSession)}
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
          onPhotoSelect={(previewUrl, fileName, file) => {
            setPhotoFile(file);
            setFormData((prev) => ({
              ...prev,
              photoPreviewUrl: previewUrl,
              photoFileName: fileName,
            }));
          }}
          onNext={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <Step5Interesses
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
            isSocialAccount={Boolean(socialIdToken) || Boolean(existingSession)}
            isEditMode={isEditMode}
            socialProvider={socialProvider}
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
              const finalSession = createdSession || existingSession;
              if (finalSession) {
                onAuthSuccess({ ...finalSession });
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
