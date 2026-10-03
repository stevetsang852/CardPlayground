// RandomSummonService.ts — Random summon and synthesis logic for Battle Defense Mode
// Implements Requirements 13.1, 13.2, 13.3, 14.1, 14.2, 14.3

import { createGuardian, getElementFromSeries } from './GuardianFactory';
import type { Guardian, Deck, GridCell } from './BattleTypes';
import { CARD_TEMPLATES } from '../../cardData';

export interface SummonResult {
  guardian: Guardian;
  position: { x: number; y: number };
}

export class RandomSummonService {
  /**
   * Randomly summons a guardian from the deck at a random empty cell.
   * Returns null if SP is insufficient or no empty cells are available.
   * Requirements 13.1, 13.2, 13.3
   */
  randomSummon(
    deck: Deck,
    grid: GridCell[][],
    sp: number,
    cost: number,
  ): SummonResult | null {
    // SP check
    if (sp < cost) return null;

    // Get all empty cells
    const emptyCells = this.getEmptyCells(grid);
    if (emptyCells.length === 0) return null;

    // Pick a random cardId from deck
    const cardId = this.pickRandom(deck.cards);

    // Pick a random empty position
    const position = this.pickRandom(emptyCells);

    // Look up card template for rarity and series
    const template = CARD_TEMPLATES.find((c) => String(c.id) === String(cardId));
    const rarity = template?.rarity ?? 'common';
    const series = template?.series ?? '';

    const guardian = createGuardian(cardId, rarity, series, 1, position.x, position.y);

    return { guardian, position };
  }

  /**
   * Randomly synthesizes two guardians of the same level into a new guardian
   * with a random card type from the deck and level + 1.
   * Supports synthesis luck: if synthesisLuckChance is provided and Math.random() < chance,
   * the original guardian1's cardId is kept instead of picking randomly.
   * Requirements 14.1, 14.2, 14.3
   */
  randomSynthesis(
    guardian1: Guardian,
    guardian2: Guardian,
    deck: Deck,
    synthesisLuckChance?: number,
  ): Guardian {
    // Precondition: both guardians must be the same level
    if (guardian1.level !== guardian2.level) {
      throw new Error('守衛等級不同，無法合成');
    }

    const newLevel = guardian1.level + 1;
    if (newLevel > 5) {
      throw new Error('已達最高等級');
    }

    // Determine new cardId: synthesis luck may preserve original type
    let newCardId: string;
    if (
      synthesisLuckChance !== undefined &&
      Math.random() < synthesisLuckChance
    ) {
      // Synthesis luck: keep guardian1's card type
      newCardId = guardian1.cardId;
    } else {
      // Random type from deck (may coincidentally be the same — that's valid per Req 14.3)
      newCardId = this.pickRandom(deck.cards);
    }

    // Look up card template for rarity and series
    const template = CARD_TEMPLATES.find((c) => String(c.id) === String(newCardId));
    const rarity = template?.rarity ?? guardian1.rarity;
    const series = template?.series ?? '';

    return createGuardian(
      newCardId,
      rarity,
      series,
      newLevel,
      guardian1.gridX,
      guardian1.gridY,
    );
  }

  /**
   * Returns all empty cells in the grid.
   */
  private getEmptyCells(grid: GridCell[][]): { x: number; y: number }[] {
    const cells: { x: number; y: number }[] = [];
    for (const row of grid) {
      for (const cell of row) {
        if (!cell.guardian) {
          cells.push({ x: cell.x, y: cell.y });
        }
      }
    }
    return cells;
  }

  /**
   * Picks a random element from an array.
   */
  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
