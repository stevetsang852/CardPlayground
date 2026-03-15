import type { ICardInstance, IAchievementProgress } from '../db';
import type { PlayerState } from '../store/gameStore';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  target: number;
  reward: number; // soft currency reward
  check: (player: PlayerState, cards: ICardInstance[]) => number; // returns current progress
}

export interface AchievementCheckResult {
  newlyUnlocked: IAchievementProgress[];
  currencyReward: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_draw',
    name: 'First Draw',
    description: 'Draw your first card',
    target: 1,
    reward: 100,
    check: (p) => Math.min(p.totalDraws, 1),
  },
  {
    id: 'draw_10',
    name: 'Collector',
    description: 'Draw 10 cards',
    target: 10,
    reward: 200,
    check: (p) => Math.min(p.totalDraws, 10),
  },
  {
    id: 'draw_100',
    name: 'Dedicated Collector',
    description: 'Draw 100 cards',
    target: 100,
    reward: 500,
    check: (p) => Math.min(p.totalDraws, 100),
  },
  {
    id: 'draw_1000',
    name: 'Card Fanatic',
    description: 'Draw 1000 cards',
    target: 1000,
    reward: 2000,
    check: (p) => Math.min(p.totalDraws, 1000),
  },
  {
    id: 'first_rare',
    name: 'Rare Find',
    description: 'Obtain your first rare card',
    target: 1,
    reward: 150,
    check: (_, cards) => Math.min(cards.filter(c => c.rarity === 'rare').length, 1),
  },
  {
    id: 'first_epic',
    name: 'Epic Discovery',
    description: 'Obtain your first epic card',
    target: 1,
    reward: 300,
    check: (_, cards) => Math.min(cards.filter(c => c.rarity === 'epic').length, 1),
  },
  {
    id: 'first_legendary',
    name: 'Legendary!',
    description: 'Obtain your first legendary card',
    target: 1,
    reward: 1000,
    check: (_, cards) => Math.min(cards.filter(c => c.rarity === 'legendary').length, 1),
  },
  {
    id: 'first_mythic',
    name: 'Beyond Legendary',
    description: 'Obtain your first mythic card',
    target: 1,
    reward: 5000,
    check: (_, cards) => Math.min(cards.filter(c => c.rarity === 'mythic').length, 1),
  },
  {
    id: 'first_synthesis',
    name: 'Alchemist',
    description: 'Perform your first synthesis',
    target: 1,
    reward: 200,
    check: (p) => p.totalDraws > 0 && p.consecutiveSynthesisFailures >= 0 ? 0 : 0, // tracked externally
  },
  {
    id: 'collection_50',
    name: 'Growing Collection',
    description: 'Collect 50 unique cards',
    target: 50,
    reward: 500,
    check: (_, cards) => {
      const unique = new Set(cards.map(c => c.cardId));
      return Math.min(unique.size, 50);
    },
  },
  {
    id: 'collection_100',
    name: 'Century Collector',
    description: 'Collect 100 unique cards',
    target: 100,
    reward: 1500,
    check: (_, cards) => {
      const unique = new Set(cards.map(c => c.cardId));
      return Math.min(unique.size, 100);
    },
  },
  {
    id: 'login_7',
    name: 'Weekly Visitor',
    description: 'Log in for 7 days',
    target: 7,
    reward: 700,
    check: (p) => Math.min(p.loginDays, 7),
  },
  {
    id: 'login_30',
    name: 'Monthly Devotee',
    description: 'Log in for 30 days',
    target: 30,
    reward: 3000,
    check: (p) => Math.min(p.loginDays, 30),
  },
];

/**
 * Check all achievements and return newly unlocked ones.
 * Already-unlocked achievements are skipped.
 */
export function checkAchievements(
  player: PlayerState,
  cards: ICardInstance[],
  existingAchievements: IAchievementProgress[]
): AchievementCheckResult {
  const existingMap = new Map(existingAchievements.map(a => [a.id, a]));
  const newlyUnlocked: IAchievementProgress[] = [];
  let currencyReward = 0;

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const existing = existingMap.get(def.id);
    if (existing?.unlocked) continue; // already unlocked

    const progress = def.check(player, cards);
    if (progress >= def.target) {
      const unlocked: IAchievementProgress = {
        id: def.id,
        unlocked: true,
        progress,
        unlockedAt: Date.now(),
      };
      newlyUnlocked.push(unlocked);
      currencyReward += def.reward;
    }
  }

  return { newlyUnlocked, currencyReward };
}

/**
 * Get progress for all achievements (for display).
 */
export function getAllAchievementProgress(
  player: PlayerState,
  cards: ICardInstance[],
  existingAchievements: IAchievementProgress[]
): IAchievementProgress[] {
  const existingMap = new Map(existingAchievements.map(a => [a.id, a]));

  return ACHIEVEMENT_DEFINITIONS.map(def => {
    const existing = existingMap.get(def.id);
    if (existing?.unlocked) return existing;
    return {
      id: def.id,
      unlocked: false,
      progress: def.check(player, cards),
    };
  });
}
