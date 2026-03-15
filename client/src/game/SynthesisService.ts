import { cryptoRandom } from './CryptoRandom';
import { CARD_TEMPLATES, type Rarity } from '../cardData';
import type { ICardInstance } from '../db';
import type { PlayerState, ActiveEvent } from '../store/gameStore';

export interface SynthesisRecipe {
  id: string;
  name: string;
  inputRarity: Rarity;
  outputRarity: Rarity;
  inputCount: number;
  baseSuccessRate: number;
  softCurrencyCost: number;
}

export interface SynthesisResult {
  success: boolean;
  outputCard: ICardInstance | null;
  consumedCardIds: number[];
  updatedPlayer: Partial<PlayerState>;
}

export const SYNTHESIS_RECIPES: SynthesisRecipe[] = [
  { id: 'common_to_rare',      name: 'Common → Rare',      inputRarity: 'common',    outputRarity: 'rare',      inputCount: 3, baseSuccessRate: 0.70, softCurrencyCost: 50  },
  { id: 'rare_to_epic',        name: 'Rare → Epic',        inputRarity: 'rare',      outputRarity: 'epic',      inputCount: 3, baseSuccessRate: 0.50, softCurrencyCost: 150 },
  { id: 'epic_to_legendary',   name: 'Epic → Legendary',   inputRarity: 'epic',      outputRarity: 'legendary', inputCount: 3, baseSuccessRate: 0.30, softCurrencyCost: 500 },
  { id: 'legendary_to_mythic', name: 'Legendary → Mythic', inputRarity: 'legendary', outputRarity: 'mythic',    inputCount: 3, baseSuccessRate: 0.10, softCurrencyCost: 2000 },
];

export function calculateSuccessRate(
  recipe: SynthesisRecipe,
  player: PlayerState,
  activeEvents: ActiveEvent[]
): number {
  let rate = recipe.baseSuccessRate;

  // synthesis_boost event bonus
  const boostEvent = activeEvents.find(e => e.type === 'synthesis_boost' && e.remainingActions > 0);
  if (boostEvent) rate += 0.20;

  // Failure protection after 3 consecutive failures
  if (player.consecutiveSynthesisFailures >= 3) rate += 0.10;

  return Math.min(rate, 1.0);
}

function pickOutputCard(rarity: Rarity): ICardInstance {
  const pool = CARD_TEMPLATES.filter(c => c.rarity === rarity);
  const template = pool[cryptoRandom.nextInt(0, pool.length - 1)]!;
  return { cardId: template.id, rarity: template.rarity, level: 1, obtainedAt: Date.now() };
}

export function synthesize(
  recipe: SynthesisRecipe,
  materialCardIds: number[],
  player: PlayerState,
  activeEvents: ActiveEvent[]
): SynthesisResult {
  if (materialCardIds.length !== recipe.inputCount) {
    throw new Error(`Expected ${recipe.inputCount} material cards, got ${materialCardIds.length}`);
  }

  const successRate = calculateSuccessRate(recipe, player, activeEvents);
  const roll = cryptoRandom.nextFloat();
  const success = roll < successRate;

  const newFailures = success ? 0 : player.consecutiveSynthesisFailures + 1;

  return {
    success,
    outputCard: success ? pickOutputCard(recipe.outputRarity) : null,
    consumedCardIds: materialCardIds,
    updatedPlayer: {
      consecutiveSynthesisFailures: newFailures,
      softCurrency: player.softCurrency - recipe.softCurrencyCost,
    },
  };
}
