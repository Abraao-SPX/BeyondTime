import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type UserCredential,
} from 'firebase/auth';

export type SocialAuthView = 'login' | 'register';

export interface FirebaseSocialAuthResult {
  idToken: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  provider: 'Google' | 'Facebook';
}

export interface PendingSocialRedirectContext {
  provider: 'Google' | 'Facebook';
  sourceView: SocialAuthView;
  startedAt: number;
}

export type FirebaseRedirectOutcome =
  | {
      status: 'success';
      result: FirebaseSocialAuthResult;
      sourceView: SocialAuthView;
    }
  | {
      status: 'error';
      message: string;
      provider: 'Google' | 'Facebook';
      sourceView: SocialAuthView;
    };

const REDIRECT_CONTEXT_STORAGE_KEY = 'beyondtime.firebase.socialRedirectContext';
const REDIRECT_CONTEXT_MAX_AGE_MS = 10 * 60 * 1000;

export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent || '';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
    return true;
  }
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return hasCoarsePointer && window.innerWidth <= 900;
}

function savePendingRedirectContext(context: PendingSocialRedirectContext): void {
  try {
    window.sessionStorage.setItem(REDIRECT_CONTEXT_STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Ignora caso o navegador bloqueie sessionStorage
  }
}

export function peekPendingSocialRedirectContext(): PendingSocialRedirectContext | null {
  try {
    const raw = window.sessionStorage.getItem(REDIRECT_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSocialRedirectContext>;
    if (
      (parsed.provider !== 'Google' && parsed.provider !== 'Facebook') ||
      (parsed.sourceView !== 'login' && parsed.sourceView !== 'register') ||
      typeof parsed.startedAt !== 'number'
    ) {
      window.sessionStorage.removeItem(REDIRECT_CONTEXT_STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.startedAt > REDIRECT_CONTEXT_MAX_AGE_MS) {
      window.sessionStorage.removeItem(REDIRECT_CONTEXT_STORAGE_KEY);
      return null;
    }
    return {
      provider: parsed.provider,
      sourceView: parsed.sourceView,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

function clearPendingRedirectContext(): void {
  try {
    window.sessionStorage.removeItem(REDIRECT_CONTEXT_STORAGE_KEY);
  } catch {
    // Ignora
  }
}

function isFirebaseConfigured(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  return Boolean(apiKey && projectId);
}

function getFirebaseAuth(): Auth {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();

  if (!apiKey || !projectId) {
    throw new Error(
      'O acesso com conta social não está disponível no momento. Você pode entrar usando seu e-mail e senha.'
    );
  }

  const firebaseConfig = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || `${projectId}.firebasestorage.app`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  };

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
}

function createSocialProvider(
  providerName: 'Google' | 'Facebook',
  mode: 'popup' | 'redirect'
): GoogleAuthProvider | FacebookAuthProvider {
  if (providerName === 'Google') {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    return provider;
  }

  const provider = new FacebookAuthProvider();
  provider.addScope('email');
  provider.addScope('public_profile');
  provider.setCustomParameters({
    display: mode === 'redirect' ? 'page' : 'popup',
  });
  return provider;
}

function mapFirebaseAuthError(error: unknown, providerName: 'Google' | 'Facebook'): string {
  const err = error as { code?: string; message?: string } | undefined;
  if (err?.code === 'auth/popup-closed-by-user') {
    return 'A janela de login social foi fechada antes de concluir a autenticação.';
  }
  if (err?.code === 'auth/cancelled-popup-request') {
    return 'Operação de login cancelada.';
  }
  if (err?.code === 'auth/popup-blocked') {
    return 'A janela pop-up foi bloqueada pelo navegador. Permita pop-ups para entrar.';
  }
  if (err?.code === 'auth/account-exists-with-different-credential') {
    return 'Já existe uma conta cadastrada com este e-mail através de outro método de acesso.';
  }
  if (err?.code === 'auth/unauthorized-domain') {
    return `O domínio atual não está autorizado para login com ${providerName}. Entre com e-mail e senha ou tente em bytime.me.`;
  }
  if (err?.code === 'auth/network-request-failed') {
    return 'Sem conexão estável para falar com o provedor de login. Verifique sua internet e tente novamente.';
  }
  const message = error instanceof Error ? error.message : err?.message;
  return message || `Não foi possível entrar com ${providerName} agora. Tente novamente.`;
}

async function buildResultFromCredential(
  userCredential: UserCredential,
  providerName: 'Google' | 'Facebook'
): Promise<FirebaseSocialAuthResult> {
  const idToken = await userCredential.user.getIdToken();
  return {
    idToken,
    email: userCredential.user.email || '',
    fullName: userCredential.user.displayName || '',
    photoUrl: userCredential.user.photoURL || null,
    provider: providerName,
  };
}

/**
 * Autentica via Firebase Auth adaptando automaticamente o fluxo:
 * - Navegadores mobile: usa signInWithRedirect (evita bloqueio de popup e perda de contexto quando o app do Facebook abre).
 * - Desktop: usa signInWithPopup, com fallback automático para signInWithRedirect se o popup for bloqueado.
 * Retorna `null` quando iniciou um redirecionamento de página inteira.
 */
export async function authenticateWithFirebaseSocial(
  providerName: 'Google' | 'Facebook',
  sourceView: SocialAuthView
): Promise<FirebaseSocialAuthResult | null> {
  const auth = getFirebaseAuth();

  if (isMobileBrowser()) {
    savePendingRedirectContext({
      provider: providerName,
      sourceView,
      startedAt: Date.now(),
    });
    const redirectProvider = createSocialProvider(providerName, 'redirect');
    await signInWithRedirect(auth, redirectProvider);
    return null;
  }

  const popupProvider = createSocialProvider(providerName, 'popup');
  try {
    const userCredential = await signInWithPopup(auth, popupProvider);
    return await buildResultFromCredential(userCredential, providerName);
  } catch (error: unknown) {
    const err = error as { code?: string } | undefined;
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      savePendingRedirectContext({
        provider: providerName,
        sourceView,
        startedAt: Date.now(),
      });
      const redirectProvider = createSocialProvider(providerName, 'redirect');
      await signInWithRedirect(auth, redirectProvider);
      return null;
    }
    throw new Error(mapFirebaseAuthError(error, providerName));
  }
}

export async function authenticateWithFirebasePopup(
  providerName: 'Google' | 'Facebook'
): Promise<FirebaseSocialAuthResult> {
  const result = await authenticateWithFirebaseSocial(providerName, 'login');
  if (!result) {
    throw new Error('Redirecionando para concluir a autenticação...');
  }
  return result;
}

/**
 * Verifica ao carregar a página se o usuário retornou de um `signInWithRedirect` (mobile/fallback).
 */
export async function consumeFirebaseRedirectResult(): Promise<FirebaseRedirectOutcome | null> {
  const pendingContext = peekPendingSocialRedirectContext();
  if (!isFirebaseConfigured()) {
    clearPendingRedirectContext();
    return null;
  }

  // Só consulta getRedirectResult se houver contexto pendente ou retorno OAuth na URL
  if (!pendingContext) {
    return null;
  }

  try {
    const auth = getFirebaseAuth();
    const userCredential = await getRedirectResult(auth);
    clearPendingRedirectContext();

    if (!userCredential) {
      return {
        status: 'error',
        provider: pendingContext.provider,
        sourceView: pendingContext.sourceView,
        message:
          pendingContext.provider === 'Facebook'
            ? 'O login com Facebook não foi concluído no navegador do celular. Se o aplicativo do Facebook abriu sozinho ou o navegador bloqueou cookies de terceiros, tente novamente ou entre com Google / e-mail e senha.'
            : `O login com ${pendingContext.provider} foi cancelado ou não pôde ser concluído neste navegador. Tente novamente ou use e-mail e senha.`,
      };
    }

    const inferredProvider: 'Google' | 'Facebook' =
      userCredential.providerId === 'facebook.com'
        ? 'Facebook'
        : userCredential.providerId === 'google.com'
          ? 'Google'
          : pendingContext.provider;

    const result = await buildResultFromCredential(userCredential, inferredProvider);
    return {
      status: 'success',
      result,
      sourceView: pendingContext.sourceView,
    };
  } catch (error: unknown) {
    clearPendingRedirectContext();
    return {
      status: 'error',
      provider: pendingContext.provider,
      sourceView: pendingContext.sourceView,
      message: mapFirebaseAuthError(error, pendingContext.provider),
    };
  }
}

export async function getFreshFirebaseIdToken(fallbackToken: string): Promise<string> {
  try {
    if (getApps().length === 0) {
      return fallbackToken;
    }
    const currentUser = getAuth(getApp()).currentUser;
    if (!currentUser) {
      return fallbackToken;
    }
    return await currentUser.getIdToken(true);
  } catch {
    return fallbackToken;
  }
}

export async function signOutFirebaseSilently(): Promise<void> {
  try {
    if (getApps().length > 0) {
      await signOut(getAuth(getApp()));
    }
  } catch {
    // Ignora falhas ao limpar sessão auxiliar do Firebase
  }
}
