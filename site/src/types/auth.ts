export type AuthViewId = 'login' | 'register' | 'recover';

export type SocialProvider = 'Google' | 'Facebook';

export type LegalDocKey = 'terms' | 'privacy';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ConnectionGoal = 'Amizade' | 'Relacionamento' | 'Companhia';

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

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: string;
  email: string;
  role: string;
}

export interface CityOption {
  id: number;
  name: string;
  isMetropolitanAracaju?: boolean;
}
