import type { AuthSession, ConnectionGoal } from '../types/auth';
import type { BlockedContact, ScoredCandidate } from '../types/wave2';
import { ApiError, fetchWithSessionRefresh, resolveApiAssetUrl } from './apiClient';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function getWebSocketChatUrl(): string {
  if (API_BASE_URL) {
    const wsBase = API_BASE_URL.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
    return `${wsBase}/ws-chat`;
  }
  if (typeof window !== 'undefined' && window.location?.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws-chat`;
  }
  return '/ws-chat';
}

// ==========================================================================
// DTOs de Contrato do Backend Spring Boot (RF-05, RF-07, RF-08)
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

export interface AntifraudCheckResponseDto {
  alert: boolean;
  riskLabel: string;
  confidencePercent: number;
  educationalTitle: string | null;
  educationalMessage: string | null;
}

// ==========================================================================
// Helper HTTP autenticado (unificado com apiClient.ts — AUD-019 / AUD-020)
// ==========================================================================

async function authedRequest<T>(
  session: AuthSession,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithSessionRefresh(session, path, (token) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    return {
      ...options,
      headers,
    };
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir esta ação agora. Tente novamente em instantes.';
    let code: string | undefined;
    try {
      const data = (await response.json()) as {
        detail?: string;
        title?: string;
        code?: string;
      };
      message = data.detail || data.title || message;
      code = data.code;
    } catch {
      // ignora payload não-JSON
    }
    if (code === 'CONVERSATION_NOT_ALLOWED') {
      message = 'Você precisa ter uma conexão ativa com esta pessoa para iniciar a conversa.';
    } else if (code === 'INVALID_CHAT_MEDIA') {
      message = 'Não foi possível anexar esta foto ou áudio. Tente novamente.';
    } else if (response.status === 413 || code === 'MEDIA_TOO_LARGE') {
      message = 'O arquivo escolhido é muito grande (máximo 8 MB). Escolha um arquivo menor.';
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// ==========================================================================
// Mappers DTO -> UI
// ==========================================================================

export function normalizeConnectionGoal(raw?: string | null): ConnectionGoal {
  if (raw === 'Relacionamento' || raw === 'Companhia' || raw === 'Amizade') {
    return raw;
  }
  return 'Amizade';
}

export function formatIsoTimeToBr(iso?: string | null): string {
  if (!iso) return 'Agora';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Agora';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatIsoDateToBr(iso?: string | null): string {
  if (!iso) return new Date().toLocaleDateString('pt-BR');
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('pt-BR');
}

export function mapDiscoveryDtoToCandidate(dto: DiscoveryProfileDto): ScoredCandidate {
  return {
    id: dto.userId || dto.id,
    fullName: dto.fullName,
    age: dto.age,
    city: dto.city,
    neighborhood: dto.neighborhood || dto.locationLabel || dto.city,
    goal: normalizeConnectionGoal(dto.goal),
    bio: dto.bio?.trim() || 'Membro da comunidade BeyondTime em Sergipe.',
    avatarUrl: resolveApiAssetUrl(dto.avatarUrl) || '/assets/perfil-helena.svg',
    verifiedIdentity: Boolean(dto.verifiedBadge50plus || dto.verifiedIdentity),
    hobbies: dto.hobbies || [],
    likesBack: false,
    lastActiveLabel: dto.locationLabel || (dto.sameCity ? `Na sua cidade · ${dto.city}` : dto.city),
    affinityPercent: dto.affinityPercent,
    sharedHobbies: dto.sharedHobbies || [],
    sameCity: dto.sameCity,
  };
}

export function mapBlockDtoToBlockedContact(dto: BlockedContactDto): BlockedContact {
  return {
    id: dto.blockedUserId || dto.id,
    fullName: dto.fullName,
    age: dto.age,
    city: dto.city,
    avatarUrl: resolveApiAssetUrl(dto.avatarUrl) || '/assets/perfil-helena.svg',
    blockedAt: formatIsoDateToBr(dto.blockedAt),
    reason: dto.reason || undefined,
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
  const qs = new URLSearchParams();
  if (params?.city && params.city !== 'Todas') qs.set('city', params.city);
  if (params?.goal && params.goal !== 'Todos') qs.set('goal', params.goal);
  if (params?.hobbies && params.hobbies.length > 0) qs.set('hobbies', params.hobbies.join(','));
  if (params?.onlyVerified) qs.set('onlyVerified', 'true');
  if (params?.limit) qs.set('limit', String(params.limit));

  const query = qs.toString();
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
// Endpoints RF-07 (Chat REST + Chaves E2EE)
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
  limit = 100,
  before?: string
): Promise<EncryptedMessageDto[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (before && before.trim()) {
    qs.set('before', before.trim());
  }
  return authedRequest<EncryptedMessageDto[]>(
    session,
    `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages?${qs.toString()}`,
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
  } catch (err) {
    // Somente 404 indica ausência real de cofre no servidor.
    // Erros 5xx/rede devem propagar para impedir geração acidental de chave nova sobrescrevendo o cofre.
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
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

export async function uploadEncryptedChatMedia(
  session: AuthSession,
  conversationId: string,
  mediaType: 'IMAGE' | 'AUDIO',
  encryptedBytes: Uint8Array
): Promise<ChatMediaUploadResponseDto> {
  const copy = new Uint8Array(encryptedBytes.byteLength);
  copy.set(encryptedBytes);
  const blob = new Blob([copy.buffer], { type: 'application/octet-stream' });

  const response = await fetchWithSessionRefresh(session, '/api/v1/chat/media', (token) => {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('mediaType', mediaType);
    formData.append('file', blob, `media-${Date.now()}.enc`);
    return {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };
  });

  if (!response.ok) {
    let message =
      response.status === 413
        ? 'O arquivo escolhido é muito grande (máximo 8 MB). Escolha um arquivo menor.'
        : 'Não foi possível enviar esta foto ou áudio agora. Tente novamente.';
    try {
      const data = (await response.json()) as { detail?: string; title?: string };
      message = data.detail || data.title || message;
    } catch {
      // ignora payload não-JSON
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as ChatMediaUploadResponseDto;
}

export async function downloadEncryptedChatMedia(
  session: AuthSession,
  mediaId: string
): Promise<Uint8Array> {
  const response = await fetchWithSessionRefresh(
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
      'Não foi possível carregar esta foto ou áudio agora.',
      response.status
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

// ==========================================================================
// Endpoint RF-12 / RF-07 (Proxy Stateless ML Anti-Fraude — Anjo da Guarda)
// ==========================================================================

export async function checkChatMessageAntifraud(
  session: AuthSession,
  text: string
): Promise<AntifraudCheckResponseDto | null> {
  const normalized = text.trim();
  if (normalized.length < 6) {
    return null;
  }

  try {
    return await authedRequest<AntifraudCheckResponseDto>(session, '/api/v1/chat/antifraud/check', {
      method: 'POST',
      body: JSON.stringify({ text: normalized.slice(0, 4000) }),
    });
  } catch {
    // Análise anti-fraude é assíncrona e resiliente: nunca trava nem interrompe o chat
    return null;
  }
}
