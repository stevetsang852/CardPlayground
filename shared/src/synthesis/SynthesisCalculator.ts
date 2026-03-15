import { SynthesisRecipe } from '../types/synthesis';
import { ActiveEvent } from '../types/event';
import { SeededRandom } from '../random/SeededRandom';

/**
 * SynthesisCalculator - Calculates synthesis success rates and performs synthesis attempts
 * 
 * This class handles the calculation of synthesis success rates based on:
 * - Base success rate from the recipe
 * - Active event modifiers (Lucky Moment: +20%)
 * - Failure protection bonus (+10% after 3 consecutive failures)
 * 
 * Success rates are capped at 100% (1.0).
 */
export class SynthesisCalculator {
  /**
   * Calculates the effective success rate for a synthesis attempt
   * 
   * @param recipe - The synthesis recipe with base success rate
   * @param activeEvents - Array of currently active events
   * @param failureCount - Number of consecutive synthesis failures
   * @returns The calculated success rate (0.0 to 1.0)
   */
  calculateSuccessRate(
    recipe: SynthesisRecipe,
    activeEvents: ActiveEvent[],
    failureCount: number
  ): number {
    let rate = recipe.baseSuccessRate;
    
    // Apply Lucky Moment bonus (+20%)
    const luckyEvent = activeEvents.find(e => e.eventType === 'lucky');
    if (luckyEvent && luckyEvent.luckyMomentBonus) {
      rate += luckyEvent.luckyMomentBonus;
    }
    
    // Apply failure protection bonus (+10% after 3 failures)
    if (failureCount >= 3) {
      rate += 0.10;
    }
    
    // Cap at 100%
    return Math.min(rate, 1.0);
  }

  /**
   * Performs a synthesis attempt using deterministic random generation
   * 
   * @param recipe - The synthesis recipe (not used directly but included for API consistency)
   * @param successRate - The calculated success rate (0.0 to 1.0)
   * @param rng - Seeded random number generator for deterministic results
   * @returns true if synthesis succeeds, false if it fails
   */
  performSynthesis(
    recipe: SynthesisRecipe,
    successRate: number,
    rng: SeededRandom
  ): boolean {
    return rng.next() < successRate;
  }
}
