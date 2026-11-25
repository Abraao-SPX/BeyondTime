/**
 * BeyondTime Mobile (React Native / Expo — br.com.beyondtime)
 * Cliente REST autenticado + WebSocket STOMP (/ws-chat) + Mappers da Onda 2
 * Requisitos: RF-05 (Descoberta e Match), RF-07 (Chat em Tempo Real) e RF-08 (Bloqueio)
 */

import { Client, type IMessage } from '@stomp/stompjs';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { ApiError, refreshSession, type AuthSession } from './authService';
import {
  base64ToBytes,
  bytesToBase64,
  decryptMediaBytes,
  decryptMessageText,
  encryptMediaBytes,
  encryptMessageText,
  ensureUserChatKeyPair,
  type LocalChatKeyPair,
} from './chatE2eeCrypto';
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

export interface UpsertChatKeyVaultDto {
  publicKeyJwk: string;
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfIv: string;
  kdfIterations: number;
  keyAlgorithm: string;
}

export interface ChatKeyVaultResponseDto {
  userId: string;
  publicKeyJwk: string;
  encryptedPrivateKey: string;
  kdfSalt: string;
  kdfIv: string;
  kdfIterations: number;
  keyAlgorithm: string;
  keyVersion: number;
}

export interface PublicChatKeyDto {
  userId: string;
  publicKeyJwk: string;
  keyAlgorithm: string;
  keyVersion: number;
}

export interface ChatMediaUploadResponseDto {
  mediaId: string;
  conversationId: string;
  mediaType: BackendChatMessageType;
  sizeBytes: number;
}

// ==========================================================================
// Helper HTTP autenticado (Authorization: Bearer <accessToken> + refresh 401)
// ==========================================================================

interface ProblemDetailPayload {
  detail?: string;
  title?: string;
  code?: string;
  errors?: Record<string, string>;
}

let inFlightRefreshPromise: Promise<AuthSession | null> | null = null;

async function tryRefreshAuthSession(session: AuthSession): Promise<AuthSession | null> {
  if (!session.refreshToken) return null;
  if (!inFlightRefreshPromise) {
    inFlightRefreshPromise = refreshSession(session.refreshToken)
      .then((refreshed) => {
        session.accessToken = refreshed.accessToken;
        session.refreshToken = refreshed.refreshToken;
        session.expiresInSeconds = refreshed.expiresInSeconds;
        return refreshed;
      })
      .catch(() => null)
      .finally(() => {
        inFlightRefreshPromise = null;
      });
  }
  return inFlightRefreshPromise;
}

async function fetchWithAutoRefresh(
  session: AuthSession,
  path: string,
  buildInit: (accessToken: string) => RequestInit
): Promise<Response> {
  const execute = async (token: string): Promise<Response> => {
    try {
      return await fetch(`${API_BASE_URL}${path}`, buildInit(token));
    } catch {
      throw new ApiError(
        'Não foi possível conectar ao servidor BeyondTime. Verifique sua internet e tente novamente.',
        0,
        'NETWORK_ERROR'
      );
    }
  };

  let response = await execute(session.accessToken);
  if (response.status === 401 && session.refreshToken) {
    const refreshed = await tryRefreshAuthSession(session);
    if (refreshed?.accessToken) {
      response = await execute(refreshed.accessToken);
    }
  }
  return response;
}

async function authedRequest<T>(
  session: AuthSession,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAutoRefresh(session, path, (token) => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)) {
      Object.assign(headers, options.headers as Record<string, string>);
    }
    return {
      ...options,
      headers,
    };
  });

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
// Criptografia E2EE (ECDH P-256 + AES-256-GCM) interoperável Mobile <-> Web
// ==========================================================================

export type { LocalChatKeyPair };

export async function initMobileChatE2ee(session: AuthSession): Promise<LocalChatKeyPair | null> {
  return ensureUserChatKeyPair(session, {
    fetchMyVault: fetchMyChatKeyVault,
    upsertMyVault: upsertMyChatKeyVault,
  });
}

