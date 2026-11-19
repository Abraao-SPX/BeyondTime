import type { AuthSession, CityOption } from '../types/auth';
import { clearUserProfile } from './profileStorage';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const AUTH_SESSION_KEY = 'beyondtime_auth_session_v1';

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
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor BeyondTime. Verifique se o backend Java está rodando.',
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

export function saveAuthSession(session: AuthSession): void {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken || !parsed.userId || !parsed.email) return null;
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export interface RegisterPayload {
  email: string;
  phone?: string;
  password: string;
  birthDate: string; // YYYY-MM-DD
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthSession> {
  const session = await requestJson<AuthSession>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  saveAuthSession(session);
  return session;
}

export async function loginWithSocial(
  idToken: string,
  birthDate?: string
): Promise<AuthSession> {
  const session = await requestJson<AuthSession>('/api/v1/auth/social', {
    method: 'POST',
    body: JSON.stringify({
      idToken: idToken.trim(),
      birthDate: birthDate || null,
    }),
  });
  saveAuthSession(session);
  return session;
}

export async function registerAccount(
  payload: RegisterPayload
): Promise<AuthSession> {
  const session = await requestJson<AuthSession>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      phone: payload.phone?.trim() || null,
      password: payload.password,
      birthDate: payload.birthDate,
    }),
  });
  saveAuthSession(session);
  return session;
}

export async function requestPasswordReset(
  email: string
): Promise<{ message: string; expiresInSeconds: number; debugResetCode?: string }> {
  return requestJson('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<{ valid: boolean; message: string }> {
  return requestJson('/api/v1/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
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

export async function refreshSession(
  refreshToken: string
): Promise<AuthSession> {
  const session = await requestJson<AuthSession>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshToken.trim() }),
  });
  saveAuthSession(session);
  return session;
}

export async function logoutAccount(session: AuthSession | null): Promise<void> {
  try {
    if (session?.accessToken) {
      await requestJson<void>(
        '/api/v1/auth/logout',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        },
        session.accessToken
      );
    }
  } finally {
    clearAuthSession();
    clearUserProfile();
  }
}

export async function fetchSergipeCities(): Promise<CityOption[]> {
  return requestJson<CityOption[]>('/api/v1/locations/cities?uf=SE');
}

export interface HobbyCatalogItem {
  id: number;
  code: string;
  name: string;
  icon: string;
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

export async function fetchHobbiesCatalog(): Promise<HobbyCatalogItem[]> {
  return requestJson<HobbyCatalogItem[]>('/api/v1/hobbies');
}

export async function fetchMyProfile(
  session: AuthSession
): Promise<ServerProfile> {
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
