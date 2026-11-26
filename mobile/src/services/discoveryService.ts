import { HOBBIES_CATALOG } from '../constants/hobbiesTaxonomy';
import type {
  DiscoveryProfile,
  RankedDiscoveryProfile,
} from '../types/social';

/**
 * Cidades da Região Metropolitana de Aracaju (Sergipe)
 */
const METRO_ARACAJU_NORMALIZED = new Set([
  'aracaju',
  'nossa senhora do socorro',
  'sao cristovao',
  'barra dos coqueiros',
]);

export function normalizeCityName(city: string): string {
  return city
    .split(',')[0]
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getShortCityDisplay(city: string): string {
  return city.split(',')[0].trim() || 'Sergipe';
}

export function isMetropolitanAracaju(city: string): boolean {
  return METRO_ARACAJU_NORMALIZED.has(normalizeCityName(city));
}

export function getHobbyLabelById(hobbyId: string): string {
  return (
    HOBBIES_CATALOG.find((item) => item.id === hobbyId || item.slug === hobbyId)?.label ??
    hobbyId
  );
}

/**
 * Ordenação oficial por afinidade e proximidade geográfica:
 * 1ª prioridade: Mesma cidade do usuário em Sergipe.
 * 2ª prioridade: Mesma região (Região Metropolitana de Aracaju vs Interior de Sergipe).
 * 3ª prioridade: Maior quantidade de hobbies em comum.
 */
export function rankProfilesByAffinity(
  profiles: readonly DiscoveryProfile[],
  userCity: string,
  userHobbyIds: readonly string[]
): RankedDiscoveryProfile[] {
  const userNormCity = normalizeCityName(userCity || 'Aracaju, SE');
  const userIsMetro = isMetropolitanAracaju(userCity || 'Aracaju, SE');
  const userHobbySet = new Set(userHobbyIds);

  const ranked = profiles.map<RankedDiscoveryProfile>((profile) => {
    const profileNormCity = normalizeCityName(profile.city);
    const isSameCity = profileNormCity === userNormCity;
    const isSameRegion =
      isSameCity || isMetropolitanAracaju(profile.city) === userIsMetro;

    const sharedHobbyIds = profile.hobbies.filter((h) => userHobbySet.has(h));
    const denominator = Math.max(1, Math.min(userHobbySet.size || 3, profile.hobbies.length));
    const rawPercent = Math.round((sharedHobbyIds.length / denominator) * 100);
    const compatibilityPercent = Math.min(98, Math.max(35, rawPercent));

    const shortCity = getShortCityDisplay(profile.city);
    const locationLabel = isSameCity
      ? `Na sua cidade • ${shortCity}`
      : isSameRegion
        ? `Perto de você • ${shortCity}`
        : `Sergipe • ${shortCity}`;

    return {
      ...profile,
      isSameCity,
      isSameRegion,
      sharedHobbyIds,
      compatibilityPercent,
      locationLabel,
    };
  });

  return ranked.sort((a, b) => {
    if (a.isSameCity !== b.isSameCity) {
      return a.isSameCity ? -1 : 1;
    }
    if (a.isSameRegion !== b.isSameRegion) {
      return a.isSameRegion ? -1 : 1;
    }
    if (a.sharedHobbyIds.length !== b.sharedHobbyIds.length) {
      return b.sharedHobbyIds.length - a.sharedHobbyIds.length;
    }
    return b.compatibilityPercent - a.compatibilityPercent;
  });
}

/**
 * Perfis curados de Sergipe (50+) utilizando exclusivamente os 36 hobbies
 * oficiais definidos em mobile/src/constants/hobbiesTaxonomy.ts.
 */
export const SEED_DISCOVERY_PROFILES: readonly DiscoveryProfile[] = [
  {
    id: 'profile-marlene',
    fullName: 'Marlene Oliveira',
    age: 63,
    city: 'Aracaju, SE',
    bio: 'Professora aposentada, apaixonada por caminhadas na Orla de Atalaia, boa música brasileira e um café coado no fim da tarde.',
    photoUrl:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    verified: true,
    hobbies: ['mpb', 'caminhada', 'cafe-e-prosa', 'forro', 'leitura'],
    goal: 'amizade',
    likesCurrentUser: true,
  },
  {
    id: 'profile-antonio',
    fullName: 'Antônio Carlos',
    age: 68,
    city: 'Aracaju, SE',
    bio: 'Gosto de conversas tranquilas, música de raiz, passeios pelo Parque da Sementeira e cozinhar para amigos e família.',
    photoUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    verified: true,
    hobbies: ['mpb', 'forro', 'culinaria-regional', 'caminhada', 'jogos-tabuleiro'],
    goal: 'companhia',
    likesCurrentUser: true,
  },
  {
    id: 'profile-cida',
    fullName: 'Cida Menezes',
    age: 66,
    city: 'Barra dos Coqueiros, SE',
    bio: 'Adoro cuidar das minhas plantas, dançar um bom forró pé de serra e conhecer lugares históricos aos fins de semana.',
    photoUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    verified: true,
    hobbies: ['forro', 'jardinagem', 'danca-de-salao', 'turismo-historico', 'cafe-e-prosa'],
    goal: 'amizade',
    likesCurrentUser: true,
  },
  {
    id: 'profile-raimundo',
    fullName: 'Raimundo Nonato',
    age: 64,
    city: 'São Cristóvão, SE',
    bio: 'Fotógrafo por hobby, aprecio boa leitura, samba de roda e passeios calmos pelas praças e feiras de artesanato.',
    photoUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80',
    verified: true,
    hobbies: ['fotografia', 'leitura', 'samba-choro', 'mercados-feiras', 'viagens'],
    goal: 'relacionamento',
    likesCurrentUser: false,
  },
  {
    id: 'profile-sonia',
    fullName: 'Sônia Maria',
    age: 61,
    city: 'Nossa Senhora do Socorro, SE',
    bio: 'Participo de grupo de hidroginástica e adoro cinema, teatro e encontros para tomar chá e colocar o papo em dia.',
    photoUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80',
    verified: true,
    hobbies: ['hidroginastica', 'cinema-teatro', 'chas-ervas', 'caminhada', 'rodas-conversa'],
    goal: 'companhia',
    likesCurrentUser: true,
  },
  {
    id: 'profile-edvaldo',
    fullName: 'Edvaldo Santos',
    age: 65,
    city: 'Estância, SE',
    bio: 'Apreciador de viagens pelo litoral nordestino, partidas de dominó com amigos e culinária sergipana.',
    photoUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    verified: true,
    hobbies: ['viagens', 'jogos-tabuleiro', 'culinaria-regional', 'praia', 'mpb'],
    goal: 'amizade',
    likesCurrentUser: true,
  },
];
