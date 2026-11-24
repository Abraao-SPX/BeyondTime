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
}

export interface ChatConversation {
  id: string;
  profileId: string;
  fullName: string;
  age: number;
  city: string;
  photoUrl: string;
  verified: boolean;
  sharedHobbyIds: string[];
  unreadCount: number;
  lastTimestamp: string;
  messages: ChatMessage[];
}
