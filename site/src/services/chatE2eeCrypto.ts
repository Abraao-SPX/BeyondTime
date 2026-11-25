import type { AuthSession } from '../types/auth';
import { fetchMyChatKeyVault, upsertMyChatKeyVault } from './wave2ApiClient';

const LOCAL_KEYPAIR_PREFIX = 'beyondtime_chat_e2ee_keypair_v1:';
const RN_BASE64_IV_MARKER = 'bt-rn-b64-v1';
const VAULT_KDF_ITERATIONS = 210000;
const HKDF_SALT_V2 = new TextEncoder().encode('beyondtime-e2ee-salt-v2');
const HKDF_INFO_V2 = new TextEncoder().encode('beyondtime-chat-aes-256-gcm');

function readStoredKeyPair(storageKey: string): string | null {
  const fromSession = window.sessionStorage.getItem(storageKey);
  if (fromSession) return fromSession;
  const fromLegacyLocal = window.localStorage.getItem(storageKey);
  if (fromLegacyLocal) {
    window.sessionStorage.setItem(storageKey, fromLegacyLocal);
    window.localStorage.removeItem(storageKey);
    return fromLegacyLocal;
  }
  return null;
}

function writeStoredKeyPair(storageKey: string, value: string): void {
  window.sessionStorage.setItem(storageKey, value);
  window.localStorage.removeItem(storageKey);
}

export function clearAllLocalChatKeyPairs(): void {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && key.startsWith(LOCAL_KEYPAIR_PREFIX)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => storage.removeItem(k));
    } catch {
      // ignora
    }
  }
}

export interface LocalChatKeyPair {
  publicKeyJwk: string;
  privateKey: CryptoKey;
  keyVersion: number;
}

interface StoredKeyPairJson {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  keyVersion: number;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function getVaultPassphraseV2(session: AuthSession): string {
  return `beyondtime-vault-v2:${session.userId}:${session.email.trim().toLowerCase()}`;
}

async function deriveVaultWrappingKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = VAULT_KDF_ITERATIONS
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const safeIterations = Math.max(100000, iterations || VAULT_KDF_ITERATIONS);
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: safeIterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function wrapPrivateKeyJwk(
  session: AuthSession,
  privateKeyJwk: JsonWebKey
): Promise<{
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfIv: string;
  kdfIterations: number;
}> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await deriveVaultWrappingKey(
    getVaultPassphraseV2(session),
    salt,
    VAULT_KDF_ITERATIONS
  );
  const encryptedPriv = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    wrappingKey,
    new TextEncoder().encode(JSON.stringify(privateKeyJwk))
  );
  return {
    encryptedPrivateKey: bytesToBase64(new Uint8Array(encryptedPriv)),
    kdfSalt: bytesToBase64(salt),
    kdfIv: bytesToBase64(iv),
    kdfIterations: VAULT_KDF_ITERATIONS,
  };
}

async function tryUnwrapPrivateKeyJwk(
  session: AuthSession,
  vault: {
    encryptedPrivateKey: string;
    kdfSalt: string;
    kdfIv: string;
    kdfIterations: number;
  }
): Promise<JsonWebKey | null> {
  const salt = base64ToBytes(vault.kdfSalt);
  const iv = base64ToBytes(vault.kdfIv);
  const encrypted = base64ToBytes(vault.encryptedPrivateKey);
  const passphrases = [getVaultPassphraseV2(session), session.userId];

  for (const passphrase of passphrases) {
    try {
      const wrappingKey = await deriveVaultWrappingKey(
        passphrase,
        salt,
        vault.kdfIterations
      );
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv) },
        wrappingKey,
        toArrayBuffer(encrypted)
      );
      const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as JsonWebKey;
      if (parsed.kty === 'EC' && parsed.crv === 'P-256' && parsed.d) {
        return parsed;
      }
    } catch {
      // tenta próxima derivação compatível (v2 -> v1)
    }
  }
  return null;
}

