export type AuthViewId = 'login' | 'register' | 'recover';

export type SocialProvider = 'Google' | 'Facebook';

export type LegalDocKey = 'terms' | 'privacy';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ConnectionGoal = 'Amizade' | 'Relacionamento' | 'Companhia';

export type HobbyCategory =
  | 'Arte e Cultura'
  | 'Lazer e Bem-estar'
  | 'Gastronomia'
  | 'Viagens e Comunidade';

export interface OnboardingFormData {
  contact: string;
  fullName: string;
  birthDate: string;
  city: string;
  photoPreviewUrl: string | null;
  photoFileName: string | null;
  hobbies: string[];
  goal: ConnectionGoal;
  password: string;
  confirmPassword: string;
  acceptedLgpd: boolean;
}
