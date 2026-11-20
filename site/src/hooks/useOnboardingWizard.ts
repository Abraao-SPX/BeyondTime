import { useMemo, useState } from 'react';
import { MAX_HOBBIES_SELECTION } from '../data/hobbiesTaxonomy';
import {
  loadUserProfile,
  saveUserProfile,
} from '../services/profileStorage';
import type { OnboardingFormData, OnboardingStep } from '../types/auth';
import {
  calculateAgeFromBirthDate,
  MIN_ALLOWED_AGE,
} from '../utils/validation';

const EMPTY_FORM_DATA: OnboardingFormData = {
  contact: '',
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
};

function getInitialFormData(): OnboardingFormData {
  const saved = loadUserProfile();
  if (saved === null) {
    return EMPTY_FORM_DATA;
  }
  return {
    ...EMPTY_FORM_DATA,
    contact: saved.contact,
    fullName: saved.fullName,
    birthDate: saved.birthDate,
    city: saved.city,
    photoPreviewUrl: saved.photoDataUrl,
    photoFileName: saved.photoFileName,
    hobbies: saved.hobbies,
    goal: saved.goal,
  };
}

export function useOnboardingWizard() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [formData, setFormData] = useState<OnboardingFormData>(getInitialFormData);
  const [isCompleted, setIsCompleted] = useState(false);

  function updateField<K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toggleHobby(hobby: string) {
    setFormData((prev) => {
      const exists = prev.hobbies.includes(hobby);
      if (exists) {
        return {
          ...prev,
          hobbies: prev.hobbies.filter((item) => item !== hobby),
        };
      }
      if (prev.hobbies.length >= MAX_HOBBIES_SELECTION) {
        return prev;
      }
      return {
        ...prev,
        hobbies: [...prev.hobbies, hobby],
      };
    });
  }

  function goNext() {
    setStep((prev) => (prev < 7 ? ((prev + 1) as OnboardingStep) : prev));
  }

  function goBack() {
    setStep((prev) => (prev > 1 ? ((prev - 1) as OnboardingStep) : prev));
  }

  function completeOnboarding() {
    const calculatedAge = calculateAgeFromBirthDate(formData.birthDate);
    if (calculatedAge === null || calculatedAge < MIN_ALLOWED_AGE) {
      return;
    }

    saveUserProfile({
      contact: formData.contact.trim(),
      fullName: formData.fullName.trim(),
      birthDate: formData.birthDate.trim(),
      age: calculatedAge,
      city: formData.city,
      photoDataUrl: formData.photoPreviewUrl,
      photoFileName: formData.photoFileName,
      hobbies: formData.hobbies,
      goal: formData.goal,
      updatedAt: new Date().toISOString(),
    });
    setIsCompleted(true);
  }

  function startEditingProfile() {
    setIsCompleted(false);
    setStep(2);
  }

  function resetWizard() {
    setStep(1);
    setFormData(EMPTY_FORM_DATA);
    setIsCompleted(false);
  }

  const hasUnsavedChanges = useMemo(() => {
    if (isCompleted) {
      return false;
    }
    return (
      step > 1 ||
      formData.contact.trim().length > 0 ||
      formData.fullName.trim().length > 0 ||
      formData.birthDate.trim().length > 0 ||
      formData.photoPreviewUrl !== null ||
      formData.hobbies.length > 0 ||
      formData.password.length > 0 ||
      formData.confirmPassword.length > 0 ||
      formData.acceptedLgpd
    );
  }, [formData, isCompleted, step]);

  return {
    step,
    formData,
    isCompleted,
    hasUnsavedChanges,
    updateField,
    toggleHobby,
    goNext,
    goBack,
    completeOnboarding,
    startEditingProfile,
    resetWizard,
  };
}
