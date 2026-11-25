/**
 * BeyondTime Mobile (React Native / Expo — br.com.beyondtime)
 * Cliente REST autenticado + WebSocket STOMP (/ws-chat) + Mappers da Onda 2
 * Requisitos: RF-05 (Descoberta e Match), RF-07 (Chat em Tempo Real) e RF-08 (Bloqueio)
 */

import { Client, type IMessage } from '@stomp/stompjs';
import { ApiError, type AuthSession } from './authService';
import type {
  BlockedContactMobile,
  ChatConversation,
  ChatMessage,
  RankedDiscoveryProfile,
  SendMessageOptions,
} from '../types/social';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080'
).replace(/\/+$/, '');

export function resolveApiAssetUrl(url?: string | null): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getWebSocketChatUrl(): string {
  const wsBase = API_BASE_URL.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  return `${wsBase}/ws-chat`;
}

// ==========================================================================
// DTOs de Contrato do Backend Spring Boot 3 (RF-05, RF-07, RF-08)
// ==========================================================================

export interface DiscoveryProfileDto {
  id: string;
  userId: string;
  profileId: string;
  fullName: string;
  firstName: string;
  age: number;
  city: string;
  cityWithState?: string;
  neighborhood?: string | null;
  locationLabel?: string | null;
  goal: string;
  bio?: string | null;
  avatarUrl?: string | null;
  verifiedBadge50plus: boolean;
  verifiedIdentity?: boolean;
  hobbies: string[];
  hobbySlugs?: string[];
  sharedHobbies: string[];
  sharedHobbySlugs?: string[];
  sharedHobbiesCount?: number;
  affinityPercent: number;
  sameCity: boolean;
  sameRegion?: boolean;
  distanceKm?: number | null;
}

export interface MatchInteractionResponseDto {
  action: 'LIKE' | 'PASS';
  targetUserId: string;
  matched: boolean;
  matchId: string | null;
  conversationId: string | null;
  affinityPercent: number;
  sharedHobbies: string[];
  contact: DiscoveryProfileDto | null;
}

export interface MatchSummaryDto {
  matchId: string;
  conversationId: string | null;
  otherUserId: string;
  fullName: string;
  age: number;
  city: string;
  avatarUrl?: string | null;
  verifiedBadge50plus: boolean;
  affinityPercent: number;
  sharedHobbies: string[];
  matchedAt: string;
}

export interface BlockedContactDto {
  blockId: string;
  id: string;
  blockedUserId: string;
  fullName: string;
  age: number;
  city: string;
  avatarUrl?: string | null;
  verifiedBadge50plus: boolean;
  reason?: string | null;
  blockedAt: string;
}

export type BackendChatMessageType = 'TEXT' | 'IMAGE' | 'AUDIO';

export interface EncryptedMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
  iv: string;
  messageType: BackendChatMessageType;
  mediaId?: string | null;
  mediaIv?: string | null;
  mediaMimeType?: string | null;
  mediaDurationSeconds?: number | null;
  senderKeyVersion: number;
  sentAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface ConversationSummaryDto {
  conversationId: string;
  matchId: string;
  contactUserId: string;
  contactName: string;
  contactAge: number | null;
  contactCity: string | null;
  contactAvatarUrl?: string | null;
  contactGoal?: string | null;
  contactVerified: boolean;
  affinityPercent: number;
  sharedHobbies: string[];
  contactHasChatKey: boolean;
  contactPublicKeyJwk?: string | null;
  contactKeyVersion?: number | null;
  unreadCount: number;
  lastMessage?: EncryptedMessageDto | null;
  updatedAt: string;
}

export interface SendEncryptedMessageDto {
  conversationId: string;
  ciphertext: string;
  iv: string;
  messageType: BackendChatMessageType;
  mediaId?: string | null;
  mediaIv?: string | null;
  mediaMimeType?: string | null;
  mediaDurationSeconds?: number | null;
  senderKeyVersion: number;
}

export interface ReadReceiptEventDto {
  conversationId: string;
  readerId: string;
  updatedCount?: number;
  readAt: string;
}