export async function encodeChatPayload(
  plaintext: string,
  conversationId: string,
  myKeyPair: LocalChatKeyPair | null = null,
  peerPublicKeyJwk: string | null | undefined = null
): Promise<{ ciphertext: string; iv: string; senderKeyVersion: number }> {
  return encryptMessageText(plaintext, myKeyPair, peerPublicKeyJwk, conversationId);
}

export async function decodeChatPayload(
  ciphertext: string,
  iv: string,
  conversationId: string,
  myKeyPair: LocalChatKeyPair | null = null,
  peerPublicKeyJwk: string | null | undefined = null
): Promise<string> {
  return decryptMessageText(ciphertext, iv, myKeyPair, peerPublicKeyJwk, conversationId);
}

export { encryptMediaBytes, decryptMediaBytes, bytesToBase64, base64ToBytes };

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
    dto.hobbies && dto.hobbies.length > 0 ? dto.hobbies : dto.hobbySlugs || [];
  const sharedHobbyIds =
    dto.sharedHobbies && dto.sharedHobbies.length > 0
      ? dto.sharedHobbies
      : dto.sharedHobbySlugs || [];

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
  currentUserId: string,
  myKeyPair: LocalChatKeyPair | null = null,
  peerPublicKeyJwk: string | null | undefined = null
): Promise<ChatMessage> {
  const decodedText = await decodeChatPayload(
    dto.ciphertext,
    dto.iv,
    dto.conversationId,
    myKeyPair,
    peerPublicKeyJwk
  );
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
    mediaId: dto.mediaId ?? null,
    mediaIv: dto.mediaIv ?? null,
    mediaMimeType: dto.mediaMimeType ?? null,
    read: Boolean(dto.readAt),
  };
}

