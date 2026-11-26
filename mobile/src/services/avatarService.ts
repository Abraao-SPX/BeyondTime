/**
 * BeyondTime Mobile (React Native Expo — br.com.beyondtime)
 * Seleção, pré-redução local (até 600px JPEG via expo-image-manipulator) e upload do avatar
 * para o Spring Boot, que valida o conteúdo real, recorta em 400x400 e converte para WebP (RF02).
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface AvatarUploadResponse {
  avatar: string;
  avatarUrl: string;
}

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
const AVATAR_UPLOAD_TIMEOUT_MS = 20000;

function resolveApiBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL;
  if (__DEV__) return 'http://localhost:8080';
  throw new Error('Endereço do servidor BeyondTime não configurado neste aplicativo.');
}

function inferMimeType(uri: string, explicitMimeType?: string): { mime: string; ext: string } {
  const lower = (explicitMimeType || uri).toLowerCase();
  if (lower.includes('png')) return { mime: 'image/png', ext: 'png' };
  if (lower.includes('webp')) return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

export async function uploadPreResizedAvatar(
  token: string,
  localImageUri: string,
  explicitMimeType?: string
): Promise<AvatarUploadResponse> {
  const baseUrl = resolveApiBaseUrl();
  let uploadUri = localImageUri;
  let mimeInfo = inferMimeType(localImageUri, explicitMimeType);
  let manipulatedTempUri: string | null = null;

  // Pré-redução real (<= 600px JPEG) removendo metadados pesados antes do upload (AUD-036)
  if (Platform.OS !== 'web') {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        localImageUri,
        [{ resize: { width: 600 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );
      uploadUri = manipulated.uri;
      manipulatedTempUri = manipulated.uri !== localImageUri ? manipulated.uri : null;
      mimeInfo = { mime: 'image/jpeg', ext: 'jpg' };
    } catch {
      // Se o manipulador falhar, envia o arquivo original com o MIME inferido
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AVATAR_UPLOAD_TIMEOUT_MS);

  try {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const blobRes = await fetch(uploadUri);
      const blob = await blobRes.blob();
      formData.append('file', blob, `avatar.${mimeInfo.ext}`);
    } else {
      formData.append('file', {
        uri: uploadUri,
        name: `avatar.${mimeInfo.ext}`,
        type: mimeInfo.mime,
      } as unknown as Blob);
    }

    const response = await fetch(`${baseUrl}/api/v1/profiles/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new Error(errorData.detail || 'Não foi possível enviar sua foto de perfil.');
    }

    const parsed = (await response.json()) as Partial<AvatarUploadResponse>;
    if (!parsed || typeof parsed.avatarUrl !== 'string') {
      throw new Error('Resposta inesperada ao salvar sua foto de perfil.');
    }
    return {
      avatar: parsed.avatar || '',
      avatarUrl: parsed.avatarUrl,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('O envio da foto demorou demais. Verifique sua internet e tente novamente.');
    }
    if (err instanceof Error && /Network request failed/i.test(err.message)) {
      throw new Error('Sem conexão com o servidor para enviar sua foto agora.');
    }
    throw err instanceof Error
      ? err
      : new Error('Não foi possível enviar sua foto de perfil agora.');
  } finally {
    clearTimeout(timeoutId);
    if (manipulatedTempUri) {
      void FileSystem.deleteAsync(manipulatedTempUri, { idempotent: true }).catch(() => undefined);
    }
  }
}
