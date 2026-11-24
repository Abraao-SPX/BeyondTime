import { HOBBIES_CATALOG } from '../data/hobbiesTaxonomy';
import type { ConnectionGoal } from '../types/auth';
import type {
  BlockedContact,
  ChatMessage,
  ChatThread,
  DiscoveryCandidate,
  ScoredCandidate,
  Wave2State,
} from '../types/wave2';

const WAVE2_STORAGE_KEY_PREFIX = 'beyondtime_wave2_state_v1_';

/**
 * Perfis curados de Sergipe (50+) para demonstração interativa da Onda 2 (RF-05/RF-07/RF-08)
 * alinhados 1-para-1 com os 36 hobbies oficiais em HOBBIES_CATALOG.
 */
export const SERGIPE_DISCOVERY_CATALOG: readonly DiscoveryCandidate[] = [
  {
    id: 'usr-helena-se',
    fullName: 'Helena Tavares',
    age: 62,
    city: 'Aracaju',
    neighborhood: 'Atalaia',
    goal: 'Amizade',
    bio: 'Aposentada da área de educação, amo caminhar na Orla de Atalaia no fim da tarde, conversar sobre livros e ouvir boa MPB tomando um café coado na hora.',
    avatarUrl: '/images/pessoa-madura.jpg',
    verifiedIdentity: true,
    hobbies: ['caminhada', 'leitura', 'mpb', 'cafe-e-prosa', 'viagens'],
    likesBack: true,
    lastActiveLabel: 'Online hoje',
  },
  {
    id: 'usr-marcos-se',
    fullName: 'Marcos Mendonça',
    age: 67,
    city: 'Aracaju',
    neighborhood: 'Jardins',
    goal: 'Companhia',
    bio: 'Gosto de vida tranquila, boa conversa sem pressa, cozinhar pratos regionais nos domingos e jogar dominó ou xadrez com amigos.',
    avatarUrl: '/images/encontros-selfie-compartilhada.png',
    verifiedIdentity: true,
    hobbies: ['culinaria-regional', 'jogos-tabuleiro', 'xadrez-damas', 'cafe-e-prosa', 'forro'],
    likesBack: true,
    lastActiveLabel: 'Ativo há 20 min',
  },
  {
    id: 'usr-lucia-se',
    fullName: 'Lúcia Nascimento',
    age: 58,
    city: 'São Cristóvão',
    neighborhood: 'Centro Histórico',
    goal: 'Relacionamento',
    bio: 'Apaixonada por jardinagem, artesanato e cinema clássico. Busco uma conexão sincera, com respeito, bom humor e conversas verdadeiras.',
    avatarUrl: '/images/hero-casal-viajante.png',
    verifiedIdentity: true,
    hobbies: ['jardinagem', 'artesanato', 'cinema-teatro', 'seresta-bolero', 'culinaria-regional'],
    likesBack: true,
    lastActiveLabel: 'Online hoje',
  },
  {
    id: 'usr-antonio-se',
    fullName: 'Antônio Carlos',
    age: 64,
    city: 'Itabaiana',
    neighborhood: 'Centro',
    goal: 'Amizade',
    bio: 'Engenheiro aposentado que adora fotografia, música instrumental e excursões culturais pelo Nordeste. Sempre aberto a boas amizades.',
    avatarUrl: '/assets/perfil-marcos.svg',
    verifiedIdentity: true,
    hobbies: ['fotografia', 'viagens', 'turismo-historico', 'ciclismo-passeio', 'mpb'],
    likesBack: false,
    lastActiveLabel: 'Ativo ontem',
  },
  {
    id: 'usr-tereza-se',
    fullName: 'Tereza Cristina',
    age: 60,
    city: 'Nossa Senhora do Socorro',
    neighborhood: 'Conjunto Marcos Freire',
    goal: 'Companhia',
    bio: 'Pratico hidroginástica três vezes por semana, adoro dançar forró pé-de-serra e participar de encontros tranquilos com pessoas alto-astral.',
    avatarUrl: '/assets/perfil-helena.svg',
    verifiedIdentity: true,
    hobbies: ['hidroginastica', 'forro', 'caminhada', 'cafe-e-prosa', 'voluntariado'],
    likesBack: true,
    lastActiveLabel: 'Online hoje',
  },
  {
    id: 'usr-roberto-se',
    fullName: 'Roberto Prado',
    age: 71,
    city: 'Lagarto',
    neighborhood: 'Centro',
    goal: 'Relacionamento',
    bio: 'Valorizo o diálogo sereno, o carinho no dia a dia e programas culturais. Adoro cozinhar, ouvir seresta e cuidar das minhas plantas.',
    avatarUrl: '/assets/perfil-marcos.svg',
    verifiedIdentity: true,
    hobbies: ['seresta-bolero', 'jardinagem', 'culinaria-regional', 'leitura', 'cafe-e-prosa'],
    likesBack: true,
    lastActiveLabel: 'Ativo há 1 hora',
  },
];

