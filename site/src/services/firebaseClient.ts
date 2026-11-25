import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';

export interface FirebaseSocialAuthResult {
  idToken: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  provider: 'Google' | 'Facebook';
}

function getFirebaseAuth(): Auth {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();

  if (!apiKey || !projectId) {
    throw new Error(
      'Configuração do Firebase ausente. Crie ou configure o arquivo site/.env.local com VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID (consulte site/.env.example).'
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

export async function authenticateWithFirebasePopup(
  providerName: 'Google' | 'Facebook'
): Promise<FirebaseSocialAuthResult> {
  const auth = getFirebaseAuth();

  const provider =
    providerName === 'Google'
      ? new GoogleAuthProvider()
      : new FacebookAuthProvider();

  if (providerName === 'Google') {
    (provider as GoogleAuthProvider).addScope('email');
    (provider as GoogleAuthProvider).addScope('profile');
    (provider as GoogleAuthProvider).setCustomParameters({
      prompt: 'select_account',
    });
  } else {
    (provider as FacebookAuthProvider).addScope('email');
    (provider as FacebookAuthProvider).addScope('public_profile');
  }

  try {
    const userCredential = await signInWithPopup(auth, provider);
    const idToken = await userCredential.user.getIdToken();

    return {
      idToken,
      email: userCredential.user.email || '',
      fullName: userCredential.user.displayName || '',
      photoUrl: userCredential.user.photoURL || null,
      provider: providerName,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string } | undefined;
    if (err?.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela de login social foi fechada antes de concluir a autenticação.');
    }
    if (err?.code === 'auth/cancelled-popup-request') {
      throw new Error('Operação de login cancelada.');
    }
    if (err?.code === 'auth/popup-blocked') {
      throw new Error('A janela pop-up foi bloqueada pelo navegador. Permita pop-ups para entrar.');
    }
    if (err?.code === 'auth/account-exists-with-different-credential') {
      throw new Error('Já existe uma conta cadastrada com este e-mail através de outro método de acesso.');
    }
    const message = error instanceof Error ? error.message : err?.message;
    throw new Error(
      message || 'Falha ao autenticar com provedor social via Firebase. Tente novamente.'
    );
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