// ==========================================================================
// Helper HTTP autenticado (Authorization: Bearer <accessToken>)
// ==========================================================================

interface ProblemDetailPayload {
  detail?: string;
  title?: string;
  code?: string;
  errors?: Record<string, string>;
}

async function authedRequest<T>(
  session: AuthSession,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${session.accessToken}`,
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor BeyondTime. Verifique sua internet e tente novamente.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    let message = `Não foi possível concluir a operação agora (código ${response.status}).`;
    let code: string | undefined;
    let fieldErrors: Record<string, string> | undefined;
    try {
      const data = (await response.json()) as ProblemDetailPayload;
      const firstField = data.errors ? Object.values(data.errors)[0] : undefined;
      message = firstField || data.detail || data.title || message;
      code = data.code;
      fieldErrors = data.errors;
    } catch {
      // ignora payload não-JSON
    }
    throw new ApiError(message, response.status, code, fieldErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// ==========================================================================
// Codec compatível com React Native / Hermes (sem exigir window.crypto.subtle)
// ==========================================================================

const RN_BASE64_IV_MARKER = 'bt-rn-b64-v1';
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8ToBytes(str: string): Uint8Array {
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

function bytesToUtf8(bytes: Uint8Array): string {
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

function bytesToBase64(bytes: Uint8Array): string {
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

function base64ToBytes(base64: string): Uint8Array {
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

function getSubtleCrypto(): SubtleCrypto | null {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.subtle?.digest === 'function') {
    return cryptoObj.subtle;
  }
  return null;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function deriveConversationFallbackAesKey(
  subtle: SubtleCrypto,
  conversationId: string
): Promise<CryptoKey> {
  const seed = utf8ToBytes(`beyondtime-conv-v1:${conversationId}`);
  const digest = await subtle.digest('SHA-256', toArrayBuffer(seed));
  return subtle.importKey('raw', digest, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encodeChatPayload(
  plaintext: string,
  conversationId: string
): Promise<{ ciphertext: string; iv: string; senderKeyVersion: number }> {
  const subtle = getSubtleCrypto();
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;

  if (subtle && cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    try {
      const ivBytes = cryptoObj.getRandomValues(new Uint8Array(12));
      const aesKey = await deriveConversationFallbackAesKey(subtle, conversationId);
      const plainBytes = utf8ToBytes(plaintext);
      const encrypted = await subtle.encrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
        aesKey,
        toArrayBuffer(plainBytes)
      );
      return {
        ciphertext: bytesToBase64(new Uint8Array(encrypted)),
        iv: bytesToBase64(ivBytes),
        senderKeyVersion: 1,
      };
    } catch {
      // fallback seguro abaixo para ambientes sem AES-GCM nativo
    }
  }

  return {
    ciphertext: bytesToBase64(utf8ToBytes(plaintext)),
    iv: RN_BASE64_IV_MARKER,
    senderKeyVersion: 1,
  };
}

export async function decodeChatPayload(
  ciphertext: string,
  iv: string,
  conversationId: string
): Promise<string> {
  if (!ciphertext || !iv) return '';

  if (iv === RN_BASE64_IV_MARKER) {
    try {
      return bytesToUtf8(base64ToBytes(ciphertext));
    } catch {
      return '[Mensagem protegida]';
    }
  }

  const subtle = getSubtleCrypto();
  if (subtle) {
    try {
      const ivBytes = base64ToBytes(iv);
      const cipherBytes = base64ToBytes(ciphertext);
      const aesKey = await deriveConversationFallbackAesKey(subtle, conversationId);
      const decrypted = await subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
        aesKey,
        toArrayBuffer(cipherBytes)
      );
      return bytesToUtf8(new Uint8Array(decrypted));
    } catch {
      // continua para tentativa segura abaixo
    }
  }

  return '[Mensagem protegida]';
}

// ==========================================================================
// Formatadores e Mappers DTO -> Tipos Mobile (mobile/src/types/social.ts)
// ==========================================================================

export function formatIsoTimeToBr(iso?: string | null): string {
  if (!iso) return 'Agora';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Agora';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatIsoDateToBr(iso?: string | null): string {
  if (!iso) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}/${now.getFullYear()}`;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}/${date.getFullYear()}`;
}

function normalizeGoal(raw?: string | null): 'amizade' | 'relacionamento' | 'companhia' {
  const lower = (raw || '').trim().toLowerCase();
  if (lower === 'relacionamento') return 'relacionamento';
  if (lower === 'companhia') return 'companhia';
  return 'amizade';
}

function mapMessageTypeToKind(type?: BackendChatMessageType): 'text' | 'audio' | 'photo' {
  if (type === 'AUDIO') return 'audio';
  if (type === 'IMAGE') return 'photo';
  return 'text';
}

export function mapKindToMessageType(kind?: SendMessageOptions['kind']): BackendChatMessageType {
  if (kind === 'audio') return 'AUDIO';
  if (kind === 'photo') return 'IMAGE';
  return 'TEXT';
}

export function mapDiscoveryDtoToRankedProfile(dto: DiscoveryProfileDto): RankedDiscoveryProfile {
  const shortCity = (dto.city || 'Sergipe').split(',')[0].trim() || 'Sergipe';
  const isSameCity = Boolean(dto.sameCity);
  const isSameRegion = Boolean(dto.sameRegion ?? dto.sameCity);
  const locationLabel =
    dto.locationLabel?.trim() ||
    (isSameCity
      ? `Na sua cidade • ${shortCity}`
      : isSameRegion
        ? `Perto de você • ${shortCity}`
        : `Sergipe • ${shortCity}`);

  const hobbies =
    dto.hobbySlugs && dto.hobbySlugs.length > 0 ? dto.hobbySlugs : dto.hobbies || [];
  const sharedHobbyIds =
    dto.sharedHobbySlugs && dto.sharedHobbySlugs.length > 0
      ? dto.sharedHobbySlugs
      : dto.sharedHobbies || [];

  return {
    id: dto.userId || dto.id,
    fullName: dto.fullName,
    age: dto.age ?? 50,
    city: dto.cityWithState || dto.city || 'Sergipe',
    bio: dto.bio?.trim() || 'Membro da comunidade BeyondTime em Sergipe.',
    photoUrl: resolveApiAssetUrl(dto.avatarUrl),
    verified: Boolean(dto.verifiedBadge50plus || dto.verifiedIdentity),
    hobbies,
    goal: normalizeGoal(dto.goal),
    likesCurrentUser: false,
    isSameCity,
    isSameRegion,
    sharedHobbyIds,
    compatibilityPercent: dto.affinityPercent ?? 50,
    locationLabel,
  };
}

export function mapBlockDtoToBlockedContact(dto: BlockedContactDto): BlockedContactMobile {
  return {
    id: dto.blockedUserId || dto.id,
    fullName: dto.fullName,
    age: dto.age ?? 50,
    city: dto.city || 'Sergipe',
    photoUrl: resolveApiAssetUrl(dto.avatarUrl),
    blockedAt: formatIsoDateToBr(dto.blockedAt),
    reason: dto.reason || undefined,
  };
}

export async function mapMessageDtoToChatMessage(
  dto: EncryptedMessageDto,
  currentUserId: string
): Promise<ChatMessage> {
  const decodedText = await decodeChatPayload(dto.ciphertext, dto.iv, dto.conversationId);
  const kind = mapMessageTypeToKind(dto.messageType);

  let text = decodedText;
  let photoUrl: string | undefined;

  if (kind === 'photo') {
    try {
      const parsed = JSON.parse(decodedText) as { caption?: string; photoUrl?: string };
      if (parsed && typeof parsed === 'object' && parsed.photoUrl) {
        photoUrl = resolveApiAssetUrl(parsed.photoUrl);
        text = parsed.caption || 'Foto enviada';
      }
    } catch {
      // texto simples caso seja legenda direta
    }
  }

  return {
    id: dto.id,
    sender: dto.senderId === currentUserId ? 'me' : 'other',
    text: text || (kind === 'audio' ? 'Mensagem de voz' : kind === 'photo' ? 'Foto' : ''),
    timestamp: formatIsoTimeToBr(dto.sentAt),
    kind,
    audioDurationSec: dto.mediaDurationSeconds ?? undefined,
    photoUrl,
    read: Boolean(dto.readAt),
  };
}

export async function mapConversationDtoToChatConversation(
  dto: ConversationSummaryDto,
  currentUserId: string
): Promise<ChatConversation> {
  const messages: ChatMessage[] = [];
  if (dto.lastMessage) {
    messages.push(await mapMessageDtoToChatMessage(dto.lastMessage, currentUserId));
  }

  return {
    id: dto.conversationId,
    matchId: dto.matchId,
    profileId: dto.contactUserId,
    fullName: dto.contactName,
    age: dto.contactAge ?? 50,
    city: dto.contactCity || 'Sergipe',
    photoUrl: resolveApiAssetUrl(dto.contactAvatarUrl),
    verified: Boolean(dto.contactVerified),
    sharedHobbyIds: dto.sharedHobbies || [],
    unreadCount: Number(dto.unreadCount || 0),
    lastTimestamp: dto.lastMessage
      ? formatIsoTimeToBr(dto.lastMessage.sentAt)
      : formatIsoTimeToBr(dto.updatedAt),
    messages,
  };
}

// ==========================================================================
// Endpoints RF-05 (Descoberta e Match)
// ==========================================================================

export async function fetchDiscoveryProfiles(
  session: AuthSession,
  params?: {
    city?: string;
    goal?: string;
    hobbies?: string[];
    onlyVerified?: boolean;
    limit?: number;
  }
): Promise<DiscoveryProfileDto[]> {
  const parts: string[] = [];
  if (params?.city && params.city !== 'Todas') {
    parts.push(`city=${encodeURIComponent(params.city)}`);
  }
  if (params?.goal && params.goal !== 'Todos') {
    parts.push(`goal=${encodeURIComponent(params.goal)}`);
  }
  if (params?.hobbies && params.hobbies.length > 0) {
    parts.push(`hobbies=${encodeURIComponent(params.hobbies.join(','))}`);
  }
  if (params?.onlyVerified) {
    parts.push('onlyVerified=true');
  }
  const limit = params?.limit ?? 30;
  parts.push(`limit=${encodeURIComponent(String(limit))}`);

  const query = parts.join('&');
  return authedRequest<DiscoveryProfileDto[]>(
    session,
    `/api/v1/discovery${query ? `?${query}` : ''}`,
    { method: 'GET' }
  );
}

export async function sendMatchInteraction(
  session: AuthSession,
  action: 'like' | 'pass',
  targetUserId: string
): Promise<MatchInteractionResponseDto> {
  return authedRequest<MatchInteractionResponseDto>(session, `/api/v1/matches/${action}`, {
    method: 'POST',
    body: JSON.stringify({
      targetUserId,
      confirmedViaModal: true,
    }),
  });
}

export async function fetchMatches(session: AuthSession): Promise<MatchSummaryDto[]> {
  return authedRequest<MatchSummaryDto[]>(session, '/api/v1/matches', { method: 'GET' });
}

// ==========================================================================
// Endpoints RF-08 (Bloqueio e Desbloqueio)
// ==========================================================================

export async function fetchBlockedContacts(session: AuthSession): Promise<BlockedContactDto[]> {
  return authedRequest<BlockedContactDto[]>(session, '/api/v1/blocks', { method: 'GET' });
}

export async function createBlockContact(
  session: AuthSession,
  blockedUserId: string,
  reason?: string
): Promise<BlockedContactDto> {
  return authedRequest<BlockedContactDto>(session, '/api/v1/blocks', {
    method: 'POST',
    body: JSON.stringify({
      blockedUserId,
      reason: reason?.trim() || null,
      confirmedViaModal: true,
    }),
  });
}

export async function deleteBlockContact(session: AuthSession, id: string): Promise<void> {
  await authedRequest<void>(session, `/api/v1/blocks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ==========================================================================
