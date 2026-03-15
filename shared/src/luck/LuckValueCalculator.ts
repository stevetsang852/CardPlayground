/**
 * LuckValueCalculator implements a hidden pity mechanism that increases
 * legendary drop rates after unsuccessful attempts.
 * 
 * The system works as follows:
 * - Each non-legendary draw increments the player's luck value
 * - Once luck value exceeds a threshold, legendary probability increases
 * - When a legendary is drawn, luck value resets to zero
 * 
 * Validates Requirements 1.6, 1.7, 1.8
 */
export class LuckValueCalculator {
  private readonly INCREMENT_PER_DRAW = 1.0;
  private readonly THRESHOLD = 50.0;
  private readonly MAX_BONUS = 0.05; // 5% max bonus

  /**
   * Calculate the bonus probability to add to legendary drop rate
   * based on the current luck value.
   * 
   * @param luckValue - The player's current luck value
   * @returns Bonus probability (0 to MAX_BONUS)
   * 
   * Validates Requirement 1.7: Increase legendary probability proportionally
   * when Luck_Value exceeds threshold
   */
  calculateBonusProbability(luckValue: number): number {
    if (luckValue < this.THRESHOLD) {
      return 0;
    }

    const excessLuck = luckValue - this.THRESHOLD;
    const bonus = Math.min(
      (excessLuck / this.THRESHOLD) * this.MAX_BONUS,
      this.MAX_BONUS
    );

    return bonus;
  }

  /**
   * Update the luck value based on whether a legendary was drawn.
   * 
   * @param currentLuck - The player's current luck value
   * @param drewLegendary - Whether a legendary card was drawn
   * @returns The new luck value
   * 
   * Validates Requirement 1.6: Increment Luck_Value by configured amount
   * after non-legendary draws
   * 
   * Validates Requirement 1.8: Reset Luck_Value to zero when legendary
   * card is received
   */
  updateLuckValue(currentLuck: number, drewLegendary: boolean): number {
    if (drewLegendary) {
      return 0;
    }
    return currentLuck + this.INCREMENT_PER_DRAW;
  }
}
