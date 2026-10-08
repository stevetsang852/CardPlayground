import { cryptoRandom } from './CryptoRandom';
import type { Rarity } from '../cardData';
import { PTCG_TEMPLATES, ptcgPoolByRarity } from './ptcgPool';
import type { ICardInstance } from '../db';
import type { PlayerState, ActiveEvent } from '../store/gameStore';
import { hitKindToAppRarity, rollJpHitSlot } from './ptcgOdds';
import { foilForCard } from './foilMap';

export interface PackConfig {
  id: string;
  name: string;
  icon: string;
  imageUrl: string;
  setCode: string;
  cost: number;
  description: string;
  cardsPerPack: number;
  packsIncluded: number;
  pityLegendaryAt: number;
  model: 'jp-sv-5';
}

export interface OpenedPack {
  hitKind: string;
  hitRarity: Rarity;
  cards: ICardInstance[];
}

export interface DrawResult {
  cards: ICardInstance[];
  packs: OpenedPack[];
  updatedPlayer: Partial<PlayerState>;
}

const PACK_ART = (file: string) => `/packs/${file}.webp`;

export const PACK_CONFIGS: PackConfig[] = [
  {
    id: 'm6a',
    name: '擴充包「30th CELEBRATION」',
    icon: '🃏',
    imageUrl: PACK_ART('m6a'),
    setCode: 'M6a',
    cost: 25,
    cardsPerPack: 6,
    packsIncluded: 1,
    model: 'jp-sv-5',
    description: '建議售價 25 元 · 6 張閃卡 · 2026-09-16',
    pityLegendaryAt: 150,
  },
  {
    id: 'm6a-first-partners',
    name: '特別卡組「最初的夥伴」',
    icon: '🎁',
    imageUrl: PACK_ART('m6a-first-partners'),
    setCode: 'M6a',
    cost: 135,
    cardsPerPack: 6,
    packsIncluded: 4,
    model: 'jp-sv-5',
    description: '建議售價 135 元 · 特典卡包 1 包 + 擴充包 4 包',
    pityLegendaryAt: 80,
  },
  {
    id: 'm6a-special',
    name: '特別組合 仙子伊布ex／甲賀忍蛙ex',
    icon: '✨',
    imageUrl: PACK_ART('m6a-special'),
    setCode: 'M6a',
    cost: 145,
    cardsPerPack: 6,
    packsIncluded: 5,
    model: 'jp-sv-5',
    description: '建議售價 145 元 · 擴充包 5 包 + 特典卡 2 張',
    pityLegendaryAt: 80,
  },
];

function pick(rarity: Rarity) {
  const order: Rarity[] = [rarity, 'rare', 'common', 'epic', 'legendary', 'mythic'];
  for (const r of order) {
    const pool = ptcgPoolByRarity(r);
    if (pool.length) return pool[cryptoRandom.nextInt(0, pool.length - 1)]!;
  }
  return PTCG_TEMPLATES[0]!;
}

function instanceOf(rarity: Rarity, hitKind?: string): ICardInstance {
  const template = pick(rarity);
  return {
    cardId: template.id,
    rarity: template.rarity,
    level: 1,
    obtainedAt: Date.now(),
    foil: foilForCard(hitKind, rarity),
  };
}

function openOnePack(pack: PackConfig, pityReady: boolean): OpenedPack {
  const total = Math.max(1, pack.cardsPerPack);
  const cards: ICardInstance[] = [];
  for (let i = 0; i < total - 1; i += 1) {
    const rareSlot = i % 4 === 3;
    cards.push(instanceOf(rareSlot ? 'rare' : 'common', rareSlot ? 'u' : 'c'));
  }
  let hitKind = rollJpHitSlot(cryptoRandom.nextFloat());
  if (pack.id === 'm6a-first-partners' && hitKind === 'r' && cryptoRandom.nextFloat() < 0.15) hitKind = 'ar';
  if (pack.id === 'm6a-special' && hitKind === 'r' && cryptoRandom.nextFloat() < 0.2) hitKind = 'ar';
  if (pityReady) hitKind = 'sar';
  const hitRarity = hitKindToAppRarity(hitKind) as Rarity;
  const hit = instanceOf(hitRarity, hitKind);
  hit.rarity = hitRarity;
  cards.push(hit);
  return { hitKind, hitRarity, cards };
}

export function drawCards(
  pack: PackConfig,
  packCount: number,
  player: PlayerState,
  activeEvents: ActiveEvent[]
): DrawResult {
  const packs: OpenedPack[] = [];
  const cards: ICardInstance[] = [];
  let { drawsSinceLastLegendary, drawsSinceLastMythic, luckValue, totalDraws } = player;
  const doubleDrop = activeEvents.some(e => e.type === 'double_drop' && e.remainingActions > 0);
  const units = Math.max(1, pack.packsIncluded || 1);
  const actual = (doubleDrop ? packCount * 2 : packCount) * units;

  for (let i = 0; i < actual; i++) {
    const pityReady = drawsSinceLastLegendary >= pack.pityLegendaryAt;
    const opened = openOnePack(pack, pityReady);
    packs.push(opened);
    cards.push(...opened.cards);
    totalDraws += 1;
    if (opened.hitRarity === 'legendary' || opened.hitKind === 'sar' || opened.hitKind === 'ur') {
      drawsSinceLastLegendary = 0;
      luckValue = Math.max(0, luckValue - 20);
    } else {
      drawsSinceLastLegendary += 1;
      drawsSinceLastMythic += 1;
      luckValue += 1;
    }
  }

  return {
    cards,
    packs,
    updatedPlayer: {
      drawsSinceLastLegendary,
      drawsSinceLastMythic,
      luckValue,
      totalDraws,
      softCurrency: player.softCurrency - pack.cost * packCount,
    },
  };
}