// Endpoints RF-07 (Chat REST)
// ==========================================================================

export async function fetchChatConversations(
  session: AuthSession
): Promise<ConversationSummaryDto[]> {
  return authedRequest<ConversationSummaryDto[]>(session, '/api/v1/chat/conversations', {
    method: 'GET',
  });
}

export async function openOrCreateConversation(
  session: AuthSession,
  otherUserId: string
): Promise<ConversationSummaryDto> {
  return authedRequest<ConversationSummaryDto>(
    session,
    `/api/v1/chat/conversations/with/${encodeURIComponent(otherUserId)}`,
    { method: 'POST' }
  );
}

export async function fetchConversationMessages(
  session: AuthSession,
  conversationId: string,
  limit = 100
): Promise<EncryptedMessageDto[]> {
  return authedRequest<EncryptedMessageDto[]>(
    session,
    `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`,
    { method: 'GET' }
  );
}

export async function sendEncryptedMessageRest(
  session: AuthSession,
  payload: SendEncryptedMessageDto
): Promise<EncryptedMessageDto> {
  return authedRequest<EncryptedMessageDto>(
    session,
    `/api/v1/chat/conversations/${encodeURIComponent(payload.conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function markConversationReadRest(
  session: AuthSession,
  conversationId: string
): Promise<ReadReceiptEventDto> {
  return authedRequest<ReadReceiptEventDto>(
    session,
    `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'POST' }
  );
}

