import type { HobbyCategory } from '../types/auth';

export const MIN_HOBBIES_SELECTION = 3;
export const MAX_HOBBIES_SELECTION = 10;

export const HOBBY_CATEGORIES: readonly HobbyCategory[] = [
  'Arte e Cultura',
  'Lazer e Bem-estar',
  'Gastronomia',
  'Viagens e Comunidade',
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
  { id: 'mpb', numericId: 1, slug: 'mpb', label: 'MPB', category: 'Arte e Cultura', active: true },
  { id: 'danca-de-salao', numericId: 2, slug: 'danca-salao', label: 'Dança de Salão', category: 'Arte e Cultura', active: true },
  { id: 'forro', numericId: 3, slug: 'forro-tradicional', label: 'Forró', category: 'Arte e Cultura', active: true },
  { id: 'sertanejo', numericId: 4, slug: 'sertanejo', label: 'Sertanejo', category: 'Arte e Cultura', active: true },
  { id: 'praia', numericId: 5, slug: 'praia-sol', label: 'Praia', category: 'Lazer e Bem-estar', active: true },
  { id: 'caminhada', numericId: 6, slug: 'caminhada-orla', label: 'Caminhada', category: 'Lazer e Bem-estar', active: true },
  { id: 'jardinagem', numericId: 7, slug: 'jardinagem', label: 'Jardinagem', category: 'Lazer e Bem-estar', active: true },
  { id: 'viagens', numericId: 8, slug: 'viagens-passeios', label: 'Viagens', category: 'Viagens e Comunidade', active: true },
  { id: 'culinaria-regional', numericId: 9, slug: 'culinaria-regional', label: 'Culinária Regional', category: 'Gastronomia', active: true },
  { id: 'cafe-e-prosa', numericId: 10, slug: 'cafe-e-prosa', label: 'Café e Prosa', category: 'Gastronomia', active: true },
  { id: 'artesanato', numericId: 11, slug: 'artesanato', label: 'Artesanato', category: 'Arte e Cultura', active: true },
  { id: 'leitura', numericId: 12, slug: 'leitura', label: 'Leitura', category: 'Arte e Cultura', active: true },
  { id: 'teatro', numericId: 13, slug: 'cinema-teatro', label: 'Teatro', category: 'Arte e Cultura', active: true },
  { id: 'fotografia', numericId: 14, slug: 'fotografia', label: 'Fotografia', category: 'Viagens e Comunidade', active: true },
] as const;