/**
 * Garante que o usuário autenticado tenha um par de chaves ECDH P-256 no navegador
 * sincronizado com GET/PUT /api/v1/chat/keys/me:
 * 1. Reaproveita chave local se já existir em localStorage.
 * 2. Ao trocar de navegador/dispositivo, restaura o cofre existente via GET /api/v1/chat/keys/me
 *    sem sobrescrever a chave publicada no servidor.
 * 3. Só gera um novo par quando não existe cofre restaurável no servidor.
 */
export async function ensureUserChatKeyPair(
  session: AuthSession
): Promise<LocalChatKeyPair | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return null;
  }

  const storageKey = `${LOCAL_KEYPAIR_PREFIX}${session.userId}`;
  try {
    const rawStored = readStoredKeyPair(storageKey);
    const existingVault = await fetchMyChatKeyVault(session);

    if (rawStored) {
      const parsed = JSON.parse(rawStored) as StoredKeyPairJson;
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        parsed.privateKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey']
      );
      if (existingVault) {
        return {
          publicKeyJwk: JSON.stringify(parsed.publicKeyJwk),
          privateKey,
          keyVersion: existingVault.keyVersion || parsed.keyVersion || 1,
        };
      }
      // Publica chave já existente no servidor se ainda não estiver registrada
      const wrapped = await wrapPrivateKeyJwk(session, parsed.privateKeyJwk);
      const saved = await upsertMyChatKeyVault(session, {
        publicKeyJwk: JSON.stringify(parsed.publicKeyJwk),
        ...wrapped,
        keyAlgorithm: 'ECDH-P256',
      });
      return {
        publicKeyJwk: saved.publicKeyJwk,
        privateKey,
        keyVersion: saved.keyVersion || 1,
      };
    }

    // Novo navegador/sessão limpa: restaura o cofre existente sem sobrescrever a chave atual
    if (existingVault) {
      const restoredPrivateJwk = await tryUnwrapPrivateKeyJwk(session, existingVault);
      if (restoredPrivateJwk) {
        const privateKey = await window.crypto.subtle.importKey(
          'jwk',
          restoredPrivateJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          ['deriveKey']
        );
        const restoredPublicJwk: JsonWebKey = {
          kty: 'EC',
          crv: 'P-256',
          x: restoredPrivateJwk.x,
          y: restoredPrivateJwk.y,
          ext: true,
        };
        const toStore: StoredKeyPairJson = {
          publicKeyJwk: restoredPublicJwk,
          privateKeyJwk: restoredPrivateJwk,
          keyVersion: existingVault.keyVersion || 1,
        };
        writeStoredKeyPair(storageKey, JSON.stringify(toStore));
        return {
          publicKeyJwk: existingVault.publicKeyJwk || JSON.stringify(restoredPublicJwk),
          privateKey,
          keyVersion: existingVault.keyVersion || 1,
        };
      }
    }

    // Gera novo par de chaves ECDH P-256 somente quando não há cofre restaurável
    const generated = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', generated.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', generated.privateKey);
    const wrapped = await wrapPrivateKeyJwk(session, privateKeyJwk);

    const saved = await upsertMyChatKeyVault(session, {
      publicKeyJwk: JSON.stringify(publicKeyJwk),
      ...wrapped,
      keyAlgorithm: 'ECDH-P256',
    });

    const toStore: StoredKeyPairJson = {
      publicKeyJwk,
      privateKeyJwk,
      keyVersion: saved.keyVersion || 1,
    };
    writeStoredKeyPair(storageKey, JSON.stringify(toStore));

    return {
      publicKeyJwk: saved.publicKeyJwk,
      privateKey: generated.privateKey,
      keyVersion: saved.keyVersion || 1,
    };
  } catch {
    return null;
  }
}