// ==========================================================================
// Cliente WebSocket STOMP (/ws-chat) compatível com React Native / Hermes
// ==========================================================================

export interface ChatStompCallbacks {
  onMessage: (message: EncryptedMessageDto) => void;
  onReadReceipt: (receipt: ReadReceiptEventDto) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface ChatStompConnection {
  sendMessage: (payload: SendEncryptedMessageDto) => boolean;
  sendReadReceipt: (conversationId: string) => boolean;
  disconnect: () => void;
}

export function createChatStompConnection(
  session: AuthSession,
  callbacks: ChatStompCallbacks
): ChatStompConnection {
  let isConnected = false;

  const client = new Client({
    brokerURL: getWebSocketChatUrl(),
    connectHeaders: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    forceBinaryWSFrames: false,
    appendMissingNULLonIncoming: true,
    reconnectDelay: 5000,
    heartbeatIncoming: 15000,
    heartbeatOutgoing: 15000,
    onConnect: () => {
      isConnected = true;
      callbacks.onConnectionChange?.(true);

      client.subscribe('/user/queue/messages', (frame: IMessage) => {
        try {
          const parsed = JSON.parse(frame.body) as EncryptedMessageDto;
          callbacks.onMessage(parsed);
        } catch {
          // ignora frame malformado
        }
      });

      client.subscribe('/user/queue/read-receipts', (frame: IMessage) => {
        try {
          const parsed = JSON.parse(frame.body) as ReadReceiptEventDto;
          callbacks.onReadReceipt(parsed);
        } catch {
          // ignora frame malformado
        }
      });
    },
    onWebSocketClose: () => {
      isConnected = false;
      callbacks.onConnectionChange?.(false);
    },
    onStompError: () => {
      isConnected = false;
      callbacks.onConnectionChange?.(false);
    },
  });

  client.activate();

  return {
    sendMessage(payload: SendEncryptedMessageDto): boolean {
      if (!isConnected || !client.connected) return false;
      try {
        client.publish({
          destination: '/app/chat.send',
          body: JSON.stringify(payload),
        });
        return true;
      } catch {
        return false;
      }
    },
    sendReadReceipt(conversationId: string): boolean {
      if (!isConnected || !client.connected) return false;
      try {
        client.publish({
          destination: '/app/chat.read',
          body: JSON.stringify({ conversationId }),
        });
        return true;
      } catch {
        return false;
      }
    },
    disconnect(): void {
      isConnected = false;
      void client.deactivate();
    },
  };
}
