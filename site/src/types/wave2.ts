import type { ConnectionGoal } from './auth';

export type WorkspaceTabId = 'discover' | 'chat' | 'profile';

export interface DiscoveryCandidate {
  id: string;
  fullName: string;
  age: number;
  city: string;
  neighborhood: string;
  goal: ConnectionGoal;
  bio: string;
  avatarUrl: string;
  verifiedIdentity: boolean;
  hobbies: string[];
  /** Indica se este perfil também demonstrou interesse (simula match mútuo) */
  likesBack: boolean;
  lastActiveLabel: string;
}

export interface ScoredCandidate extends DiscoveryCandidate {
  affinityPercent: number;
  sharedHobbies: string[];
  sameCity: boolean;
}

export interface ChatAntifraudAlert {
  riskLabel: string;
  confidencePercent: number;
  educationalTitle: string;
  educationalMessage: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  sentAt: string;
  audioUrl?: string;
  audioDurationLabel?: string;
  imageUrl?: string;
  imageName?: string;
  antifraudAlert?: ChatAntifraudAlert | null;
}

export interface OutgoingMessagePayload {
  text?: string;
  audioUrl?: string;
  audioDurationLabel?: string;
  imageUrl?: string;
  imageName?: string;
}

export interface ChatThread {
  conversationId?: string;
  contactId: string;
  contactName: string;
  contactAge: number;
  contactCity: string;
  contactAvatarUrl: string;
  contactGoal: ConnectionGoal;
  affinityPercent: number;
  sharedHobbies: string[];
  verifiedIdentity: boolean;
  contactPublicKeyJwk?: string | null;
  contactHasChatKey?: boolean;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface BlockedContact {
  id: string;
  fullName: string;
  age: number;
  city: string;
  avatarUrl: string;
  blockedAt: string;
  reason?: string;
}

export interface Wave2State {
  passedIds: string[];
  likedIds: string[];
  blockedContacts: BlockedContact[];
  threads: ChatThread[];
}
