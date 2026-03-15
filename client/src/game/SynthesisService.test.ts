import { synthesize, calculateSuccessRate, SYNTHESIS_RECIPES } from './SynthesisService';
import type { PlayerState, ActiveEvent } from '../store/gameStore';

if (typeof globalThis.crypto === 'undefined') {
  const nodeCrypto = eval('require')('crypto') as { webcrypto: Crypto };
  Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto.webcrypto });
}

const defaultPlayer: PlayerState = {
  softCurrency: 10000,
  hardCurrency: 0,
  luckValue: 0,
  drawsSinceLastLegendary: 0,
  drawsSinceLastMythic: 0,
  consecutiveSynthesisFailures: 0,
  totalDraws: 0,
  loginDays: 0,
  lastLoginDate: '',
  actionCount: 0,
};

const commonToRare = SYNTHESIS_RECIPES.find(r => r.id === 'common_to_rare')!;
const epicToLegendary = SYNTHESIS_RECIPES.find(r => r.id === 'epic_to_legendary')!;

describe('SynthesisService', () => {
  describe('calculateSuccessRate', () => {
    it('returns base rate with no modifiers', () => {
      const rate = calculateSuccessRate(commonToRare, defaultPlayer, []);
      expect(rate).toBe(0.70);
    });

    it('adds 10% after 3 consecutive failures', () => {
      const player = { ...defaultPlayer, consecutiveSynthesisFailures: 3 };
      const rate = calculateSuccessRate(commonToRare, player, []);
      expect(rate).toBeCloseTo(0.80);
    });

    it('adds 20% with synthesis_boost event', () => {
      const event: ActiveEvent = { id: 'e1', type: 'synthesis_boost', remainingActions: 1, multiplier: 1 };
      const rate = calculateSuccessRate(commonToRare, defaultPlayer, [event]);
      expect(rate).toBeCloseTo(0.90);
    });

    it('caps success rate at 100%', () => {
      const player = { ...defaultPlayer, consecutiveSynthesisFailures: 3 };
      const event: ActiveEvent = { id: 'e1', type: 'synthesis_boost', remainingActions: 1, multiplier: 1 };
      // epic_to_legendary: 0.30 + 0.10 + 0.20 = 0.60, still under 1.0
      // Use a recipe with high base rate to test cap
      const highRateRecipe = { ...commonToRare, baseSuccessRate: 0.90 };
      const rate = calculateSuccessRate(highRateRecipe, player, [event]);
      expect(rate).toBe(1.0);
    });
  });

  describe('synthesize', () => {
    it('throws if wrong number of material cards', () => {
      expect(() => synthesize(commonToRare, [1, 2], defaultPlayer, [])).toThrow();
    });

    it('consumes all material cards on success or failure', () => {
      // Run many times to get both outcomes
      let successSeen = false;
      let failureSeen = false;
      for (let i = 0; i < 100; i++) {
        const result = synthesize(commonToRare, [1, 2, 3], defaultPlayer, []);
        expect(result.consumedCardIds).toEqual([1, 2, 3]);
        if (result.success) successSeen = true;
        else failureSeen = true;
        if (successSeen && failureSeen) break;
      }
      expect(successSeen).toBe(true);
      expect(failureSeen).toBe(true);
    });

    it('returns output card of correct rarity on success', () => {
      // Force success by using a recipe with 100% rate
      const alwaysSucceed = { ...commonToRare, baseSuccessRate: 1.0 };
      const result = synthesize(alwaysSucceed, [1, 2, 3], defaultPlayer, []);
      expect(result.success).toBe(true);
      expect(result.outputCard).not.toBeNull();
      expect(result.outputCard!.rarity).toBe('rare');
    });

    it('returns null output card on failure', () => {
      const alwaysFail = { ...commonToRare, baseSuccessRate: 0.0 };
      const result = synthesize(alwaysFail, [1, 2, 3], defaultPlayer, []);
      expect(result.success).toBe(false);
      expect(result.outputCard).toBeNull();
    });

    it('resets consecutiveSynthesisFailures to 0 on success', () => {
      const alwaysSucceed = { ...commonToRare, baseSuccessRate: 1.0 };
      const player = { ...defaultPlayer, consecutiveSynthesisFailures: 5 };
      const result = synthesize(alwaysSucceed, [1, 2, 3], player, []);
      expect(result.updatedPlayer.consecutiveSynthesisFailures).toBe(0);
    });

    it('increments consecutiveSynthesisFailures on failure', () => {
      const alwaysFail = { ...commonToRare, baseSuccessRate: 0.0 };
      const player = { ...defaultPlayer, consecutiveSynthesisFailures: 2 };
      const result = synthesize(alwaysFail, [1, 2, 3], player, []);
      expect(result.updatedPlayer.consecutiveSynthesisFailures).toBe(3);
    });

    it('deducts soft currency cost', () => {
      const alwaysSucceed = { ...commonToRare, baseSuccessRate: 1.0 };
      const result = synthesize(alwaysSucceed, [1, 2, 3], defaultPlayer, []);
      expect(result.updatedPlayer.softCurrency).toBe(defaultPlayer.softCurrency - commonToRare.softCurrencyCost);
    });
  });
});
