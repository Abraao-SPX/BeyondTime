import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeAffinityCandidates,
  createBlockedEntry,
  createOutgoingMessage,
  createThreadFromCandidate,
  getHobbyLabel,
  loadWave2State,
  saveWave2State,
  SERGIPE_DISCOVERY_CATALOG,
} from '../../services/wave2Service';
import {
  createBlockContact,
  deleteBlockContact,
  downloadEncryptedChatMedia,
  fetchBlockedContacts,
  fetchChatConversations,
  fetchConversationMessages,
  fetchDiscoveryProfiles,
  formatIsoTimeToBr,
  mapBlockDtoToBlockedContact,
  mapDiscoveryDtoToCandidate,
  markConversationReadRest,
  normalizeConnectionGoal,
  openOrCreateConversation,
  sendEncryptedMessageRest,
  sendMatchInteraction,
  uploadEncryptedChatMedia,
  type BackendChatMessageType,
  type ConversationSummaryDto,
  type EncryptedMessageDto,
} from '../../services/wave2ApiClient';
import {
  decryptMediaBytes,
  decryptMessageText,
  encryptMediaBytes,
  encryptMessageText,
  ensureUserChatKeyPair,
  type LocalChatKeyPair,
} from '../../services/chatE2eeCrypto';
import {
  createChatStompConnection,
  type ChatStompConnection,
} from '../../services/chatStompClient';
import type { AuthSession, ConnectionGoal } from '../../types/auth';
import { ApiError, resolveApiAssetUrl, type ServerProfile } from '../../services/apiClient';
import type {
  BlockedContact,
  ChatMessage,
  ChatThread,
  OutgoingMessagePayload,
  ScoredCandidate,
  Wave2State,
  WorkspaceTabId,
} from '../../types/wave2';
import { BlockContactModalRF08 } from './BlockContactModalRF08';
import { BlockedContactsPanelRF08 } from './BlockedContactsPanelRF08';
import { FacialVerificationQrModal } from './FacialVerificationQrModal';
import { MatchAffinityFeedRF05 } from './MatchAffinityFeedRF05';
import { SimplifiedChatRF07 } from './SimplifiedChatRF07';

interface AuthenticatedWorkspaceProps {
  authSession: AuthSession;
  serverProfile: ServerProfile | null;
  displayFullName: string;
  displayAge?: number | null;
  displayCity?: string;
  displayGoal?: string;
  displayHobbies?: string[];
  displayAvatarUrl: string | null;
  onEditProfile: () => void;
  onRequestDeleteAccount: () => void;
  onLogout: () => void;
}

function formatSergipeLocation(city?: string): string {
  const cleaned = (city || '')
    .replace(/\s*\(\s*SE\s*\)/gi, '')
    .replace(/\s*[-,/]\s*(SE|Sergipe)\b/gi, '')
    .trim();
  return cleaned ? `${cleaned}, Sergipe` : 'Sergipe';
}

function formatAudioDurationLabel(seconds?: number | null): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const MAX_ENCRYPTED_MEDIA_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_DURATION_SECONDS = 600;

function parseDurationLabelToSeconds(label?: string): number {
  if (!label) return 1;
  const match = /^(\d+):(\d{2})$/.exec(label.trim());
  if (!match) return 1;
  const parsed = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(MAX_AUDIO_DURATION_SECONDS, Math.floor(parsed));
}

type PendingBlockTarget = Pick<BlockedContact, 'id' | 'fullName' | 'age' | 'city' | 'avatarUrl'>;

