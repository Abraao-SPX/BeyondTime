import { getHobbyLabelById } from './discoveryService';
import type { ChatConversation, RankedDiscoveryProfile } from '../types/social';

export function buildStarterSuggestions(sharedHobbyIds: readonly string[]): string[] {
  const firstLabel = sharedHobbyIds[0] ? getHobbyLabelById(sharedHobbyIds[0]) : null;
  const secondLabel = sharedHobbyIds[1] ? getHobbyLabelById(sharedHobbyIds[1]) : null;

  const suggestions: string[] = [];

  if (firstLabel) {
    suggestions.push(
      `Olá! Vi que você também gosta de ${firstLabel}. Como começou esse interesse?`
    );
  } else {
    suggestions.push('Olá! Que bom nos conectarmos por aqui. Como está sendo o seu dia?');
  }

  if (secondLabel) {
    suggestions.push(
      `Também curto muito ${secondLabel}. Costuma aproveitar isso com frequência?`
    );
  } else {
    suggestions.push('Qual passeio ou lugar tranquilo você mais gosta de visitar por aqui?');
  }

  suggestions.push('Que tal conversarmos com calma sobre o que gostamos de fazer no tempo livre?');

  return suggestions;
}

export function formatCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function createConversationFromProfile(
  profile: RankedDiscoveryProfile
): ChatConversation {
  return {
    id: `conv-${profile.id}`,
    profileId: profile.id,
    fullName: profile.fullName,
    age: profile.age,
    city: profile.city,
    photoUrl: profile.photoUrl,
    verified: profile.verified,
    sharedHobbyIds: profile.sharedHobbyIds,
    unreadCount: 0,
    lastTimestamp: 'Agora',
    messages: [],
  };
}

export const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-profile-antonio',
    profileId: 'profile-antonio',
    fullName: 'Antônio Carlos',
    age: 68,
    city: 'Aracaju, SE',
    photoUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    verified: true,
    sharedHobbyIds: ['mpb', 'forro', 'caminhada'],
    unreadCount: 1,
    lastTimestamp: '10:15',
    messages: [
      {
        id: 'msg-antonio-1',
        sender: 'other',
        text: 'Bom dia! Vi que também gosta de caminhar na orla e ouvir MPB. Costuma ir pela manhã?',
        timestamp: '10:15',
      },
    ],
  },
  {
    id: 'conv-profile-cida',
    profileId: 'profile-cida',
    fullName: 'Cida Menezes',
    age: 66,
    city: 'Barra dos Coqueiros, SE',
    photoUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    verified: true,
    sharedHobbyIds: ['forro', 'cafe-e-prosa'],
    unreadCount: 0,
    lastTimestamp: 'Ontem',
    messages: [
      {
        id: 'msg-cida-1',
        sender: 'other',
        text: 'Olá! Adorei saber que você também aprecia um bom café da tarde e forró pé de serra.',
        timestamp: 'Ontem',
      },
      {
        id: 'msg-cida-2',
        sender: 'me',
        text: 'Oi, Cida! É uma das melhores formas de aproveitar o fim de semana com calma.',
        timestamp: 'Ontem',
      },
    ],
  },
  {
    id: 'conv-profile-sonia',
    profileId: 'profile-sonia',
    fullName: 'Sônia Maria',
    age: 61,
    city: 'Nossa Senhora do Socorro, SE',
    photoUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80',
    verified: true,
    sharedHobbyIds: ['caminhada', 'rodas-conversa'],
    unreadCount: 0,
    lastTimestamp: 'Hoje',
    messages: [],
  },
];
