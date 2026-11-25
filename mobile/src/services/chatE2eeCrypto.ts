/**
 * BeyondTime Mobile — Criptografia Ponta a Ponta (E2EE) compatível 100% com o Web (WebCrypto API)
 *
 * Protocolo compartilhado Mobile (Hermes/iOS/Android/Expo Web) <-> Web (site/src/services/chatE2eeCrypto.ts):
 * - Par de chaves: ECDH NIST P-256 (JWK padrão)
 * - Cofre no servidor (GET/PUT /api/v1/chat/keys/me): PBKDF2-HMAC-SHA256 (210.000 iterações) + AES-256-GCM
 *   com restauração automática ao trocar de dispositivo (sem sobrescrever chave existente)
 * - Chave de conversa:
 *   1. ECDH P-256 (coordenada X 32 bytes -> AES-256-GCM) quando ambos possuem chave pública
 *   2. Fallback endurecido HKDF-SHA256 v2 quando o contato ainda não publicou chave pública
 *   3. Fallback somente-leitura para v1 (SHA-256) e legado RN Base64 (bt-rn-b64-v1)
 * - Mídia binária (foto/áudio): AES-256-GCM com IV aleatório de 12 bytes
 */

import { gcm } from '@noble/ciphers/aes';
import { p256 } from '@noble/curves/p256';
import { hkdf } from '@noble/hashes/hkdf';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthSession } from './authService';

const LOCAL_KEYPAIR_PREFIX = 'beyondtime_chat_e2ee_keypair_v1:';
const RN_BASE64_IV_MARKER = 'bt-rn-b64-v1';
const VAULT_KDF_ITERATIONS = 210000;
const HKDF_SALT_V2 = utf8ToBytes('beyondtime-e2ee-salt-v2');
const HKDF_INFO_V2 = utf8ToBytes('beyondtime-chat-aes-256-gcm');
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export interface EcJwk {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  d?: string;
  ext?: boolean;
}

export interface LocalChatKeyPair {
  publicKeyJwk: string;
  privateKeyBytes: Uint8Array;
  privateKeyJwk: EcJwk;
  keyVersion: number;
  warningMessage?: string;
}

interface StoredKeyPairJson {
  publicKeyJwk: EcJwk;
  privateKeyJwk: EcJwk;
  keyVersion: number;
}

export interface ChatKeyVaultApi {
  fetchMyVault: (session: AuthSession) => Promise<{
    publicKeyJwk: string;
    encryptedPrivateKey: string;
    kdfSalt: string;
    kdfIv: string;
    kdfIterations: number;
    keyAlgorithm: string;
    keyVersion: number;
  } | null>;
  upsertMyVault: (
    session: AuthSession,
    payload: {
      publicKeyJwk: string;
      encryptedPrivateKey: string;
      kdfSalt: string;
      kdfIv: string;
      kdfIterations: number;
      keyAlgorithm: string;
    }
  ) => Promise<{
    publicKeyJwk: string;
    keyVersion: number;
  }>;
}

// ============================================================================
// Utilitários UTF-8, Base64, Base64URL e Aleatoriedade Segura
// ============================================================================

export function utf8ToBytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    let codePoint = str.charCodeAt(i);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = ((codePoint - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i += 1;
      }
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      out += String.fromCharCode(b1);
    } else if ((b1 & 0xe0) === 0xc0 && i < bytes.length) {
      const b2 = bytes[i++];
      out += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else if ((b1 & 0xf0) === 0xe0 && i + 1 < bytes.length) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      out += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f));
    } else if ((b1 & 0xf8) === 0xf0 && i + 2 < bytes.length) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      const cp =
        (((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)) -
        0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      out += '\uFFFD';
    }
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    result += BASE64_CHARS[(triple >> 18) & 63];
    result += BASE64_CHARS[(triple >> 12) & 63];
    result += i + 1 < len ? BASE64_CHARS[(triple >> 6) & 63] : '=';
    result += i + 2 < len ? BASE64_CHARS[triple & 63] : '=';
  }
  return result;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const outputLen = Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
  const out = new Uint8Array(outputLen);
  let outIdx = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(clean[i]);
    const c2 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c3 = clean[i + 2] === '=' ? 0 : BASE64_CHARS.indexOf(clean[i + 2]);
    const c4 = clean[i + 3] === '=' ? 0 : BASE64_CHARS.indexOf(clean[i + 3]);
    if (c1 < 0 || c2 < 0 || c3 < 0 || c4 < 0) continue;

    const triple = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;
    if (outIdx < outputLen) out[outIdx++] = (triple >> 16) & 255;
    if (outIdx < outputLen) out[outIdx++] = (triple >> 8) & 255;
    if (outIdx < outputLen) out[outIdx++] = triple & 255;
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  return base64ToBytes(b64);
}

