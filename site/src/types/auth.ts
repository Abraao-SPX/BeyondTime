export type AuthViewId = 'login' | 'register' | 'recover';

export type AppViewId = 'home' | AuthViewId;

export type SocialProvider = 'Google' | 'Facebook';

export type LegalDocKey = 'terms' | 'privacy';

export type LegalPageId = 'privacidade' | 'exclusao' | 'termos';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ConnectionGoal = 'Amizade' | 'Relacionamento' | 'Companhia';

export type HobbyCategory =
  | 'Música e Dança'
  | 'Arte e Cultura'
  | 'Lazer e Bem-estar'
  | 'Gastronomia'
  | 'Viagens e Passeios'
  | 'Jogos e Convivência';

export interface OnboardingFormData {
  contact: string;
  fullName: string;
  preferredName?: string;
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
  authProvider?: 'email' | 'google' | 'facebook' | 'social';
  rememberMe?: boolean;
}

export interface SocialOnboardingDraft {
  fullName?: string;
  birthDate?: string; // DD/MM/YYYY
  photoUrl?: string;
  provider?: SocialProvider;
}

export interface CityOption {
  id: number;
  name: string;
  isMetropolitanAracaju?: boolean;
}
