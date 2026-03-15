import { cryptoRandom } from './CryptoRandom';
import { CARD_TEMPLATES, type Rarity } from '../cardData';
import type { ICardInstance } from '../db';
import type { PlayerState, ActiveEvent } from '../store/gameStore';

export interface PackConfig {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
  probabilities: Record<Rarity, number>;
  pityLegendaryAt: number;
  pityMythicAt: number;
}

export interface DrawResult {
  cards: ICardInstance[];
  updatedPlayer: Partial<PlayerState>;
}

export const PACK_CONFIGS: PackConfig[] = [
  {
    id: 'basic',
    name: 'Basic Pack',
    icon: '🎴',
    cost: 100,
    description: 'Standard card pack with balanced odds',
    probabilities: { common: 0.70, rare: 0.25, epic: 0.045, legendary: 0.005, mythic: 0 },
    pityLegendaryAt: 100,
    pityMythicAt: 1000,
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    icon: '💎',
    cost: 300,
    description: 'Enhanced odds for rare and epic cards',
    probabilities: { common: 0.50, rare: 0.35, epic: 0.12, legendary: 0.025, mythic: 0.005 },
    pityLegendaryAt: 80,
    pityMythicAt: 800,
  },
  {
    id: 'legendary',
    name: 'Legendary Pack',
    icon: '👑',
    cost: 1000,
    description: 'Premium pack with high legendary rates',
    probabilities: { common: 0.20, rare: 0.40, epic: 0.30, legendary: 0.09, mythic: 0.01 },
    pityLegendaryAt: 50,
    pityMythicAt: 500,
  },
];

// Card pool grouped by rarity
const CARD_POOL: Record<Rarity, typeof CARD_TEMPLATES> = {
  common: CARD_TEMPLATES.filter(c => c.rarity === 'common'),
  rare: CARD_TEMPLATES.filter(c => c.rarity === 'rare'),
  epic: CARD_TEMPLATES.filter(c => c.rarity === 'epic'),
  legendary: CARD_TEMPLATES.filter(c => c.rarity === 'legendary'),
  mythic: CARD_TEMPLATES.filter(c => c.rarity === 'mythic'),
};

function rollRarity(pack: PackConfig, player: PlayerState): Rarity {
  // Check pity system first
  if (player.drawsSinceLastMythic >= pack.pityMythicAt) return 'mythic';
  if (player.drawsSinceLastLegendary >= pack.pityLegendaryAt) return 'legendary';

  // Apply luck bonus to legendary probability (max +2%)
  const luckBonus = Math.min(player.luckValue * 0.0001, 0.02);
  const probs = { ...pack.probabilities };
  probs.legendary = Math.min(probs.legendary + luckBonus, 1);
  // Normalize
  const total = Object.values(probs).reduce((s, p) => s + p, 0);
  const normalized = Object.fromEntries(
    Object.entries(probs).map(([k, v]) => [k, v / total])
  ) as Record<Rarity, number>;

  const roll = cryptoRandom.nextFloat();
  let cumulative = 0;
  const order: Rarity[] = ['mythic', 'legendary', 'epic', 'rare', 'common'];
  for (const rarity of order) {
    cumulative += normalized[rarity];
    if (roll < cumulative) return rarity;
  }
  return 'common';
}

function pickCard(rarity: Rarity): typeof CARD_TEMPLATES[0] {
  const pool = CARD_POOL[rarity];
  if (!pool || pool.length === 0) {
    // Fallback to common if pool empty (shouldn't happen)
    return CARD_POOL.common[cryptoRandom.nextInt(0, CARD_POOL.common.length - 1)]!;
  }
  return pool[cryptoRandom.nextInt(0, pool.length - 1)]!;
}

export function drawCards(
  pack: PackConfig,
  count: number,
  player: PlayerState,
  activeEvents: ActiveEvent[]
): DrawResult {
  const drawnCards: ICardInstance[] = [];
  let { drawsSinceLastLegendary, drawsSinceLastMythic, luckValue, totalDraws } = player;

  // Check for double_drop event
  const doubleDropActive = activeEvents.some(e => e.type === 'double_drop' && e.remainingActions > 0);
  const actualCount = doubleDropActive ? count * 2 : count;

  for (let i = 0; i < actualCount; i++) {
    const rarity = rollRarity(pack, {
      ...player,
      drawsSinceLastLegendary,
      drawsSinceLastMythic,
      luckValue,
    });

    const template = pickCard(rarity);
    drawnCards.push({
      cardId: template.id,
      rarity: template.rarity,
      level: 1,
      obtainedAt: Date.now(),
    });

    // Update pity counters
    if (rarity === 'mythic') {
      drawsSinceLastMythic = 0;
      drawsSinceLastLegendary = 0;
      luckValue = Math.max(0, luckValue - 50);
    } else if (rarity === 'legendary') {
      drawsSinceLastLegendary = 0;
      luckValue = Math.max(0, luckValue - 20);
    } else {
      drawsSinceLastLegendary++;
      drawsSinceLastMythic++;
      luckValue += 1; // luck builds up on non-legendary draws
    }
    totalDraws++;
  }

  return {
    cards: drawnCards,
    updatedPlayer: {
      drawsSinceLastLegendary,
      drawsSinceLastMythic,
      luckValue,
      totalDraws,
      softCurrency: player.softCurrency - pack.cost * Math.ceil(count / 1),
    },
  };
}
