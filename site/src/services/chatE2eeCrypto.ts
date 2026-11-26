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
  warningMessage?: string;
}

interface StoredKeyPairJson {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  keyVersion: number;
}

const inFlightKeyPairByUser = new Map<string, Promise<LocalChatKeyPair | null>>();

export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    let chunk = '';
    for (let j = 0; j < slice.length; j += 1) {
      chunk += String.fromCharCode(slice[j]);
    }
    parts.push(chunk);
  }
  return window.btoa(parts.join(''));
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

const VAULT_ZK_PASSPHRASE_PREFIX = 'beyondtime-vault-v3-zk:';
const MIN_CUSTOM_PASSPHRASE_LENGTH = 12;

function getVaultPassphraseV2(session: AuthSession): string {
  return `beyondtime-vault-v2:${session.userId}:${session.email.trim().toLowerCase()}`;
}

function normalizeCustomVaultPassphrase(
  session: AuthSession,
  customPassphrase?: string
): string | null {
  const trimmed = customPassphrase?.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (
    trimmed.length < MIN_CUSTOM_PASSPHRASE_LENGTH ||
    lowered === session.userId.trim().toLowerCase() ||
    lowered === session.email.trim().toLowerCase()
  ) {
    throw new Error(
      'A frase-chave do cofre E2EE deve ter pelo menos 12 caracteres e não pode ser igual ao e-mail ou identificador da conta.'
    );
  }
  return `${VAULT_ZK_PASSPHRASE_PREFIX}${trimmed}`;
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

/**
 * Envelopa a chave privada ECDH P-256 para armazenamento no cofre do servidor.
 * SEC-CRIT-02: nunca utiliza o fallback legado fraco (apenas `userId`) na criação de novos cofres;
 * aceita `customPassphrase` opcional de alta entropia (zero-knowledge) mantendo compatibilidade.
 */
export async function wrapPrivateKeyJwk(
  session: AuthSession,
  privateKeyJwk: JsonWebKey,
  customPassphrase?: string
): Promise<{
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfIv: string;
  kdfIterations: number;
}> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const zkPassphrase = normalizeCustomVaultPassphrase(session, customPassphrase);
  const effectivePassphrase = zkPassphrase ?? getVaultPassphraseV2(session);
  const wrappingKey = await deriveVaultWrappingKey(
    effectivePassphrase,
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

interface UnwrappedVaultResult {
  privateKeyJwk: JsonWebKey;
  needsVaultMigration: boolean;
}

export async function tryUnwrapPrivateKeyJwk(
  session: AuthSession,
  vault: {
    encryptedPrivateKey: string;
    kdfSalt: string;
    kdfIv: string;
    kdfIterations: number;
  },
  customPassphrase?: string
): Promise<UnwrappedVaultResult | null> {
  const salt = base64ToBytes(vault.kdfSalt);
  const iv = base64ToBytes(vault.kdfIv);
  const encrypted = base64ToBytes(vault.encryptedPrivateKey);

  const candidates: Array<{ passphrase: string; needsVaultMigration: boolean }> = [];
  const trimmedCustom = customPassphrase?.trim();
  if (trimmedCustom) {
    candidates.push({
      passphrase: `${VAULT_ZK_PASSPHRASE_PREFIX}${trimmedCustom}`,
      needsVaultMigration: false,
    });
  }
  candidates.push({
    passphrase: getVaultPassphraseV2(session),
    needsVaultMigration: Boolean(trimmedCustom),
  });
  // Fallback somente-leitura para cofres legados v1 (derivados apenas de userId),
  // sinalizando migração imediata para o formato endurecido.
  candidates.push({
    passphrase: session.userId,
    needsVaultMigration: true,
  });

  for (const candidate of candidates) {
    try {
      const wrappingKey = await deriveVaultWrappingKey(
        candidate.passphrase,
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
        return {
          privateKeyJwk: parsed,
          needsVaultMigration: candidate.needsVaultMigration,
        };
      }
    } catch {
      // tenta próxima derivação compatível (v3-zk -> v2 -> v1 legado somente-leitura)
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
function isSamePublicKeyJwk(
  localPub: JsonWebKey,
  serverPubJson: string | null | undefined
): boolean {
  if (!serverPubJson) return false;
  try {
    const parsed = JSON.parse(serverPubJson) as JsonWebKey;
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

export interface EnsureChatKeyPairOptions {
  customPassphrase?: string;
}

export async function ensureUserChatKeyPair(
  session: AuthSession,
  options?: EnsureChatKeyPairOptions
): Promise<LocalChatKeyPair | null> {
  const inFlightKey = `${session.userId}:${options?.customPassphrase ? 'zk' : 'v2'}`;
  const existingPromise = inFlightKeyPairByUser.get(inFlightKey);
  if (existingPromise) {
    return existingPromise;
  }
  const promise = ensureUserChatKeyPairInternal(session, options?.customPassphrase).finally(() => {
    inFlightKeyPairByUser.delete(inFlightKey);
  });
  inFlightKeyPairByUser.set(inFlightKey, promise);
  return promise;
}

async function ensureUserChatKeyPairInternal(
  session: AuthSession,
  customPassphrase?: string
): Promise<LocalChatKeyPair | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return null;
  }

  const storageKey = `${LOCAL_KEYPAIR_PREFIX}${session.userId}`;
  try {
    const rawStored = readStoredKeyPair(storageKey);
    const existingVault = await fetchMyChatKeyVault(session);
    let hadUnrecoverableDivergence = false;

    if (rawStored) {
      const parsed = JSON.parse(rawStored) as StoredKeyPairJson;
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        parsed.privateKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey']
      );
      if (existingVault && isSamePublicKeyJwk(parsed.publicKeyJwk, existingVault.publicKeyJwk)) {
        return {
          publicKeyJwk: existingVault.publicKeyJwk,
          privateKey,
          keyVersion: existingVault.keyVersion || parsed.keyVersion || 1,
        };
      }
      if (!existingVault) {
        // Publica chave já existente no servidor se ainda não estiver registrada
        const wrapped = await wrapPrivateKeyJwk(session, parsed.privateKeyJwk, customPassphrase);
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
      // Chave local diverge do cofre vigente no servidor -> restaura o cofre do servidor abaixo
      hadUnrecoverableDivergence = true;
    }

    // Novo navegador ou divergência local/servidor: restaura o cofre existente sem sobrescrever
    if (existingVault) {
      const unwrapped = await tryUnwrapPrivateKeyJwk(session, existingVault, customPassphrase);
      if (unwrapped) {
        const restoredPrivateJwk = unwrapped.privateKeyJwk;
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
        let keyVersion = existingVault.keyVersion || 1;
        // SEC-CRIT-02: Migra automaticamente cofres legados (v1 baseado apenas em userId)
        // ou promove para v3-zk quando uma frase-chave dedicada é fornecida.
        if (unwrapped.needsVaultMigration) {
          try {
            const migratedWrapped = await wrapPrivateKeyJwk(
              session,
              restoredPrivateJwk,
              customPassphrase
            );
            const migrated = await upsertMyChatKeyVault(session, {
              publicKeyJwk: existingVault.publicKeyJwk || JSON.stringify(restoredPublicJwk),
              ...migratedWrapped,
              keyAlgorithm: 'ECDH-P256',
            });
            keyVersion = migrated.keyVersion || keyVersion;
          } catch {
            // Falha temporária na migração não impede a leitura das mensagens já restauradas
          }
        }
        const toStore: StoredKeyPairJson = {
          publicKeyJwk: restoredPublicJwk,
          privateKeyJwk: restoredPrivateJwk,
          keyVersion,
        };
        writeStoredKeyPair(storageKey, JSON.stringify(toStore));
        return {
          publicKeyJwk: existingVault.publicKeyJwk || JSON.stringify(restoredPublicJwk),
          privateKey,
          keyVersion,
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
    const wrapped = await wrapPrivateKeyJwk(session, privateKeyJwk, customPassphrase);

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
      warningMessage:
        hadUnrecoverableDivergence || existingVault
          ? 'Sua proteção de mensagens foi renovada neste navegador. Algumas mensagens mais antigas podem não abrir.'
          : undefined,
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