function createInitialThreads(): ChatThread[] {
  const helena = SERGIPE_DISCOVERY_CATALOG[0];
  return [
    {
      contactId: helena.id,
      contactName: helena.fullName,
      contactAge: helena.age,
      contactCity: `${helena.city} (SE)`,
      contactAvatarUrl: helena.avatarUrl,
      contactGoal: helena.goal,
      affinityPercent: 89,
      sharedHobbies: ['caminhada', 'cafe-e-prosa', 'mpb'],
      verifiedIdentity: true,
      unreadCount: 1,
      messages: [
        {
          id: 'msg-welcome-1',
          sender: 'them',
          text: 'Olá! Que alegria ver que também gosta de boas conversas e caminhada. Como está o seu dia em Sergipe?',
          sentAt: '14:20',
        },
      ],
    },
  ];
}

function getStorageKey(userEmail: string): string {
  return `${WAVE2_STORAGE_KEY_PREFIX}${userEmail.trim().toLowerCase()}`;
}

export function loadWave2State(userEmail: string): Wave2State {
  if (typeof window === 'undefined') {
    return {
      passedIds: [],
      likedIds: ['usr-helena-se'],
      blockedContacts: [],
      threads: createInitialThreads(),
    };
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userEmail));
    if (!raw) {
      return {
        passedIds: [],
        likedIds: ['usr-helena-se'],
        blockedContacts: [],
        threads: createInitialThreads(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<Wave2State>;
    return {
      passedIds: Array.isArray(parsed.passedIds) ? parsed.passedIds : [],
      likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds : ['usr-helena-se'],
      blockedContacts: Array.isArray(parsed.blockedContacts) ? parsed.blockedContacts : [],
      threads: Array.isArray(parsed.threads) ? parsed.threads : createInitialThreads(),
    };
  } catch {
    return {
      passedIds: [],
      likedIds: ['usr-helena-se'],
      blockedContacts: [],
      threads: createInitialThreads(),
    };
  }
}

export function saveWave2State(userEmail: string, state: Wave2State): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(userEmail), JSON.stringify(state));
  } catch {
    // Falha silenciosa em caso de quota de storage
  }
}

function normalizeHobbyKey(raw: string): string {
  const lowered = raw.trim().toLowerCase();
  const match = HOBBIES_CATALOG.find(
    (item) =>
      item.id.toLowerCase() === lowered ||
      item.slug.toLowerCase() === lowered ||
      item.label.toLowerCase() === lowered
  );
  return match ? match.id : lowered;
}

/**
 * Lista de municípios da Região Metropolitana de Aracaju (SE) para priorização regional.
 */
const GREATER_ARACAJU_CITIES = new Set([
  'aracaju',
  'nossa senhora do socorro',
  'são cristóvão',
  'sao cristovao',
  'barra dos coqueiros',
]);

/**
 * RF-05: Ordena perfis priorizando:
 * 1º) Mesma cidade do usuário
 * 2º) Mesma região (Região Metropolitana / proximidade em Sergipe)
 * 3º) Maior quantidade de gostos/hobbies em comum
 */
