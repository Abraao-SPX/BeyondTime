/**
 * BeyondTime Mobile (React Native Expo — br.com.beyondtime)
 * Cliente de Autenticação Social OAuth2 / Firebase JWT (RF01, RF02, RF06)
 */

export interface SocialLoginRequest {
  idToken: string;
  birthDate?: string; // YYYY-MM-DD (RF02)
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function loginWithSocial(idToken: string, birthDate?: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/social`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      idToken: idToken.trim(),
      birthDate: birthDate || null,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.detail || 'Falha ao autenticar com provedor social.');
    err.status = response.status;
    err.code = errorData.code;
    throw err;
  }

  return response.json();
}