export async function mapConversationDtoToChatConversation(
  dto: ConversationSummaryDto,
  currentUserId: string,
  myKeyPair: LocalChatKeyPair | null = null
): Promise<ChatConversation> {
  const messages: ChatMessage[] = [];
  if (dto.lastMessage) {
    messages.push(
      await mapMessageDtoToChatMessage(
        dto.lastMessage,
        currentUserId,
        myKeyPair,
        dto.contactPublicKeyJwk ?? null
      )
    );
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
    contactPublicKeyJwk: dto.contactPublicKeyJwk ?? null,
    contactHasChatKey: Boolean(dto.contactHasChatKey),
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
// Endpoints RF-07 (Cofre de Chaves E2EE e Mídia Binária Cifrada)
// ==========================================================================

export async function fetchMyChatKeyVault(
  session: AuthSession
): Promise<ChatKeyVaultResponseDto | null> {
  try {
    const result = await authedRequest<ChatKeyVaultResponseDto | undefined>(
      session,
      '/api/v1/chat/keys/me',
      { method: 'GET' }
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function upsertMyChatKeyVault(
  session: AuthSession,
  payload: UpsertChatKeyVaultDto
): Promise<ChatKeyVaultResponseDto> {
  return authedRequest<ChatKeyVaultResponseDto>(session, '/api/v1/chat/keys/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchUserPublicChatKey(
  session: AuthSession,
  userId: string
): Promise<PublicChatKeyDto | null> {
  try {
    return await authedRequest<PublicChatKeyDto>(
      session,
      `/api/v1/chat/keys/${encodeURIComponent(userId)}`,
      { method: 'GET' }
    );
  } catch {
    return null;
  }
}

export async function readLocalUriAsBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('data:')) {
    const commaIdx = uri.indexOf(',');
    const b64 = commaIdx >= 0 ? uri.slice(commaIdx + 1) : '';
    return base64ToBytes(b64);
  }
  if (Platform.OS === 'web' || /^https?:\/\//i.test(uri) || uri.startsWith('blob:')) {
    const res = await fetch(uri);
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  }
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(b64);
}

export async function uploadEncryptedChatMedia(
  session: AuthSession,
  conversationId: string,
  mediaType: 'IMAGE' | 'AUDIO',
  encryptedBytes: Uint8Array
): Promise<ChatMediaUploadResponseDto> {
  let tempFileUri: string | null = null;
  try {
    const buildFormData = async (): Promise<FormData> => {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('mediaType', mediaType);

      if (Platform.OS === 'web') {
        const copy = new Uint8Array(encryptedBytes.byteLength);
        copy.set(encryptedBytes);
        const blob = new Blob([copy.buffer], { type: 'application/octet-stream' });
        formData.append('file', blob, `media-${Date.now()}.enc`);
      } else {
        const cacheBase = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
        tempFileUri = `${cacheBase}bt-upload-${Date.now()}-${Math.random().toString(36).slice(2)}.enc`;
        await FileSystem.writeAsStringAsync(tempFileUri, bytesToBase64(encryptedBytes), {
          encoding: FileSystem.EncodingType.Base64,
        });
        formData.append('file', {
          uri: tempFileUri,
          name: `media-${Date.now()}.enc`,
          type: 'application/octet-stream',
        } as unknown as Blob);
      }
      return formData;
    };

    const formData = await buildFormData();
    const response = await fetchWithAutoRefresh(session, '/api/v1/chat/media', (token) => ({
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }));

    if (!response.ok) {
      let message = `Não foi possível enviar a mídia agora (código ${response.status}).`;
      try {
        const data = (await response.json()) as ProblemDetailPayload;
        message = data.detail || data.title || message;
      } catch {
        // ignora payload não-JSON
      }
      throw new ApiError(message, response.status);
    }

    return (await response.json()) as ChatMediaUploadResponseDto;
  } finally {
    if (tempFileUri) {
      void FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => undefined);
    }
  }
}

export async function downloadEncryptedChatMedia(
  session: AuthSession,
  mediaId: string
): Promise<Uint8Array> {
  const response = await fetchWithAutoRefresh(
    session,
    `/api/v1/chat/media/${encodeURIComponent(mediaId)}`,
    (token) => ({
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  );

  if (!response.ok) {
    throw new ApiError(
      `Não foi possível carregar a mídia da conversa (código ${response.status}).`,
      response.status
    );
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function getFileExtensionForMime(mimeType?: string | null, kind?: 'photo' | 'audio'): string {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('mp4') || lower.includes('m4a')) return 'm4a';
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
  return kind === 'audio' ? 'm4a' : 'jpg';
}

export async function decryptChatMediaToUri(
  session: AuthSession,
  mediaId: string,
  mediaIv: string,
  conversationId: string,
  myKeyPair: LocalChatKeyPair | null,
  peerPublicKeyJwk: string | null | undefined,
  mimeType: string | null | undefined,
  kind: 'photo' | 'audio'
): Promise<string | null> {
  try {
    const encryptedBytes = await downloadEncryptedChatMedia(session, mediaId);
    const plainBytes = await decryptMediaBytes(
      encryptedBytes,
      mediaIv,
      myKeyPair,
      peerPublicKeyJwk,
      conversationId
    );
    if (!plainBytes) return null;

    const resolvedMime =
      mimeType || (kind === 'audio' ? 'audio/mp4' : 'image/jpeg');
    if (Platform.OS === 'web') {
      return `data:${resolvedMime};base64,${bytesToBase64(plainBytes)}`;
    }

    const cacheBase = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!cacheBase) {
      return `data:${resolvedMime};base64,${bytesToBase64(plainBytes)}`;
    }
    const ext = getFileExtensionForMime(resolvedMime, kind);
    const localUri = `${cacheBase}bt-media-${mediaId}.${ext}`;
    await FileSystem.writeAsStringAsync(localUri, bytesToBase64(plainBytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return localUri;
  } catch {
    return null;
  }
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
