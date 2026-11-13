import type { ConnectionGoal } from '../types/auth';
import { MIN_ALLOWED_AGE } from '../utils/validation';

export const PROFILE_STORAGE_KEY = 'beyondtime_user_profile_v1';
export const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export interface UserProfileData {
  contact: string;
  fullName: string;
  birthDate: string;
  age: number;
  city: string;
  photoDataUrl: string | null;
  photoFileName: string | null;
  hobbies: string[];
  goal: ConnectionGoal;
  updatedAt: string;
}

function isValidPhotoDataUrl(dataUrl: string): boolean {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl);
}

export function validateAndReadPhotoFile(
  file: File
): Promise<{ dataUrl: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const isAllowedMime = (ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(
      file.type
    );
    if (!isAllowedMime) {
      reject(
        new Error('Formato não suportado. Escolha uma imagem JPEG, PNG ou WebP.')
      );
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      reject(
        new Error('A imagem escolhida excede 2 MB. Selecione uma foto menor.')
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !isValidPhotoDataUrl(reader.result)) {
        reject(new Error('Não foi possível processar a imagem selecionada.'));
        return;
      }
      resolve({
        dataUrl: reader.result,
        fileName: file.name,
      });
    };
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo de imagem. Tente novamente.'));
    };
    reader.readAsDataURL(file);
  });
}

export function saveUserProfile(profile: UserProfileData): void {
  if (profile.age < MIN_ALLOWED_AGE) {
    throw new Error('Perfil não atende ao requisito mínimo de idade (50+).');
  }

  if (
    profile.photoDataUrl !== null &&
    !isValidPhotoDataUrl(profile.photoDataUrl)
  ) {
    throw new Error('Formato de foto inválido para persistência.');
  }

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function loadUserProfile(): UserProfileData | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const candidate = parsed as Partial<UserProfileData>;
    if (
      typeof candidate.fullName !== 'string' ||
      typeof candidate.birthDate !== 'string' ||
      typeof candidate.age !== 'number' ||
      candidate.age < MIN_ALLOWED_AGE ||
      typeof candidate.city !== 'string' ||
      !Array.isArray(candidate.hobbies)
    ) {
      return null;
    }

    const validPhotoUrl =
      typeof candidate.photoDataUrl === 'string' &&
      isValidPhotoDataUrl(candidate.photoDataUrl)
        ? candidate.photoDataUrl
        : null;

    return {
      contact: typeof candidate.contact === 'string' ? candidate.contact : '',
      fullName: candidate.fullName,
      birthDate: candidate.birthDate,
      age: candidate.age,
      city: candidate.city,
      photoDataUrl: validPhotoUrl,
      photoFileName:
        typeof candidate.photoFileName === 'string'
          ? candidate.photoFileName
          : null,
      hobbies: candidate.hobbies.filter(
        (item): item is string => typeof item === 'string'
      ),
      goal:
        candidate.goal === 'Amizade' ||
        candidate.goal === 'Relacionamento' ||
        candidate.goal === 'Companhia'
          ? candidate.goal
          : 'Amizade',
      updatedAt:
        typeof candidate.updatedAt === 'string'
          ? candidate.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearUserProfile(): void {
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
}
