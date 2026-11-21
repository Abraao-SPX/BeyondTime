import type { ConnectionGoal } from '../types/auth';
import { MIN_ALLOWED_AGE, sanitizeTextInput } from '../utils/validation';

export const PROFILE_STORAGE_KEY = 'beyondtime_user_profile_v1';
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
export const AVATAR_PRE_RESIZE_PX = 600;
export const AVATAR_JPEG_QUALITY = 0.85;
export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export interface UserProfileData {
  userId?: string;
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

async function hasValidImageMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4) return false;

    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    return isJpeg || isPng || isWebp;
  } catch {
    return false;
  }
}

export async function validateAndReadPhotoFile(
  file: File
): Promise<{ dataUrl: string; fileName: string }> {
  const isAllowedMime = (ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(
    file.type
  );
  if (!isAllowedMime) {
    throw new Error('Formato não suportado. Escolha uma imagem JPEG, PNG ou WebP.');
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error('A imagem escolhida excede 5 MB. Selecione uma foto menor.');
  }

  const validMagicBytes = await hasValidImageMagicBytes(file);
  if (!validMagicBytes) {
    throw new Error('O conteúdo do arquivo não corresponde a uma imagem JPEG, PNG ou WebP válida.');
  }

  const safeFileName = sanitizeTextInput(file.name).slice(0, 80) || 'foto-perfil';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !isValidPhotoDataUrl(reader.result)) {
        reject(new Error('Não foi possível processar a imagem selecionada.'));
        return;
      }
      resolve({
        dataUrl: reader.result,
        fileName: safeFileName,
      });
    };
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo de imagem. Tente novamente.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Pré-reduz e recorta (1:1 centralizado em até 600x600 JPEG) a foto no navegador
 * antes do envio para o servidor Spring Boot (que padroniza em WebP 400x400).
 */
export async function resizeAndPrepareAvatarFile(
  file: File
): Promise<{ file: File; dataUrl: string; fileName: string }> {
  const { dataUrl, fileName } = await validateAndReadPhotoFile(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Falha ao decodificar imagem no navegador.'));
      image.src = dataUrl;
    });

    const sourceSize = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    if (sourceSize <= 0) {
      return { file, dataUrl, fileName };
    }

    const targetSize = Math.min(AVATAR_PRE_RESIZE_PX, sourceSize);
    const sx = Math.floor(((img.naturalWidth || img.width) - sourceSize) / 2);
    const sy = Math.floor(((img.naturalHeight || img.height) - sourceSize) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file, dataUrl, fileName };
    }

    ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, targetSize, targetSize);

    const resizedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', AVATAR_JPEG_QUALITY)
    );
    if (!resizedBlob) {
      return { file, dataUrl, fileName };
    }

    const resizedFile = new File([resizedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    const resizedPreview = canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY);
    return {
      file: resizedFile,
      dataUrl: resizedPreview,
      fileName,
    };
  } catch {
    return { file, dataUrl, fileName };
  }
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

  // SEC-MED-02: Hardening - Não persistir fotos em Base64 (até 2MB) no localStorage.
  // Fotos de perfil devem ser mantidas em memória da sessão React ou hidratadas via API/CDN.
  const sanitizedProfile: UserProfileData = {
    ...profile,
    contact: sanitizeTextInput(profile.contact),
    fullName: sanitizeTextInput(profile.fullName),
    city: sanitizeTextInput(profile.city),
    photoDataUrl: null,
    photoFileName: profile.photoFileName ? sanitizeTextInput(profile.photoFileName) : null,
    hobbies: profile.hobbies.map((h) => sanitizeTextInput(h)).filter((h) => h.length > 0),
  };

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(sanitizedProfile));
}

export function loadUserProfile(expectedUserId?: string): UserProfileData | null {
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
    if (expectedUserId && candidate.userId !== expectedUserId) {
      return null;
    }

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
      userId: typeof candidate.userId === 'string' ? sanitizeTextInput(candidate.userId) : undefined,
      contact: typeof candidate.contact === 'string' ? sanitizeTextInput(candidate.contact) : '',
      fullName: sanitizeTextInput(candidate.fullName),
      birthDate: sanitizeTextInput(candidate.birthDate),
      age: candidate.age,
      city: sanitizeTextInput(candidate.city),
      photoDataUrl: validPhotoUrl,
      photoFileName:
        typeof candidate.photoFileName === 'string'
          ? sanitizeTextInput(candidate.photoFileName)
          : null,
      hobbies: candidate.hobbies
        .filter((item): item is string => typeof item === 'string')
        .map((item) => sanitizeTextInput(item))
        .filter((item) => item.length > 0),
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
  // SEC-MED-02: Limpeza rígida em ambos os storages para evitar resíduos de sessão
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  window.sessionStorage.removeItem(PROFILE_STORAGE_KEY);
}