export function AuthenticatedWorkspace({
  authSession,
  serverProfile,
  displayFullName,
  displayAge = null,
  displayCity,
  displayGoal,
  displayHobbies,
  displayAvatarUrl,
  onEditProfile,
  onRequestDeleteAccount,
  onLogout,
}: AuthenticatedWorkspaceProps) {
  const isPreviewMode = import.meta.env.DEV && authSession.userId === 'dev-preview-50plus';

  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('discover');
  const [wave2State, setWave2State] = useState<Wave2State>(() =>
    loadWave2State(authSession.email)
  );
  const [serverCandidates, setServerCandidates] = useState<ScoredCandidate[]>([]);
  const [serverThreads, setServerThreads] = useState<ChatThread[]>([]);
  const [serverBlocked, setServerBlocked] = useState<BlockedContact[]>([]);
  const [filterGoal, setFilterGoal] = useState<ConnectionGoal | 'Todos'>('Todos');
  const [filterCity, setFilterCity] = useState<string>('Todas');
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(() => !isPreviewMode);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState<boolean>(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [recentMatch, setRecentMatch] = useState<ScoredCandidate | null>(null);
  const [pendingBlock, setPendingBlock] = useState<PendingBlockTarget | null>(null);
  const [safetyFeedback, setSafetyFeedback] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const myKeyPairRef = useRef<LocalChatKeyPair | null>(null);
  const stompRef = useRef<ChatStompConnection | null>(null);
  const loadedHistoryIdsRef = useRef<Set<string>>(new Set());
  const createdObjectUrlsRef = useRef<Set<string>>(new Set());
  const prevFiltersRef = useRef<{ city: string; goal: ConnectionGoal | 'Todos' }>({
    city: filterCity,
    goal: filterGoal,
  });
  const activeTabRef = useRef<WorkspaceTabId>(activeTab);
  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  const serverThreadsRef = useRef<ChatThread[]>(serverThreads);

  activeTabRef.current = activeTab;
  activeThreadIdRef.current = activeThreadId;
  serverThreadsRef.current = serverThreads;

  useEffect(() => {
    const urls = createdObjectUrlsRef.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  const hydrateRemoteMessage = useCallback(
    async (
      dto: EncryptedMessageDto,
      peerPublicKeyJwk: string | null | undefined
    ): Promise<ChatMessage> => {
      const text = await decryptMessageText(
        dto.ciphertext,
        dto.iv,
        myKeyPairRef.current,
        peerPublicKeyJwk,
        dto.conversationId
      );

      let imageUrl: string | undefined;
      let audioUrl: string | undefined;
      if (dto.mediaId && dto.mediaIv && (dto.messageType === 'IMAGE' || dto.messageType === 'AUDIO')) {
        try {
          const encryptedBlob = await downloadEncryptedChatMedia(authSession, dto.mediaId);
          const plainBytes = await decryptMediaBytes(
            encryptedBlob,
            dto.mediaIv,
            myKeyPairRef.current,
            peerPublicKeyJwk,
            dto.conversationId
          );
          if (plainBytes) {
            const mime =
              dto.mediaMimeType || (dto.messageType === 'AUDIO' ? 'audio/mp4' : 'image/jpeg');
            const objectUrl = URL.createObjectURL(
              new Blob([plainBytes.buffer as ArrayBuffer], { type: mime })
            );
            createdObjectUrlsRef.current.add(objectUrl);
            if (dto.messageType === 'IMAGE') {
              imageUrl = objectUrl;
            } else {
              audioUrl = objectUrl;
            }
          }
        } catch {
          // mantém fallback textual se o blob de mídia não puder ser baixado
        }
      }

      return {
        id: dto.id,
        sender: dto.senderId === authSession.userId ? 'me' : 'them',
        text,
        sentAt: formatIsoTimeToBr(dto.sentAt),
        imageUrl,
        audioUrl,
        audioDurationLabel: formatAudioDurationLabel(dto.mediaDurationSeconds),
      };
    },
    [authSession]
  );

  // O selo só é exibido quando o backend confirma a verificação (RF-11).
  const isFaciallyVerified = serverProfile?.verifiedBadge50plus === true;

  useEffect(() => {
    if (isPreviewMode) {
      saveWave2State(authSession.email, wave2State);
    }
  }, [authSession.email, isPreviewMode, wave2State]);

  const mapConversationDtoToThread = useCallback(
    async (dto: ConversationSummaryDto): Promise<ChatThread> => {
      const messages: ChatMessage[] = [];
      if (dto.lastMessage) {
        const text = await decryptMessageText(
          dto.lastMessage.ciphertext,
          dto.lastMessage.iv,
          myKeyPairRef.current,
          dto.contactPublicKeyJwk,
          dto.conversationId
        );
        messages.push({
          id: dto.lastMessage.id,
          sender: dto.lastMessage.senderId === authSession.userId ? 'me' : 'them',
          text,
          sentAt: formatIsoTimeToBr(dto.lastMessage.sentAt),
        });
      }
      return {
        conversationId: dto.conversationId,
        contactId: dto.contactUserId,
        contactName: dto.contactName,
        contactAge: dto.contactAge ?? 50,
        contactCity: dto.contactCity || 'Aracaju',
        contactAvatarUrl: resolveApiAssetUrl(dto.contactAvatarUrl) || '/assets/perfil-helena.svg',
        contactGoal: normalizeConnectionGoal(dto.contactGoal),
        affinityPercent: dto.affinityPercent,
        sharedHobbies: dto.sharedHobbies || [],
        verifiedIdentity: Boolean(dto.contactVerified),
        contactPublicKeyJwk: dto.contactPublicKeyJwk ?? null,
        contactHasChatKey: dto.contactHasChatKey,
        unreadCount: Number(dto.unreadCount || 0),
        messages,
      };
    },
    [authSession.userId]
  );

  const reloadRemoteDiscovery = useCallback(
    async (cityFilter: string, goalFilter: ConnectionGoal | 'Todos') => {
      if (isPreviewMode) return;
      setIsLoadingDiscovery(true);
      try {
        const dtos = await fetchDiscoveryProfiles(authSession, {
          city: cityFilter,
          goal: goalFilter,
          limit: 30,
        });
        setServerCandidates(dtos.map(mapDiscoveryDtoToCandidate));
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar as sugestões de pessoas agora.';
        setSafetyFeedback(msg);
      } finally {
        setIsLoadingDiscovery(false);
      }
    },
    [authSession, isPreviewMode]
  );

  const reloadRemoteConversations = useCallback(async (): Promise<ChatThread[]> => {
    if (isPreviewMode) return [];
    try {
      const dtos = await fetchChatConversations(authSession);
      const mapped = await Promise.all(dtos.map(mapConversationDtoToThread));
      setServerThreads((prev) => {
        const prevByConv = new Map(prev.map((t) => [t.conversationId, t]));
        return mapped.map((nextThread) => {
          const existing = nextThread.conversationId
            ? prevByConv.get(nextThread.conversationId)
            : undefined;
          // Preserva histórico completo já carregado mesclando novas mensagens sem duplicatas
          if (existing && existing.messages.length > 0) {
            const merged = new Map<string, ChatMessage>();
            for (const m of existing.messages) {
              merged.set(m.id, m);
            }
            for (const m of nextThread.messages) {
              if (!merged.has(m.id)) {
                merged.set(m.id, m);
              }
            }
            return { ...nextThread, messages: Array.from(merged.values()) };
          }
          return nextThread;
        });
      });
      return mapped;
    } catch {
      // erro tratado no carregamento inicial
      return [];
    }
  }, [authSession, isPreviewMode, mapConversationDtoToThread]);

  // Carga inicial + inicialização E2EE + conexão WebSocket STOMP (/ws-chat)
  useEffect(() => {
    if (isPreviewMode) return;
    let cancelled = false;

    async function bootstrapRealWave2() {
      myKeyPairRef.current = await ensureUserChatKeyPair(authSession);
      if (cancelled) return;
      if (myKeyPairRef.current?.warningMessage) {
        setSafetyFeedback(myKeyPairRef.current.warningMessage);
      }

      try {
        const [discDtos, convDtos, blockDtos] = await Promise.all([
          fetchDiscoveryProfiles(authSession, { limit: 30 }),
          fetchChatConversations(authSession),
          fetchBlockedContacts(authSession),
        ]);
        if (cancelled) return;

        setServerCandidates(discDtos.map(mapDiscoveryDtoToCandidate));
        setServerBlocked(blockDtos.map(mapBlockDtoToBlockedContact));
        const mappedThreads = await Promise.all(convDtos.map(mapConversationDtoToThread));
        if (!cancelled) {
          setServerThreads(mappedThreads);
        }
      } catch (err) {
        if (!cancelled) {
          setSafetyFeedback(
            err instanceof ApiError
              ? err.message
              : 'Não foi possível conectar ao servidor BeyondTime para carregar conexões reais.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorkspace(false);
        }
      }

      if (cancelled) return;
      const stomp = createChatStompConnection(authSession, {
        onMessage: (incoming: EncryptedMessageDto) => {
          void (async () => {
            let existingThread = serverThreadsRef.current.find(
              (t) => t.conversationId === incoming.conversationId
            );
            if (!existingThread) {
              const refreshed = await reloadRemoteConversations();
              if (cancelled) return;
              existingThread =
                refreshed.find((t) => t.conversationId === incoming.conversationId) ??
                serverThreadsRef.current.find((t) => t.conversationId === incoming.conversationId);
            }
            const peerKey = existingThread?.contactPublicKeyJwk ?? null;

            const uiMsg = await hydrateRemoteMessage(incoming, peerKey);
            if (cancelled) return;
            const isFromMe = incoming.senderId === authSession.userId;

            setServerThreads((prev) =>
              prev.map((thread) => {
                if (thread.conversationId !== incoming.conversationId) return thread;
                if (thread.messages.some((m) => m.id === uiMsg.id)) return thread;
                const isOpenNow =
                  activeTabRef.current === 'chat' &&
                  (activeThreadIdRef.current === thread.contactId ||
                    (activeThreadIdRef.current === null && prev[0]?.contactId === thread.contactId));
                return {
                  ...thread,
                  unreadCount: isFromMe || isOpenNow ? 0 : thread.unreadCount + 1,
                  messages: [...thread.messages, uiMsg],
                };
              })
            );
          })();
        },
        onReadReceipt: (receipt) => {
          if (cancelled) return;
          if (receipt.readerId === authSession.userId) {
            setServerThreads((prev) =>
              prev.map((t) =>
                t.conversationId === receipt.conversationId ? { ...t, unreadCount: 0 } : t
              )
            );
          }
        },
        onError: (message) => {
          if (!cancelled) {
            setSafetyFeedback(message);
          }
        },
        onReconnect: () => {
          if (cancelled) return;
          loadedHistoryIdsRef.current.clear();
          void reloadRemoteConversations();
        },
      });
      stompRef.current = stomp;
    }

    void bootstrapRealWave2();

    return () => {
      cancelled = true;
      stompRef.current?.disconnect();
      stompRef.current = null;
    };
  }, [authSession, hydrateRemoteMessage, isPreviewMode, mapConversationDtoToThread, reloadRemoteConversations]);

  // Recarrega descoberta somente quando usuário muda filtros de cidade ou objetivo (seguro em React StrictMode)
  useEffect(() => {
    if (isPreviewMode) return;
    if (
      prevFiltersRef.current.city === filterCity &&
      prevFiltersRef.current.goal === filterGoal
    ) {
      return;
    }
    prevFiltersRef.current = { city: filterCity, goal: filterGoal };
    void reloadRemoteDiscovery(filterCity, filterGoal);
  }, [filterCity, filterGoal, isPreviewMode, reloadRemoteDiscovery]);

  const userHobbies = useMemo<string[]>(() => {
    const source = serverProfile?.hobbies?.length ? serverProfile.hobbies : displayHobbies;
    if (!source || source.length === 0) return [];
    return source;
  }, [serverProfile?.hobbies, displayHobbies]);

  const userCity = displayCity || serverProfile?.city || 'Aracaju';
  const userGoal = ((displayGoal || serverProfile?.goal) as ConnectionGoal | undefined) ?? null;

  const availableCities = useMemo(() => {
    const baseCities = SERGIPE_DISCOVERY_CATALOG.map((c) => c.city);
    const remoteCities = serverCandidates.map((c) => c.city);
    return Array.from(new Set([...baseCities, ...remoteCities])).sort();
  }, [serverCandidates]);

  const previewCandidates = useMemo(
    () =>
      computeAffinityCandidates(
        userHobbies,
        userCity,
        userGoal,
        wave2State,
        filterGoal,
        filterCity
      ),
    [userHobbies, userCity, userGoal, wave2State, filterGoal, filterCity]
  );

  const candidates = isPreviewMode ? previewCandidates : serverCandidates;
  const activeBlockedContacts = isPreviewMode ? wave2State.blockedContacts : serverBlocked;

  const visibleThreads = useMemo(() => {
    const blockedIds = new Set(activeBlockedContacts.map((b) => b.id));
    const sourceThreads = isPreviewMode ? wave2State.threads : serverThreads;
    return sourceThreads.filter((t) => !blockedIds.has(t.contactId));
  }, [activeBlockedContacts, isPreviewMode, serverThreads, wave2State.threads]);

  const totalUnread = useMemo(
    () => visibleThreads.reduce((acc, thread) => acc + thread.unreadCount, 0),
    [visibleThreads]
  );

  // Carrega histórico real de mensagens quando uma conversa é aberta na aba Conversas
  useEffect(() => {
    if (isPreviewMode || activeTab !== 'chat') return;
    const displayedThread =
      visibleThreads.find((t) => t.contactId === activeThreadId) ?? visibleThreads[0] ?? null;
    if (!displayedThread?.conversationId) return;

    const convId = displayedThread.conversationId;
    if (loadedHistoryIdsRef.current.has(convId)) return;
    loadedHistoryIdsRef.current.add(convId);

    let cancelled = false;
    void (async () => {
      try {
        const dtos = await fetchConversationMessages(authSession, convId, 100);
        if (cancelled) {
          loadedHistoryIdsRef.current.delete(convId);
          return;
        }
        const decrypted: ChatMessage[] = await Promise.all(
          dtos.map((m) => hydrateRemoteMessage(m, displayedThread.contactPublicKeyJwk))
        );
        if (cancelled) {
          loadedHistoryIdsRef.current.delete(convId);
          return;
        }
        setServerThreads((prev) =>
          prev.map((t) => {
            if (t.conversationId !== convId) return t;
            const byId = new Map<string, ChatMessage>();
            for (const msg of decrypted) {
              byId.set(msg.id, msg);
            }
            for (const msg of t.messages) {
              if (!byId.has(msg.id)) {
                byId.set(msg.id, msg);
              }
            }
            return { ...t, messages: Array.from(byId.values()) };
          })
        );
      } catch {
        loadedHistoryIdsRef.current.delete(convId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, activeThreadId, authSession, hydrateRemoteMessage, isPreviewMode, visibleThreads]);

  // Zera automaticamente o contador de não lidas da conversa aberta no painel direito
  // (inclusive quando outra conversa assume o foco após um bloqueio em RF-08).
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const displayedThread =
      visibleThreads.find((t) => t.contactId === activeThreadId) ?? visibleThreads[0] ?? null;
    if (!displayedThread || displayedThread.unreadCount === 0) return;

    if (isPreviewMode) {
      setWave2State((prev) => ({
        ...prev,
        threads: prev.threads.map((thread) =>
          thread.contactId === displayedThread.contactId
            ? { ...thread, unreadCount: 0 }
            : thread
        ),
      }));
    } else {
      setServerThreads((prev) =>
        prev.map((thread) =>
          thread.contactId === displayedThread.contactId
            ? { ...thread, unreadCount: 0 }
            : thread
        )
      );
      if (displayedThread.conversationId) {
        const sentViaStomp = stompRef.current?.sendReadReceipt(displayedThread.conversationId);
        if (!sentViaStomp) {
          void markConversationReadRest(authSession, displayedThread.conversationId).catch(() => {});
        }
      }
    }
  }, [activeTab, activeThreadId, authSession, isPreviewMode, visibleThreads]);

  function handlePassCandidate(candidate: ScoredCandidate) {
    setSafetyFeedback(null);
    if (isPreviewMode) {
      setWave2State((prev) => ({
        ...prev,
        passedIds: prev.passedIds.includes(candidate.id)
          ? prev.passedIds
          : [...prev.passedIds, candidate.id],
      }));
      return;
    }

    setServerCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    void sendMatchInteraction(authSession, 'pass', candidate.id).catch((err) => {
      setServerCandidates((prev) =>
        prev.some((c) => c.id === candidate.id) ? prev : [candidate, ...prev]
      );
      setSafetyFeedback(
        err instanceof ApiError ? err.message : 'Não foi possível registrar essa ação agora.'
      );
    });
  }

  function handleConnectCandidate(candidate: ScoredCandidate) {
    setSafetyFeedback(null);
    if (isPreviewMode) {
      setWave2State((prev) => {
        const nextLikedIds = prev.likedIds.includes(candidate.id)
          ? prev.likedIds
          : [...prev.likedIds, candidate.id];

        const alreadyHasThread = prev.threads.some((t) => t.contactId === candidate.id);
        const nextThreads =
          candidate.likesBack && !alreadyHasThread
            ? [createThreadFromCandidate(candidate), ...prev.threads]
            : prev.threads;

        return {
          ...prev,
          likedIds: nextLikedIds,
          threads: nextThreads,
        };
      });

      if (candidate.likesBack) {
        setRecentMatch(candidate);
      } else {
        setSafetyFeedback(
          `Você curtiu ${candidate.fullName}. Se a pessoa também curtir você, a conversa aparecerá em Conversas.`
        );
      }
      return;
    }

    setServerCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    void (async () => {
      try {
        const res = await sendMatchInteraction(authSession, 'like', candidate.id);
        if (res.matched) {
          setRecentMatch(candidate);
          await reloadRemoteConversations();
        } else {
          setSafetyFeedback(
            `Você curtiu ${candidate.fullName}. Se a pessoa também curtir você, a conversa aparecerá em Conversas.`
          );
        }
      } catch (err) {
        setServerCandidates((prev) =>
          prev.some((c) => c.id === candidate.id) ? prev : [candidate, ...prev]
        );
        setSafetyFeedback(
          err instanceof ApiError ? err.message : 'Não foi possível registrar sua curtida agora.'
        );
      }
    })();
  }

  function handleOpenMatchChat(contactId: string) {
    setRecentMatch(null);
    setActiveThreadId(contactId);
    setActiveTab('chat');
    if (isPreviewMode) {
      setWave2State((prev) => ({
        ...prev,
        threads: prev.threads.map((thread) =>
          thread.contactId === contactId ? { ...thread, unreadCount: 0 } : thread
        ),
      }));
    } else {
      void reloadRemoteConversations();
    }
  }

  function handleSelectThread(contactId: string) {
    setActiveThreadId(contactId);
    if (isPreviewMode) {
      setWave2State((prev) => ({
        ...prev,
        threads: prev.threads.map((thread) =>
          thread.contactId === contactId ? { ...thread, unreadCount: 0 } : thread
        ),
      }));
    } else {
      setServerThreads((prev) =>
        prev.map((thread) =>
          thread.contactId === contactId ? { ...thread, unreadCount: 0 } : thread
        )
      );
    }
  }

  async function handleSendMessage(
    contactId: string,
    payload: string | OutgoingMessagePayload
  ): Promise<boolean> {
    const outgoing = createOutgoingMessage(payload);
    if (isPreviewMode) {
      setWave2State((prev) => ({
        ...prev,
        threads: prev.threads.map((thread) =>
          thread.contactId === contactId
            ? {
                ...thread,
                unreadCount: 0,
                messages: [...thread.messages, outgoing],
              }
            : thread
        ),
      }));
      return true;
    }

    const richPayload = typeof payload === 'string' ? null : payload;
    const plainText =
      typeof payload === 'string'
        ? payload.trim()
        : (payload.text?.trim() ||
            (payload.audioUrl ? 'Mensagem de voz' : payload.imageUrl ? 'Foto enviada' : ''));
    if (!plainText) return false;

    try {
      let targetThread = serverThreads.find((t) => t.contactId === contactId);
      let conversationId = targetThread?.conversationId;
      if (!conversationId) {
        const opened = await openOrCreateConversation(authSession, contactId);
        conversationId = opened.conversationId;
        const mapped = await mapConversationDtoToThread(opened);
        targetThread = mapped;
        setServerThreads((prev) =>
          prev.some((t) => t.conversationId === mapped.conversationId) ? prev : [mapped, ...prev]
        );
      }

      const peerKey = targetThread?.contactPublicKeyJwk ?? null;
      let messageType: BackendChatMessageType = 'TEXT';
      let mediaId: string | null = null;
      let mediaIv: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaDurationSeconds: number | null = null;

      const mediaDataUrl = richPayload?.imageUrl || richPayload?.audioUrl;
      if (mediaDataUrl) {
        const isAudio = Boolean(richPayload?.audioUrl && !richPayload?.imageUrl);
        messageType = isAudio ? 'AUDIO' : 'IMAGE';
        const res = await fetch(mediaDataUrl);
        const rawBytes = new Uint8Array(await res.arrayBuffer());
        const mimeMatch = /^data:([^;,]+)/i.exec(mediaDataUrl);
        mediaMimeType = mimeMatch?.[1] || (isAudio ? 'audio/mp4' : 'image/jpeg');
        const encryptedMedia = await encryptMediaBytes(
          rawBytes,
          myKeyPairRef.current,
          peerKey,
          conversationId
        );
        if (encryptedMedia.encryptedBytes.byteLength > MAX_ENCRYPTED_MEDIA_BYTES) {
          throw new ApiError(
            'O arquivo escolhido ficou grande demais para envio (limite de 8 MB). Tente uma foto ou áudio menor.',
            413
          );
        }
        const uploaded = await uploadEncryptedChatMedia(
          authSession,
          conversationId,
          messageType,
          encryptedMedia.encryptedBytes
        );
        mediaId = uploaded.mediaId;
        mediaIv = encryptedMedia.mediaIv;
        if (isAudio) {
          mediaDurationSeconds = parseDurationLabelToSeconds(richPayload?.audioDurationLabel);
        }
      }

      const encrypted = await encryptMessageText(
        plainText,
        myKeyPairRef.current,
        peerKey,
        conversationId
      );

      const requestDto = {
        conversationId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        messageType,
        mediaId,
        mediaIv,
        mediaMimeType,
        mediaDurationSeconds,
        senderKeyVersion: encrypted.senderKeyVersion,
      };

      const sentViaStomp = stompRef.current?.sendMessage(requestDto);
      if (!sentViaStomp) {
        const saved = await sendEncryptedMessageRest(authSession, requestDto);
        const confirmedMsg: ChatMessage = {
          id: saved.id,
          sender: 'me',
          text: plainText,
          sentAt: formatIsoTimeToBr(saved.sentAt),
          imageUrl: richPayload?.imageUrl,
          imageName: richPayload?.imageName,
          audioUrl: richPayload?.audioUrl,
          audioDurationLabel:
            richPayload?.audioDurationLabel ?? formatAudioDurationLabel(mediaDurationSeconds),
        };
        setServerThreads((prev) =>
          prev.map((t) =>
            t.conversationId === conversationId &&
            !t.messages.some((m) => m.id === confirmedMsg.id)
              ? { ...t, unreadCount: 0, messages: [...t.messages, confirmedMsg] }
              : t
          )
        );
      }
      return true;
    } catch (err) {
      setSafetyFeedback(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível enviar a mensagem agora. Tente novamente.'
      );
      return false;
    }
  }

  function handleConfirmBlock(reason?: string) {
    if (!pendingBlock) return;
    const target = pendingBlock;

    if (isPreviewMode) {
      const blockedEntry = createBlockedEntry(target, reason);
      setWave2State((prev) => ({
        ...prev,
        blockedContacts: prev.blockedContacts.some((b) => b.id === blockedEntry.id)
          ? prev.blockedContacts
          : [blockedEntry, ...prev.blockedContacts],
        threads: prev.threads.filter((t) => t.contactId !== blockedEntry.id),
      }));

      if (activeThreadId === blockedEntry.id) setActiveThreadId(null);
      if (recentMatch?.id === blockedEntry.id) setRecentMatch(null);

      setSafetyFeedback(
        `${blockedEntry.fullName} foi bloqueado(a) com segurança e ocultado(a) imediatamente do seu feed e das suas conversas.`
      );
      setPendingBlock(null);
      return;
    }

    setPendingBlock(null);
    void (async () => {
      try {
        const dto = await createBlockContact(authSession, target.id, reason);
        const mapped = mapBlockDtoToBlockedContact(dto);
        setServerBlocked((prev) => (prev.some((b) => b.id === mapped.id) ? prev : [mapped, ...prev]));
        setServerThreads((prev) => prev.filter((t) => t.contactId !== target.id));
        setServerCandidates((prev) => prev.filter((c) => c.id !== target.id));
        if (activeThreadId === target.id) setActiveThreadId(null);
        if (recentMatch?.id === target.id) setRecentMatch(null);
        setSafetyFeedback(
          `${target.fullName} foi bloqueado(a) com segurança e ocultado(a) imediatamente do seu feed e das suas conversas.`
        );
      } catch (err) {
        setSafetyFeedback(
          err instanceof ApiError ? err.message : 'Não foi possível concluir o bloqueio agora.'
        );
      }
    })();
  }

  function handleUnblockContact(contactId: string) {
    if (isPreviewMode) {
      const target = wave2State.blockedContacts.find((b) => b.id === contactId);
      setWave2State((prev) => ({
        ...prev,
        blockedContacts: prev.blockedContacts.filter((b) => b.id !== contactId),
        passedIds: prev.passedIds.filter((id) => id !== contactId),
        likedIds: prev.likedIds.filter((id) => id !== contactId),
      }));
      if (target) {
        setSafetyFeedback(
          `${target.fullName} foi desbloqueado(a) e voltou a ficar disponível conforme os critérios de afinidade.`
        );
      }
      return;
    }

    const target = serverBlocked.find((b) => b.id === contactId);
    void (async () => {
      try {
        await deleteBlockContact(authSession, contactId);
        setServerBlocked((prev) => prev.filter((b) => b.id !== contactId));
        if (target) {
          setSafetyFeedback(
            `${target.fullName} foi desbloqueado(a) e voltou a ficar disponível conforme os critérios de afinidade.`
          );
        }
        await reloadRemoteDiscovery(filterCity, filterGoal);
      } catch (err) {
        setSafetyFeedback(
          err instanceof ApiError ? err.message : 'Não foi possível desbloquear este contato agora.'
        );
      }
    })();
  }

  function handleResetPassed() {
    if (isPreviewMode) {
      setWave2State((prev) => ({
        ...prev,
        passedIds: [],
      }));
      return;
    }
    void reloadRemoteDiscovery(filterCity, filterGoal);
  }

  return (
    <div className="workspace-container">
      {/* Navegação unificada: barra no topo no Desktop e barra inferior fixa no Mobile */}
      <nav className="workspace-nav" aria-label="Navegação principal">
        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'discover' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('discover')}
          aria-current={activeTab === 'discover' ? 'page' : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span>Descobrir</span>
        </button>

        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'chat' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('chat')}
          aria-current={activeTab === 'chat' ? 'page' : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Conversas</span>
          {totalUnread > 0 && (
            <span
              className="workspace-nav__badge"
              aria-label={`${totalUnread} ${totalUnread === 1 ? 'não lida' : 'não lidas'}`}
            >
              {totalUnread}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`workspace-nav__tab${activeTab === 'profile' ? ' workspace-nav__tab--active' : ''}`}
          onClick={() => setActiveTab('profile')}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
        >
<svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Meu Perfil</span>

        </button>
      </nav>

      {safetyFeedback && (
        <div className="callout-amber workspace-feedback" role="status" aria-live="polite">
          <span>{safetyFeedback}</span>
          <button
            type="button"
            className="text-link"
            onClick={() => setSafetyFeedback(null)}
            aria-label="Fechar aviso"
          >
            Fechar
          </button>
        </div>
      )}

      {activeTab === 'discover' && (
        <MatchAffinityFeedRF05
          candidates={candidates}
          isLoading={isLoadingWorkspace || isLoadingDiscovery}
          userCity={userCity}
          currentUserName={displayFullName || 'Você'}
          currentUserAvatarUrl={displayAvatarUrl}
          filterGoal={filterGoal}
          filterCity={filterCity}
          availableCities={availableCities}
          onFilterGoalChange={setFilterGoal}
          onFilterCityChange={setFilterCity}
          onPass={handlePassCandidate}
          onConnect={handleConnectCandidate}
          onResetPassed={handleResetPassed}
          recentMatch={recentMatch}
          onOpenMatchChat={handleOpenMatchChat}
          onDismissMatchBanner={() => setRecentMatch(null)}
        />
      )}

      {activeTab === 'chat' && (
        <SimplifiedChatRF07
          threads={visibleThreads}
          isLoading={isLoadingWorkspace}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onSendMessage={handleSendMessage}
          onRequestBlock={(thread: ChatThread) =>
            setPendingBlock({
              id: thread.contactId,
              fullName: thread.contactName,
              age: thread.contactAge,
              city: thread.contactCity,
              avatarUrl: thread.contactAvatarUrl,
            })
          }
          onGoToDiscover={() => setActiveTab('discover')}
        />
      )}

      {activeTab === 'profile' && (

        <section className="editorial-profile" aria-labelledby="my-profile-heading">
          <div className="editorial-profile__grid">
            {/* Coluna Esquerda: Retrato Grande ou Monograma + Botão Foto */}
            <div className="editorial-profile__media">
              {displayAvatarUrl && !displayAvatarUrl.endsWith('.svg') ? (
                <div className="editorial-profile__photo-box">
                  <img
                    src={displayAvatarUrl}
                    alt={`Foto de perfil de ${displayFullName || authSession.email}`}
                    className="editorial-profile__photo"
                  />
                </div>
              ) : (
                <div className="editorial-profile__monogram" aria-hidden="true">
                  <span>
                    {(displayFullName || 'BT')
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? '')
                      .join('')}
                  </span>
                </div>
              )}

              <p className="editorial-profile__photo-hint">
                {displayAvatarUrl && !displayAvatarUrl.endsWith('.svg')
                  ? 'É assim que sua foto aparece para as outras pessoas em Descobrir.'
                  : 'Você ainda não tem foto. Perfis com foto recebem mais curtidas.'}
              </p>

              <button
                type="button"
                className="btn btn--secondary editorial-profile__photo-btn"
                onClick={onEditProfile}
              >
                {displayAvatarUrl && !displayAvatarUrl.endsWith('.svg')
                  ? 'Alterar foto'
                  : 'Adicionar foto'}
              </button>

              <div className="editorial-profile__verification-card">
                <div className="editorial-profile__verification-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <strong>{isFaciallyVerified ? 'Identidade verificada' : 'Selo de Verificado 50+'}</strong>
                  <p>
                    {isFaciallyVerified
                      ? 'Seu perfil foi confirmado com verificação facial.'
                      : 'Em breve você poderá confirmar sua identidade com a câmera do celular.'}
                  </p>
                </div>
                {!isFaciallyVerified && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setIsQrModalOpen(true)}
                  >
                    Ver como funciona
                  </button>
                )}
              </div>
            </div>

            {/* Coluna Direita: Identidade, Sobre Mim, Meus Gostos e Preferências */}
            <div className="editorial-profile__content">
              <header className="editorial-profile__header">
                <div className="editorial-profile__title-row">
                  <h1 id="my-profile-heading" className="editorial-profile__name">
                    {displayFullName || 'Meu Perfil'}
                  </h1>
                  <span className="editorial-profile__age">
                    {displayAge ? `${displayAge} anos` : '50+'}
                  </span>
                  {isFaciallyVerified && (
                    <span
                      className="editorial-profile__verified-badge"
                      title="Identidade verificada com biometria facial anti-golpe"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      Verificado 50+
                    </span>
                  )}
                </div>
                <p className="editorial-profile__location">
                  {formatSergipeLocation(userCity)}
                </p>
                <p className="editorial-profile__privacy-note">
                  É assim que as outras pessoas veem você em Descobrir. Endereço e telefone nunca
                  aparecem.
                </p>
              </header>

              <div className="editorial-profile__section">
                <div className="editorial-profile__section-head">
                  <h2 className="editorial-profile__label">SOBRE MIM</h2>
                  <button
                    type="button"
                    className="editorial-profile__edit-btn"
                    onClick={onEditProfile}
                  >
                    Editar
                  </button>
                </div>
                <p className="editorial-profile__bio">
                  {serverProfile?.bio?.trim() ||
                    'Adicione uma breve apresentação contando do que gosta de fazer e o que procura por aqui.'}
                </p>
              </div>

              <div className="editorial-profile__section">
                <div className="editorial-profile__section-head">
                  <h2 className="editorial-profile__label">MEUS GOSTOS</h2>
                  <button
                    type="button"
                    className="editorial-profile__edit-btn"
                    onClick={onEditProfile}
                  >
                    Editar
                  </button>
                </div>
                <p className="editorial-profile__hobbies-text">
                  {userHobbies.length > 0
                    ? userHobbies.map((hobbyId) => getHobbyLabel(hobbyId)).join(', ')
                    : 'Nenhum interesse selecionado ainda.'}
                </p>
                <p className="editorial-profile__helper">
                  {userHobbies.length} de até 10. Eles decidem quem aparece para você em Descobrir.
                </p>
              </div>

              <div className="editorial-profile__section">
                <h2 className="editorial-profile__label">QUEM APARECE PARA MIM</h2>
                <div className="editorial-profile__prefs-grid">
                  <div className="editorial-profile__pref-field">
                    <label htmlFor="profile-pref-goal" className="editorial-profile__pref-label">
                      Estou procurando
                    </label>
                    <select
                      id="profile-pref-goal"
                      className="form-input"
                      value={filterGoal}
                      onChange={(event) =>
                        setFilterGoal(event.target.value as ConnectionGoal | 'Todos')
                      }
                    >
                      <option value="Todos">Todos os objetivos</option>
                      <option value="Amizade">Amizade</option>
                      <option value="Companhia">Companhia</option>
                      <option value="Relacionamento">Relacionamento</option>
                    </select>
                  </div>

                  <div className="editorial-profile__pref-field">
                    <label
                      htmlFor="profile-pref-city"
                      className="editorial-profile__pref-label"
                    >
                      Cidade em Sergipe
                    </label>
                    <select
                      id="profile-pref-city"
                      className="form-input"
                      value={filterCity}
                      onChange={(event) => setFilterCity(event.target.value)}
                    >
                      <option value="Todas">Todas em Sergipe</option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="editorial-profile__helper">
                  As mudanças já valem nas suas sugestões em Descobrir.
                </p>
              </div>

              <div className="editorial-profile__security-section">
                <BlockedContactsPanelRF08
                  blockedContacts={activeBlockedContacts}
                  onUnblock={handleUnblockContact}
                />
              </div>

              <footer className="editorial-profile__footer-links">
                <button
                  type="button"
                  className="editorial-profile__link"
                  onClick={onEditProfile}
                >
                  Alterar dados da conta
                </button>
                <button
                  type="button"
                  className="editorial-profile__link"
                  onClick={onLogout}
                >
                  Sair da conta
                </button>
                <button
                  type="button"
                  className="editorial-profile__link editorial-profile__link--danger"
                  onClick={onRequestDeleteAccount}
                >
                  Excluir conta e dados
                </button>
              </footer>
            </div>

          </div>
        </section>
      )}

      {pendingBlock && (
        <BlockContactModalRF08
          contactName={pendingBlock.fullName}
          onConfirm={handleConfirmBlock}
          onCancel={() => setPendingBlock(null)}
        />
      )}

      {isQrModalOpen && <FacialVerificationQrModal onClose={() => setIsQrModalOpen(false)} />}
    </div>
  );
}
