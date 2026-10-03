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
  cost: number;
  description: string;
  cardsPerPack: number;
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

export const PACK_CONFIGS: PackConfig[] = [
  {
    id: 'basic',
    name: 'JP Expansion Pack',
    icon: '🃏',
    cost: 100,
    cardsPerPack: 5,
    model: 'jp-sv-5',
    description: '5 cards · M6a 30th CELEBRATION pool',
    pityLegendaryAt: 150,
  },
  {
    id: 'premium',
    name: 'JP High Class Pack',
    icon: '💎',
    cost: 500,
    cardsPerPack: 5,
    model: 'jp-sv-5',
    description: 'Same 5-card structure, better hit floor',
    pityLegendaryAt: 80,
  },
  {
    id: 'legendary',
    name: 'Showcase Pack',
    icon: '👑',
    cost: 2000,
    cardsPerPack: 5,
    model: 'jp-sv-5',
    description: 'Demo pack with elevated chase odds',
    pityLegendaryAt: 10,
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
  const cards: ICardInstance[] = [
    instanceOf('common', 'c'),
    instanceOf('common', 'c'),
    instanceOf('common', 'c'),
    instanceOf('rare', 'u'),
  ];
  let hitKind = rollJpHitSlot(cryptoRandom.nextFloat());
  if (pack.id === 'premium' && hitKind === 'r' && cryptoRandom.nextFloat() < 0.15) hitKind = 'ar';
  if (pack.id === 'legendary' && (hitKind === 'r' || hitKind === 'rr')) hitKind = cryptoRandom.nextFloat() < 0.4 ? 'sar' : 'sr';
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
  const actual = doubleDrop ? packCount * 2 : packCount;

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
