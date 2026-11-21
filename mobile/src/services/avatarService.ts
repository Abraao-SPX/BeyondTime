/**
 * BeyondTime Mobile (React Native Expo — br.com.beyondtime)
 * Seleção, pré-redução local (600x600 JPEG) e upload do avatar para o Spring Boot,
 * que valida o conteúdo real, recorta em 400x400 e converte definitivamente para WebP (RF02).
 *
 * Dependências Expo esperadas quando habilitado no app mobile:
 *   npx expo install expo-image-picker expo-image-manipulator
 */

export interface AvatarUploadResponse {
  avatar: string;
  avatarUrl: string;
}

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(
  /\/$/,
  ''
);

export async function uploadPreResizedAvatar(
  token: string,
  localImageUri: string
): Promise<AvatarUploadResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri: localImageUri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  // Importante: NÃO definir 'Content-Type': 'multipart/form-data' manualmente no fetch,
  // deixando o React Native gerar o boundary corretamente.
  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/me/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Não foi possível enviar sua foto de perfil.');
  }

  return response.json();
}
