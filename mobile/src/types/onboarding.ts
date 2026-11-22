export type AppRoute =
  | 'splash'
  | 'login'
  | 'onboarding'
  | 'facialVerification'
  | 'home';

export type RelationshipGoal = 'amizade' | 'relacionamento' | 'companhia';

export type HobbyCategory =
  | 'Música e Dança'
  | 'Arte e Cultura'
  | 'Lazer e Bem-estar'
  | 'Gastronomia'
  | 'Viagens e Passeios'
  | 'Jogos e Convivência';

export interface OnboardingData {
  contact: string;
  fullName: string;
  birthDate: string; // DD/MM/AAAA
  city: string;
  profilePhotoUri: string | null;
  selectedHobbies: string[];
  goal: RelationshipGoal;
  password: string;
  acceptedTerms: boolean;
  isFaceVerified: boolean;
  verifiedSelfieUri: string | null;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  contact: '',
  fullName: '',
  birthDate: '',
  city: 'Aracaju, SE',
  profilePhotoUri: null,
  selectedHobbies: ['mpb', 'caminhada', 'forro'],
  goal: 'amizade',
  password: '',
  acceptedTerms: false,
  isFaceVerified: false,
  verifiedSelfieUri: null,
};