export function computeAffinityCandidates(
  userHobbies: string[],
  userCity: string,
  userGoal: ConnectionGoal | null,
  state: Wave2State,
  filterGoal: ConnectionGoal | 'Todos' = 'Todos',
  filterCity: string = 'Todas'
): ScoredCandidate[] {
  const blockedIds = new Set(state.blockedContacts.map((b) => b.id));
  const interactedIds = new Set([...state.passedIds, ...state.likedIds]);
  const normalizedUserCity = userCity.trim().toLowerCase();
  const userInMetro = GREATER_ARACAJU_CITIES.has(normalizedUserCity);
  const normalizedUserHobbies =
    userHobbies.length > 0
      ? userHobbies.map(normalizeHobbyKey)
      : ['cafe-e-prosa', 'caminhada', 'mpb', 'leitura'];

  return SERGIPE_DISCOVERY_CATALOG.filter((candidate) => {
    if (blockedIds.has(candidate.id)) return false;
    if (interactedIds.has(candidate.id)) return false;
    if (filterGoal !== 'Todos' && candidate.goal !== filterGoal) return false;
    if (filterCity !== 'Todas' && candidate.city.toLowerCase() !== filterCity.toLowerCase()) {
      return false;
    }
    return true;
  })
    .map((candidate) => {
      const sharedHobbies = candidate.hobbies.filter((h) => normalizedUserHobbies.includes(h));
      const candidateCityLower = candidate.city.trim().toLowerCase();
      const sameCity =
        normalizedUserCity.length > 0 && normalizedUserCity.includes(candidateCityLower);
      const sameRegion = sameCity || (userInMetro && GREATER_ARACAJU_CITIES.has(candidateCityLower));
      const sameGoal = userGoal !== null && candidate.goal === userGoal;

      const hobbyScore = Math.min(30, sharedHobbies.length * 10);
      const locationScore = sameCity ? 14 : sameRegion ? 8 : 4;
      const goalScore = sameGoal ? 5 : 0;
      const affinityPercent = Math.min(99, 50 + locationScore + hobbyScore + goalScore);

      return {
        ...candidate,
        affinityPercent,
        sharedHobbies,
        sameCity,
      };
    })
    .sort((a, b) => {
      // 1º prioridade: mesma cidade
      if (a.sameCity !== b.sameCity) {
        return a.sameCity ? -1 : 1;
      }
      // 2º prioridade: mesma região metropolitana
      const aMetro = userInMetro && GREATER_ARACAJU_CITIES.has(a.city.trim().toLowerCase());
      const bMetro = userInMetro && GREATER_ARACAJU_CITIES.has(b.city.trim().toLowerCase());
      if (aMetro !== bMetro) {
        return aMetro ? -1 : 1;
      }
      // 3º prioridade: maior número de gostos em comum
      if (b.sharedHobbies.length !== a.sharedHobbies.length) {
        return b.sharedHobbies.length - a.sharedHobbies.length;
      }
      return b.affinityPercent - a.affinityPercent;
    });
}

export function getHobbyLabel(hobbyKey: string): string {
  const lowered = hobbyKey.trim().toLowerCase();
  const match = HOBBIES_CATALOG.find(
    (item) =>
      item.id.toLowerCase() === lowered ||
      item.slug.toLowerCase() === lowered ||
      item.label.toLowerCase() === lowered
  );
  return match ? match.label : hobbyKey;
}

export function buildIcebreakerSuggestions(thread: ChatThread): string[] {
  const firstHobby = thread.sharedHobbies[0] ? getHobbyLabel(thread.sharedHobbies[0]) : null;
  const suggestions: string[] = [];

  if (firstHobby) {
    suggestions.push(
      `Olá ${thread.contactName.split(' ')[0]}! Vi que também gosta de ${firstHobby}. Como começou esse interesse?`
    );
  }

  suggestions.push(
    `Olá ${thread.contactName.split(' ')[0]}, prazer em conectar por aqui! Como está sua semana em ${thread.contactCity.replace(' (SE)', '')}?`
  );
  suggestions.push('Qual programa tranquilo você mais gosta de fazer nos fins de semana?');

  return suggestions.slice(0, 3);
}

export function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function createThreadFromCandidate(candidate: ScoredCandidate): ChatThread {
  return {
    contactId: candidate.id,
    contactName: candidate.fullName,
    contactAge: candidate.age,
    contactCity: `${candidate.city} (SE)`,
    contactAvatarUrl: candidate.avatarUrl,
    contactGoal: candidate.goal,
    affinityPercent: candidate.affinityPercent,
    sharedHobbies: candidate.sharedHobbies,
    verifiedIdentity: candidate.verifiedIdentity,
    unreadCount: 0,
    messages: [],
  };
}

export function createBlockedEntry(
  contact: Pick<BlockedContact, 'id' | 'fullName' | 'age' | 'city' | 'avatarUrl'>,
  reason?: string
): BlockedContact {
  return {
    ...contact,
    blockedAt: new Date().toLocaleDateString('pt-BR'),
    reason,
  };
}

export function createOutgoingMessage(text: string): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender: 'me',
    text: text.trim(),
    sentAt: formatCurrentTime(),
  };
}
