import type { HobbyCategory } from '../types/auth';

export const MIN_HOBBIES_SELECTION = 3;
export const MAX_HOBBIES_SELECTION = 10;

export const HOBBY_CATEGORIES: readonly HobbyCategory[] = [
  'Música e Dança',
  'Arte e Cultura',
  'Lazer e Bem-estar',
  'Gastronomia',
  'Viagens e Passeios',
  'Jogos e Convivência',
] as const;

export interface HobbyItem {
  id: string;
  numericId: number;
  slug: string;
  label: string;
  category: HobbyCategory;
  active: boolean;
}

export const HOBBIES_CATALOG: readonly HobbyItem[] = [
  // 1. Música e Dança
  { id: 'mpb', numericId: 1, slug: 'mpb', label: 'MPB', category: 'Música e Dança', active: true },
  { id: 'forro', numericId: 3, slug: 'forro-tradicional', label: 'Forró Pé de Serra', category: 'Música e Dança', active: true },
  { id: 'danca-de-salao', numericId: 2, slug: 'danca-salao', label: 'Dança de Salão', category: 'Música e Dança', active: true },
  { id: 'sertanejo', numericId: 4, slug: 'sertanejo', label: 'Música Sertaneja e Raiz', category: 'Música e Dança', active: true },
  { id: 'samba-choro', numericId: 15, slug: 'samba-choro', label: 'Samba e Choro', category: 'Música e Dança', active: true },
  { id: 'seresta-bolero', numericId: 16, slug: 'seresta-bolero', label: 'Seresta e Bolero', category: 'Música e Dança', active: true },
  { id: 'canto-coral', numericId: 17, slug: 'canto-coral', label: 'Canto e Coral', category: 'Música e Dança', active: true },

  // 2. Arte e Cultura
  { id: 'leitura', numericId: 12, slug: 'leitura', label: 'Leitura e Livros', category: 'Arte e Cultura', active: true },
  { id: 'artesanato', numericId: 11, slug: 'artesanato', label: 'Artesanato e Costura', category: 'Arte e Cultura', active: true },
  { id: 'cinema-teatro', numericId: 13, slug: 'cinema-teatro', label: 'Cinema e Teatro', category: 'Arte e Cultura', active: true },
  { id: 'fotografia', numericId: 14, slug: 'fotografia', label: 'Fotografia e Memórias', category: 'Arte e Cultura', active: true },
  { id: 'pintura-desenho', numericId: 18, slug: 'pintura-desenho', label: 'Pintura e Desenho', category: 'Arte e Cultura', active: true },
  { id: 'historia-genealogia', numericId: 19, slug: 'historia-genealogia', label: 'História e Memórias de Família', category: 'Arte e Cultura', active: true },

  // 3. Lazer e Bem-estar
  { id: 'caminhada', numericId: 6, slug: 'caminhada-orla', label: 'Caminhada na Orla e Parques', category: 'Lazer e Bem-estar', active: true },
  { id: 'praia', numericId: 5, slug: 'praia-sol', label: 'Praia e Banho de Mar', category: 'Lazer e Bem-estar', active: true },
  { id: 'jardinagem', numericId: 7, slug: 'jardinagem', label: 'Jardinagem e Plantas', category: 'Lazer e Bem-estar', active: true },
  { id: 'pilates-alongamento', numericId: 20, slug: 'pilates-alongamento', label: 'Pilates e Alongamento', category: 'Lazer e Bem-estar', active: true },
  { id: 'hidroginastica', numericId: 21, slug: 'hidroginastica', label: 'Hidroginástica e Natação', category: 'Lazer e Bem-estar', active: true },
  { id: 'passeio-pets', numericId: 22, slug: 'passeio-pets', label: 'Passeio com Animais de Estimação', category: 'Lazer e Bem-estar', active: true },
  { id: 'ciclismo-passeio', numericId: 23, slug: 'ciclismo-passeio', label: 'Passeios de Bicicleta', category: 'Lazer e Bem-estar', active: true },

  // 4. Gastronomia
  { id: 'cafe-e-prosa', numericId: 10, slug: 'cafe-e-prosa', label: 'Café da Tarde e Boa Prosa', category: 'Gastronomia', active: true },
  { id: 'culinaria-regional', numericId: 9, slug: 'culinaria-regional', label: 'Culinária Regional Sergipana', category: 'Gastronomia', active: true },
  { id: 'confeitaria-paes', numericId: 24, slug: 'confeitaria-paes', label: 'Confeitaria e Pães Artesanais', category: 'Gastronomia', active: true },
  { id: 'encontros-familia', numericId: 25, slug: 'encontros-familia', label: 'Almoço em Família e Amigos', category: 'Gastronomia', active: true },
  { id: 'chas-ervas', numericId: 26, slug: 'chas-ervas', label: 'Chás e Plantas Medicinais', category: 'Gastronomia', active: true },
  { id: 'churrasco-petiscos', numericId: 27, slug: 'churrasco-petiscos', label: 'Churrasco e Petiscos', category: 'Gastronomia', active: true },

  // 5. Viagens e Passeios
  { id: 'viagens', numericId: 8, slug: 'viagens-passeios', label: 'Viagens e Excursões', category: 'Viagens e Passeios', active: true },
  { id: 'turismo-historico', numericId: 28, slug: 'turismo-historico', label: 'Passeios Históricos e Cidades Coloniais', category: 'Viagens e Passeios', active: true },
  { id: 'ecoturismo-natureza', numericId: 29, slug: 'ecoturismo-natureza', label: 'Ecoturismo e Contato com a Natureza', category: 'Viagens e Passeios', active: true },
  { id: 'mercados-feiras', numericId: 30, slug: 'mercados-feiras', label: 'Feiras de Artesanato e Mercados Centrais', category: 'Viagens e Passeios', active: true },
  { id: 'turismo-religioso', numericId: 31, slug: 'turismo-religioso', label: 'Turismo Religioso e Romarias', category: 'Viagens e Passeios', active: true },

  // 6. Jogos e Convivência
  { id: 'jogos-tabuleiro', numericId: 32, slug: 'jogos-tabuleiro', label: 'Jogos de Mesa e Dominó', category: 'Jogos e Convivência', active: true },
  { id: 'jogos-cartas', numericId: 33, slug: 'jogos-cartas', label: 'Baralho, Buraco e Tranca', category: 'Jogos e Convivência', active: true },
  { id: 'xadrez-damas', numericId: 34, slug: 'xadrez-damas', label: 'Xadrez e Damas', category: 'Jogos e Convivência', active: true },
  { id: 'voluntariado', numericId: 35, slug: 'voluntariado', label: 'Ações Sociais e Voluntariado', category: 'Jogos e Convivência', active: true },
  { id: 'rodas-conversa', numericId: 36, slug: 'rodas-conversa', label: 'Rodas de Conversa e Novos Amigos', category: 'Jogos e Convivência', active: true },
] as const;
