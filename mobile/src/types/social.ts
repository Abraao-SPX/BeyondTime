export type MainTab = 'discover' | 'conversations' | 'profile';

export interface DiscoveryProfile {
  id: string;
  fullName: string;
  age: number;
  city: string;
  bio: string;
  photoUrl: string;
  verified: boolean;
  hobbies: string[];
  goal: 'amizade' | 'relacionamento' | 'companhia';
  likesCurrentUser: boolean;
}

export interface RankedDiscoveryProfile extends DiscoveryProfile {
  isSameCity: boolean;
  isSameRegion: boolean;
  sharedHobbyIds: string[];
  compatibilityPercent: number;
  locationLabel: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'other';
  text: string;
  timestamp: string;
  kind?: 'text' | 'audio' | 'photo';
  audioDurationSec?: number;
  audioUri?: string;
  photoUrl?: string;
  mediaId?: string | null;
  mediaIv?: string | null;
  mediaMimeType?: string | null;
  read?: boolean;
}

export interface SendMessageOptions {
  kind?: 'text' | 'audio' | 'photo';
  audioDurationSec?: number;
  audioUri?: string;
  photoUrl?: string;
  mimeType?: string;
}

export interface ChatConversation {
  id: string;
  matchId?: string;
  profileId: string;
  fullName: string;
  age: number;
  city: string;
  photoUrl: string;
  verified: boolean;
  sharedHobbyIds: string[];
  contactPublicKeyJwk?: string | null;
  contactHasChatKey?: boolean;
  unreadCount: number;
  lastTimestamp: string;
  messages: ChatMessage[];
}

export interface BlockedContactMobile {
  id: string;
  fullName: string;
  age: number;
  city: string;
  photoUrl: string;
  blockedAt: string;
  reason?: string;
}
