import type { AuthSession } from '../types/auth';
import { fetchMyChatKeyVault, upsertMyChatKeyVault } from './wave2ApiClient';

const LOCAL_KEYPAIR_PREFIX = 'beyondtime_chat_e2ee_keypair_v1:';

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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
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

async function deriveVaultWrappingKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
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
      iterations: 150000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Garante que o usuário autenticado tenha um par de chaves ECDH P-256 no navegador
 * e que sua chave pública + cofre PBKDF2 estejam publicados em PUT /api/v1/chat/keys/me.
 */
export async function ensureUserChatKeyPair(
  session: AuthSession
): Promise<LocalChatKeyPair | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return null;
  }

  const storageKey = `${LOCAL_KEYPAIR_PREFIX}${session.userId}`;
  try {
    const rawStored = window.localStorage.getItem(storageKey);
    if (rawStored) {
      const parsed = JSON.parse(rawStored) as StoredKeyPairJson;
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        parsed.privateKeyJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey']
      );
      const existingVault = await fetchMyChatKeyVault(session);
      if (existingVault) {
        return {
          publicKeyJwk: JSON.stringify(parsed.publicKeyJwk),
          privateKey,
          keyVersion: existingVault.keyVersion || parsed.keyVersion || 1,
        };
      }
      // Publica chave já existente no servidor se ainda não estiver registrada
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const wrappingKey = await deriveVaultWrappingKey(session.userId, salt);
      const encryptedPriv = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv) },
        wrappingKey,
        new TextEncoder().encode(JSON.stringify(parsed.privateKeyJwk))
      );
      const saved = await upsertMyChatKeyVault(session, {
        publicKeyJwk: JSON.stringify(parsed.publicKeyJwk),
        encryptedPrivateKey: bytesToBase64(new Uint8Array(encryptedPriv)),
        kdfSalt: bytesToBase64(salt),
        kdfIv: bytesToBase64(iv),
        kdfIterations: 150000,
        keyAlgorithm: 'ECDH-P256',
      });
      return {
        publicKeyJwk: saved.publicKeyJwk,
        privateKey,
        keyVersion: saved.keyVersion || 1,
      };
    }

    // Gera novo par de chaves ECDH P-256
    const generated = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
    const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', generated.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', generated.privateKey);

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappingKey = await deriveVaultWrappingKey(session.userId, salt);
    const encryptedPriv = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      wrappingKey,
      new TextEncoder().encode(JSON.stringify(privateKeyJwk))
    );

    const saved = await upsertMyChatKeyVault(session, {
      publicKeyJwk: JSON.stringify(publicKeyJwk),
      encryptedPrivateKey: bytesToBase64(new Uint8Array(encryptedPriv)),
      kdfSalt: bytesToBase64(salt),
      kdfIv: bytesToBase64(iv),
      kdfIterations: 150000,
      keyAlgorithm: 'ECDH-P256',
    });

    const toStore: StoredKeyPairJson = {
      publicKeyJwk,
      privateKeyJwk,
      keyVersion: saved.keyVersion || 1,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(toStore));

    return {
      publicKeyJwk: saved.publicKeyJwk,
      privateKey: generated.privateKey,
      keyVersion: saved.keyVersion || 1,
    };
  } catch {
    return null;
  }
}

async function deriveConversationAesKey(
  myPrivateKey: CryptoKey | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<CryptoKey> {
  if (myPrivateKey && peerPublicKeyJwk) {
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
      // fallback abaixo se a chave pública do par for incompatível
    }
  }

  // Fallback simétrico derivado do conversationId quando o contato ainda não registrou chave ECDH
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

export async function encryptMessageText(
  plaintext: string,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  conversationId: string
): Promise<{ ciphertext: string; iv: string; senderKeyVersion: number }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveConversationAesKey(
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
  try {
    const ivBytes = base64ToBytes(iv);
    const cipherBytes = base64ToBytes(ciphertext);
    const aesKey = await deriveConversationAesKey(
      myKeyPair?.privateKey ?? null,
      peerPublicKeyJwk,
      conversationId
    );
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
      aesKey,
      toArrayBuffer(cipherBytes)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // Tenta fallback simétrico por conversationId caso a mensagem tenha sido enviada antes do par registrar chave
    try {
      const ivBytes = base64ToBytes(iv);
      const cipherBytes = base64ToBytes(ciphertext);
      const fallbackKey = await deriveConversationAesKey(null, null, conversationId);
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
        fallbackKey,
        toArrayBuffer(cipherBytes)
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return '[Mensagem criptografada]';
    }
  }
}
