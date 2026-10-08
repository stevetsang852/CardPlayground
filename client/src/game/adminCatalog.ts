import type { Rarity } from '../cardData';
import { PACK_CONFIGS, type PackConfig } from './DrawService';
import { PTCG_TEMPLATES, type PtcgTemplate } from './ptcgPool';

const STORAGE_KEY = 'cmr-admin-catalog-v3';

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export type CatalogCard = {
  id: number;
  name: string;
  rarity: Rarity;
  dex: number;
  imageUrl: string;
  series: string;
};

export type CatalogSnapshot = {
  cards: CatalogCard[];
  packs: PackConfig[];
};

const CARD_DEFAULTS: CatalogCard[] = PTCG_TEMPLATES.map(toCard);
const PACK_DEFAULTS: PackConfig[] = PACK_CONFIGS.map((pack) => ({ ...pack }));

function toCard(card: PtcgTemplate): CatalogCard {
  return {
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    dex: card.dex,
    imageUrl: card.imageUrl,
    series: card.series,
  };
}

function toTemplate(card: CatalogCard): PtcgTemplate {
  return {
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    icon: '🃏',
    series: card.series || 'M6a 30th CELEBRATION',
    imageUrl: card.imageUrl,
    dex: card.dex,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function defaultCatalog(): CatalogSnapshot {
  return {
    cards: CARD_DEFAULTS.map((card) => ({ ...card })),
    packs: PACK_DEFAULTS.map((pack) => ({ ...pack })),
  };
}

export function readCatalog(): CatalogSnapshot {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return defaultCatalog();
  try {
    const parsed = JSON.parse(raw) as CatalogSnapshot;
    if (!Array.isArray(parsed.cards) || !Array.isArray(parsed.packs)) return defaultCatalog();
    return parsed;
  } catch {
    return defaultCatalog();
  }
}

export function applyCatalog(snapshot: CatalogSnapshot) {
  PTCG_TEMPLATES.splice(0, PTCG_TEMPLATES.length, ...snapshot.cards.map(toTemplate));
  PACK_CONFIGS.splice(0, PACK_CONFIGS.length, ...snapshot.packs.map((pack) => ({
    ...pack,
    imageUrl: pack.imageUrl || '',
    setCode: pack.setCode || 'M6a',
    packsIncluded: pack.packsIncluded || 1,
    model: 'jp-sv-5' as const,
  })));
}

export function saveCatalog(snapshot: CatalogSnapshot) {
  applyCatalog(snapshot);
  storage()?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function resetCatalog() {
  storage()?.removeItem(STORAGE_KEY);
  applyCatalog(defaultCatalog());
}

export function hydrateCatalog() {
  applyCatalog(readCatalog());
}