function pad32(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) return bytes.slice(bytes.length - 32);
  const out = new Uint8Array(32);
  out.set(bytes, 32 - bytes.length);
  return out;
}

function getSecureRandomBytes(length: number): Uint8Array {
  try {
    return Crypto.getRandomBytes(length);
  } catch {
    const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      return cryptoObj.getRandomValues(new Uint8Array(length));
    }
    throw new Error('Fonte segura de entropia indisponível neste dispositivo.');
  }
}

function generateHermesSafeP256PrivateKey(): Uint8Array {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = getSecureRandomBytes(32);
    if (p256.utils.isValidPrivateKey(candidate)) {
      return candidate;
    }
  }
  throw new Error('Não foi possível gerar chave privada segura neste dispositivo.');
}

// ============================================================================
// Armazenamento seguro do par de chaves (SecureStore nativo / sessionStorage web)
// ============================================================================

function getSecureStoreKey(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `bt_e2ee_v1_${safeId}`;
}

function getLegacyNativeKeyFileUri(userId: string): string | null {
  if (!FileSystem.documentDirectory) return null;
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${FileSystem.documentDirectory}beyondtime_e2ee_${safeId}.json`;
}

async function readLocalStoredKeyPair(userId: string): Promise<StoredKeyPairJson | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const key = `${LOCAL_KEYPAIR_PREFIX}${userId}`;
      const raw = window.sessionStorage?.getItem(key) || window.localStorage?.getItem(key);
      if (raw && window.localStorage?.getItem(key)) {
        window.sessionStorage?.setItem(key, raw);
        window.localStorage.removeItem(key);
      }
      return raw ? (JSON.parse(raw) as StoredKeyPairJson) : null;
    }

    const secureRaw = await SecureStore.getItemAsync(getSecureStoreKey(userId));
    if (secureRaw) {
      return JSON.parse(secureRaw) as StoredKeyPairJson;
    }

    // Migração única: move arquivo legado em claro para o SecureStore e apaga o arquivo
    const legacyUri = getLegacyNativeKeyFileUri(userId);
    if (!legacyUri) return null;
    const info = await FileSystem.getInfoAsync(legacyUri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(legacyUri);
    if (raw) {
      await SecureStore.setItemAsync(getSecureStoreKey(userId), raw);
      await FileSystem.deleteAsync(legacyUri, { idempotent: true });
      return JSON.parse(raw) as StoredKeyPairJson;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeLocalStoredKeyPair(userId: string, data: StoredKeyPairJson): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.sessionStorage?.setItem(`${LOCAL_KEYPAIR_PREFIX}${userId}`, serialized);
      window.localStorage?.removeItem(`${LOCAL_KEYPAIR_PREFIX}${userId}`);
      return;
    }
    await SecureStore.setItemAsync(getSecureStoreKey(userId), serialized);
    const legacyUri = getLegacyNativeKeyFileUri(userId);
    if (legacyUri) {
      await FileSystem.deleteAsync(legacyUri, { idempotent: true });
    }
  } catch {
    // falha de cache local não impede uso em memória
  }
}

/**
 * Remove chave privada E2EE local e arquivos temporários de mídia decifrada no logout/exclusão (AUD-003 / LGPD).
 */
export async function clearLocalChatE2eeData(userId?: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (userId) {
        window.sessionStorage?.removeItem(`${LOCAL_KEYPAIR_PREFIX}${userId}`);
        window.localStorage?.removeItem(`${LOCAL_KEYPAIR_PREFIX}${userId}`);
      }
      return;
    }

    if (userId) {
      await SecureStore.deleteItemAsync(getSecureStoreKey(userId)).catch(() => undefined);
      const legacyUri = getLegacyNativeKeyFileUri(userId);
      if (legacyUri) {
        await FileSystem.deleteAsync(legacyUri, { idempotent: true }).catch(() => undefined);
      }
    }

    const dirs = [FileSystem.cacheDirectory, FileSystem.documentDirectory].filter(
      (d): d is string => Boolean(d)
    );
    for (const dir of dirs) {
      try {
        const entries = await FileSystem.readDirectoryAsync(dir);
        for (const name of entries) {
          if (
            name.startsWith('bt-media-') ||
            name.startsWith('bt-upload-') ||
            name.startsWith('beyondtime_e2ee_')
          ) {
            await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }).catch(
              () => undefined
            );
          }
        }
      } catch {
        // ignora se o diretório não puder ser listado
      }
    }
  } catch {
    // limpeza defensiva não deve travar o logout
  }
}

// ============================================================================
// Conversão JWK <-> P-256 + Cofre PBKDF2-HMAC-SHA256
// ============================================================================

function buildJwkPairFromPrivateBytes(privateKeyBytes: Uint8Array): {
  publicKeyJwk: EcJwk;
  privateKeyJwk: EcJwk;
} {
  const uncompressedPub = p256.getPublicKey(privateKeyBytes, false); // 65 bytes: 0x04 || x(32) || y(32)
  const x = bytesToBase64Url(uncompressedPub.slice(1, 33));
  const y = bytesToBase64Url(uncompressedPub.slice(33, 65));
  const d = bytesToBase64Url(pad32(privateKeyBytes));
  return {
    publicKeyJwk: { kty: 'EC', crv: 'P-256', x, y, ext: true },
    privateKeyJwk: { kty: 'EC', crv: 'P-256', x, y, d, ext: true },
  };
}

function publicKeyJwkToUncompressedBytes(jwkJson: string): Uint8Array | null {
  try {
    const parsed = JSON.parse(jwkJson) as Partial<EcJwk>;
    if (parsed.kty !== 'EC' || parsed.crv !== 'P-256' || !parsed.x || !parsed.y) {
      return null;
    }
    const xBytes = pad32(base64UrlToBytes(parsed.x));
    const yBytes = pad32(base64UrlToBytes(parsed.y));
    const uncompressed = new Uint8Array(65);
    uncompressed[0] = 0x04;
    uncompressed.set(xBytes, 1);
    uncompressed.set(yBytes, 33);
    return uncompressed;
  } catch {
    return null;
  }
}

function privateKeyJwkToBytes(jwk: Partial<EcJwk>): Uint8Array | null {
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d) return null;
  return pad32(base64UrlToBytes(jwk.d));
}

function getVaultPassphraseV2(session: AuthSession): string {
  return `beyondtime-vault-v2:${session.userId}:${session.email.trim().toLowerCase()}`;
}

async function deriveVaultWrappingKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const safeIterations = Math.max(100000, iterations || VAULT_KDF_ITERATIONS);
  return pbkdf2Async(sha256, utf8ToBytes(passphrase), salt, {
    c: safeIterations,
    dkLen: 32,
    asyncTick: 10,
  });
}

async function wrapPrivateKeyJwk(
  session: AuthSession,
  privateKeyJwk: EcJwk
): Promise<{
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfIv: string;
  kdfIterations: number;
}> {
  const salt = getSecureRandomBytes(16);
  const iv = getSecureRandomBytes(12);
  const wrappingKey = await deriveVaultWrappingKey(
    getVaultPassphraseV2(session),
    salt,
    VAULT_KDF_ITERATIONS
  );
  const plaintext = utf8ToBytes(JSON.stringify(privateKeyJwk));
  const encrypted = gcm(wrappingKey, iv).encrypt(plaintext);
  return {
    encryptedPrivateKey: bytesToBase64(encrypted),
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
): Promise<EcJwk | null> {
  const salt = base64ToBytes(vault.kdfSalt);
  const iv = base64ToBytes(vault.kdfIv);
  const cipher = base64ToBytes(vault.encryptedPrivateKey);
  const passphrases = [getVaultPassphraseV2(session), session.userId];

  for (const passphrase of passphrases) {
    try {
      const wrappingKey = await deriveVaultWrappingKey(passphrase, salt, vault.kdfIterations);
      const decrypted = gcm(wrappingKey, iv).decrypt(cipher);
      const parsed = JSON.parse(bytesToUtf8(decrypted)) as EcJwk;
      if (parsed.kty === 'EC' && parsed.crv === 'P-256' && parsed.d) {
        return parsed;
      }
    } catch {
      // só tenta v1 se v2 falhar
    }
  }
  return null;
}

function isSamePublicKeyJwk(localPub: EcJwk, serverPubJson: string | null | undefined): boolean {
  if (!serverPubJson) return false;
  try {
    const parsed = JSON.parse(serverPubJson) as Partial<EcJwk>;
    return (
      parsed.kty === 'EC' &&
      parsed.crv === 'P-256' &&
      Boolean(parsed.x) &&
      Boolean(parsed.y) &&
      parsed.x === localPub.x &&
      parsed.y === localPub.y
    );
  } catch {
    return false;
  }
}

/**
 * Garante que o usuário autenticado tenha um par de chaves ECDH P-256 sincronizado com o servidor.
 * 1. Reutiliza chave local somente se coincidir com a chave pública vigente no servidor (x/y).
 * 2. Se divergir ou não houver chave local, restaura o cofre via GET /api/v1/chat/keys/me sem sobrescrever.
 * 3. Só gera novo par quando não há cofre restaurável, avisando em português simples se houve divergência.
 */
export async function ensureUserChatKeyPair(
  session: AuthSession,
  vaultApi: ChatKeyVaultApi
): Promise<LocalChatKeyPair | null> {
  try {
    const localStored = await readLocalStoredKeyPair(session.userId);
    const serverVault = await vaultApi.fetchMyVault(session);
    let hadUnrecoverableDivergence = false;

    if (localStored) {
      const privBytes = privateKeyJwkToBytes(localStored.privateKeyJwk);
      if (privBytes) {
        if (serverVault && isSamePublicKeyJwk(localStored.publicKeyJwk, serverVault.publicKeyJwk)) {
          return {
            publicKeyJwk: serverVault.publicKeyJwk,
            privateKeyBytes: privBytes,
            privateKeyJwk: localStored.privateKeyJwk,
            keyVersion: serverVault.keyVersion || localStored.keyVersion || 1,
          };
        }
        if (!serverVault) {
          const wrapped = await wrapPrivateKeyJwk(session, localStored.privateKeyJwk);
          const saved = await vaultApi.upsertMyVault(session, {
            publicKeyJwk: JSON.stringify(localStored.publicKeyJwk),
            ...wrapped,
            keyAlgorithm: 'ECDH-P256',
          });
          return {
            publicKeyJwk: saved.publicKeyJwk,
            privateKeyBytes: privBytes,
            privateKeyJwk: localStored.privateKeyJwk,
            keyVersion: saved.keyVersion || 1,
          };
        }
        // Chave local diverge do cofre vigente no servidor -> tenta restaurar o cofre do servidor abaixo
        hadUnrecoverableDivergence = true;
      }
    }

    // Novo dispositivo ou divergência local/servidor: restaura o cofre existente sem sobrescrever
    if (serverVault) {
      const restoredPrivJwk = await tryUnwrapPrivateKeyJwk(session, serverVault);
      if (restoredPrivJwk) {
        const privBytes = privateKeyJwkToBytes(restoredPrivJwk);
        if (privBytes) {
          const publicKeyJwk: EcJwk = {
            kty: 'EC',
            crv: 'P-256',
            x: restoredPrivJwk.x,
            y: restoredPrivJwk.y,
            ext: true,
          };
          await writeLocalStoredKeyPair(session.userId, {
            publicKeyJwk,
            privateKeyJwk: restoredPrivJwk,
            keyVersion: serverVault.keyVersion || 1,
          });
          return {
            publicKeyJwk: serverVault.publicKeyJwk || JSON.stringify(publicKeyJwk),
            privateKeyBytes: privBytes,
            privateKeyJwk: restoredPrivJwk,
            keyVersion: serverVault.keyVersion || 1,
          };
        }
      }
    }

    // Primeiro acesso sem cofre válido (ou cofre irrecuperável): gera novo par ECDH P-256 sem depender de globalThis.crypto (AUD-006)
    const privateKeyBytes = generateHermesSafeP256PrivateKey();
    const { publicKeyJwk, privateKeyJwk } = buildJwkPairFromPrivateBytes(privateKeyBytes);
    const wrapped = await wrapPrivateKeyJwk(session, privateKeyJwk);
    const saved = await vaultApi.upsertMyVault(session, {
      publicKeyJwk: JSON.stringify(publicKeyJwk),
      ...wrapped,
      keyAlgorithm: 'ECDH-P256',
    });

    await writeLocalStoredKeyPair(session.userId, {
      publicKeyJwk,
      privateKeyJwk,
      keyVersion: saved.keyVersion || 1,
    });

    return {
      publicKeyJwk: saved.publicKeyJwk,
      privateKeyBytes,
      privateKeyJwk,
      keyVersion: saved.keyVersion || 1,
      warningMessage:
        hadUnrecoverableDivergence || serverVault
          ? 'Sua proteção de mensagens foi renovada neste aparelho. Algumas mensagens mais antigas podem não abrir.'
          : undefined,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Derivação de Chave de Conversa (ECDH P-256 + Fallback HKDF v2 / SHA-256 v1)
// ============================================================================

function deriveEcdhAesKey(
  myPrivateKeyBytes: Uint8Array,
  peerPublicKeyJwk: string
): Uint8Array | null {
  try {
    const peerUncompressed = publicKeyJwkToUncompressedBytes(peerPublicKeyJwk);
    if (!peerUncompressed) return null;
    // WebCrypto ECDH deriveKey(AES-GCM, 256) usa exatamente os 32 bytes da coordenada X
    const sharedCompressed = p256.getSharedSecret(myPrivateKeyBytes, peerUncompressed, true);
    return sharedCompressed.slice(1, 33);
  } catch {
    return null;
  }
}

function deriveFallbackAesKeyV2(conversationId: string): Uint8Array {
  const ikm = utf8ToBytes(`beyondtime-conv-v2:${conversationId}`);
  return hkdf(sha256, ikm, HKDF_SALT_V2, HKDF_INFO_V2, 32);
}

function deriveFallbackAesKeyV1(conversationId: string): Uint8Array {
  return sha256(utf8ToBytes(`beyondtime-conv-v1:${conversationId}`));
}

function derivePrimaryConversationKey(
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Uint8Array {
  if (myKeyPair?.privateKeyBytes && peerPublicKeyJwk) {
    const ecdhKey = deriveEcdhAesKey(myKeyPair.privateKeyBytes, peerPublicKeyJwk);
    if (ecdhKey) return ecdhKey;
  }
  return deriveFallbackAesKeyV2(conversationId);
}

function getDecryptionCandidateKeys(
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Uint8Array[] {
  const keys: Uint8Array[] = [];
  if (myKeyPair?.privateKeyBytes && peerPublicKeyJwk) {
    const ecdhKey = deriveEcdhAesKey(myKeyPair.privateKeyBytes, peerPublicKeyJwk);
    if (ecdhKey) keys.push(ecdhKey);
  }
  keys.push(deriveFallbackAesKeyV2(conversationId));
  keys.push(deriveFallbackAesKeyV1(conversationId));
  return keys;
}

// ============================================================================
// Cifração / Decifração de Mensagens de Texto e Blobs de Mídia (AES-256-GCM)
// ============================================================================

export async function encryptMessageText(
  plaintext: string,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<{ ciphertext: string; iv: string; senderKeyVersion: number }> {
  const iv = getSecureRandomBytes(12);
  const aesKey = derivePrimaryConversationKey(myKeyPair, peerPublicKeyJwk, conversationId);
  const encrypted = gcm(aesKey, iv).encrypt(utf8ToBytes(plaintext));
  return {
    ciphertext: bytesToBase64(encrypted),
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

  // Retrocompatibilidade somente-leitura com mensagens antigas do fallback RN Base64
  if (iv === RN_BASE64_IV_MARKER) {
    try {
      return bytesToUtf8(base64ToBytes(ciphertext));
    } catch {
      return '[Mensagem protegida]';
    }
  }

  const ivBytes = base64ToBytes(iv);
  const cipherBytes = base64ToBytes(ciphertext);
  if (ivBytes.length !== 12 || cipherBytes.length < 16) {
    return '[Mensagem protegida]';
  }

  const candidateKeys = getDecryptionCandidateKeys(myKeyPair, peerPublicKeyJwk, conversationId);
  for (const key of candidateKeys) {
    try {
      const decrypted = gcm(key, ivBytes).decrypt(cipherBytes);
      return bytesToUtf8(decrypted);
    } catch {
      // tenta próxima chave candidata
    }
  }

  return '[Mensagem protegida]';
}

export async function encryptMediaBytes(
  plainBytes: Uint8Array,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<{ encryptedBytes: Uint8Array; mediaIv: string; senderKeyVersion: number }> {
  const iv = getSecureRandomBytes(12);
  const aesKey = derivePrimaryConversationKey(myKeyPair, peerPublicKeyJwk, conversationId);
  const encryptedBytes = gcm(aesKey, iv).encrypt(plainBytes);
  return {
    encryptedBytes,
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
  const ivBytes = base64ToBytes(mediaIv);
  if (ivBytes.length !== 12 || encryptedBytes.length < 16) return null;

  const candidateKeys = getDecryptionCandidateKeys(myKeyPair, peerPublicKeyJwk, conversationId);
  for (const key of candidateKeys) {
    try {
      return gcm(key, ivBytes).decrypt(encryptedBytes);
    } catch {
      // tenta próxima chave candidata
    }
  }
  return null;
}