async function deriveEcdhConversationAesKey(
  myPrivateKey: CryptoKey,
  peerPublicKeyJwk: string
): Promise<CryptoKey | null> {
  try {
    const parsedJwk = JSON.parse(peerPublicKeyJwk) as JsonWebKey;
    const peerPublicKey = await window.crypto.subtle.importKey(
      'jwk',
      parsedJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );
    return await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: peerPublicKey },
      myPrivateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

async function deriveFallbackAesKeyV2(conversationId: string): Promise<CryptoKey> {
  const ikm = new TextEncoder().encode(`beyondtime-conv-v2:${conversationId}`);
  const baseKey = await window.crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  return window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(HKDF_SALT_V2),
      info: toArrayBuffer(HKDF_INFO_V2),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function deriveFallbackAesKeyV1(conversationId: string): Promise<CryptoKey> {
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`beyondtime-conv-v1:${conversationId}`)
  );
  return window.crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function derivePrimaryConversationAesKey(
  myPrivateKey: CryptoKey | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<CryptoKey> {
  if (myPrivateKey && peerPublicKeyJwk) {
    const ecdhKey = await deriveEcdhConversationAesKey(myPrivateKey, peerPublicKeyJwk);
    if (ecdhKey) return ecdhKey;
  }
  return deriveFallbackAesKeyV2(conversationId);
}

async function getDecryptionCandidateKeys(
  myPrivateKey: CryptoKey | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<CryptoKey[]> {
  const keys: CryptoKey[] = [];
  if (myPrivateKey && peerPublicKeyJwk) {
    const ecdhKey = await deriveEcdhConversationAesKey(myPrivateKey, peerPublicKeyJwk);
    if (ecdhKey) keys.push(ecdhKey);
  }
  keys.push(await deriveFallbackAesKeyV2(conversationId));
  keys.push(await deriveFallbackAesKeyV1(conversationId));
  return keys;
}

export async function encryptMessageText(
  plaintext: string,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<{ ciphertext: string; iv: string; senderKeyVersion: number }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await derivePrimaryConversationAesKey(
    myKeyPair?.privateKey ?? null,
    peerPublicKeyJwk,
    conversationId
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    aesKey,
    new TextEncoder().encode(plaintext)
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    senderKeyVersion: myKeyPair?.keyVersion ?? 1,
  };
}

export async function decryptMessageText(
  ciphertext: string,
  iv: string,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<string> {
  if (!ciphertext || !iv) return '';

  // Retrocompatibilidade somente-leitura com mensagens legadas do fallback RN Base64
  if (iv === RN_BASE64_IV_MARKER) {
    try {
      return new TextDecoder().decode(base64ToBytes(ciphertext));
    } catch {
      return '[Mensagem criptografada]';
    }
  }

  let ivBytes: Uint8Array;
  let cipherBytes: Uint8Array;
  try {
    ivBytes = base64ToBytes(iv);
    cipherBytes = base64ToBytes(ciphertext);
  } catch {
    return '[Mensagem criptografada]';
  }

  const candidateKeys = await getDecryptionCandidateKeys(
    myKeyPair?.privateKey ?? null,
    peerPublicKeyJwk,
    conversationId
  );
  for (const key of candidateKeys) {
    try {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
        key,
        toArrayBuffer(cipherBytes)
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      // tenta próxima chave candidata (ECDH -> HKDF v2 -> SHA-256 v1)
    }
  }

  return '[Mensagem criptografada]';
}

export async function encryptMediaBytes(
  plainBytes: Uint8Array,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<{ encryptedBytes: Uint8Array; mediaIv: string; senderKeyVersion: number }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await derivePrimaryConversationAesKey(
    myKeyPair?.privateKey ?? null,
    peerPublicKeyJwk,
    conversationId
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(plainBytes)
  );
  return {
    encryptedBytes: new Uint8Array(encrypted),
    mediaIv: bytesToBase64(iv),
    senderKeyVersion: myKeyPair?.keyVersion ?? 1,
  };
}

export async function decryptMediaBytes(
  encryptedBytes: Uint8Array,
  mediaIv: string,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<Uint8Array | null> {
  if (!encryptedBytes.length || !mediaIv) return null;

  let ivBytes: Uint8Array;
  try {
    ivBytes = base64ToBytes(mediaIv);
  } catch {
    return null;
  }

  const candidateKeys = await getDecryptionCandidateKeys(
    myKeyPair?.privateKey ?? null,
    peerPublicKeyJwk,
    conversationId
  );
  for (const key of candidateKeys) {
    try {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
        key,
        toArrayBuffer(encryptedBytes)
      );
      return new Uint8Array(decrypted);
    } catch {
      // tenta próxima chave candidata
    }
  }
  return null;
}
