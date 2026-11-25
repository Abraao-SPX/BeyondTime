/**
 * BeyondTime Mobile (React Native Expo — br.com.beyondtime)
 * Cliente REST de Autenticação JWT, Cadastro, Recuperação de Senha e Perfil (RF-01, RF-02, RF-03, RF-06)
 */

export interface SocialLoginRequest {
  idToken: string;
  birthDate?: string; // YYYY-MM-DD (RF02)
}

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  birthDate: string; // YYYY-MM-DD (RF02)
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

export interface ServerProfile {
  id: string;
  userId: string;
  fullName: string;
  firstName: string;
  bio: string | null;
  city: string;
  hobbies: string[];
  goal: string;
  avatarUrl?: string | null;
  verificationStatus: string;
  verifiedBadge50plus: boolean;
}

export interface UpsertProfilePayload {
  fullName: string;
  bio?: string | null;
  city: string;
  hobbies: string[];
  goal: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface ProblemDetailPayload {
  detail?: string;
  title?: string;
  code?: string;
  errors?: Record<string, string>;
}

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080'
).replace(/\/$/, '');

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as ProblemDetailPayload;
    const firstFieldMsg = data.errors ? Object.values(data.errors)[0] : undefined;
    const message =
      firstFieldMsg ||
      data.detail ||
      data.title ||
      `Erro HTTP ${response.status} ao comunicar com o servidor.`;
    return new ApiError(message, response.status, data.code, data.errors);
  } catch {
    return new ApiError(
      `Não foi possível processar a resposta do servidor (HTTP ${response.status}).`,
      response.status
    );
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor BeyondTime. Verifique sua conexão ou se o backend está ativo.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function convertBrDateToIso(brDate: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(brDate.trim());
  if (!match) return brDate.trim();
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthSession> {
  return requestJson<AuthSession>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });
}

export async function registerAccount(
  payload: RegisterRequest
): Promise<AuthSession> {
  return requestJson<AuthSession>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      phone: payload.phone?.trim() || null,
      password: payload.password,
      birthDate: payload.birthDate,
    }),
  });
}

export async function loginWithSocial(
  idToken: string,
  birthDate?: string
): Promise<AuthSession> {
  return requestJson<AuthSession>('/api/v1/auth/social', {
    method: 'POST',
    body: JSON.stringify({
      idToken: idToken.trim(),
      birthDate: birthDate || null,
    }),
  });
}

export async function requestPasswordReset(
  email: string
): Promise<{ message: string; expiresInSeconds: number; debugResetCode?: string }> {
  return requestJson('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  await requestJson<void>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      code: code.trim(),
      newPassword,
      confirmPassword,
    }),
  });
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  return requestJson<AuthSession>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshToken.trim() }),
  });
}

export async function logoutAccount(session: AuthSession | null): Promise<void> {
  if (!session?.accessToken) return;
  try {
    await requestJson<void>(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      },
      session.accessToken
    );
  } catch {
    // Mesmo em caso de falha de rede, o logout local limpa a sessão com segurança
  }
}

export async function fetchMyProfile(session: AuthSession): Promise<ServerProfile> {
  return requestJson<ServerProfile>('/api/v1/profiles/me', {}, session.accessToken);
}

export async function upsertMyProfile(
  session: AuthSession,
  payload: UpsertProfilePayload
): Promise<ServerProfile> {
  return requestJson<ServerProfile>(
    '/api/v1/profiles/me',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    session.accessToken
  );
}
