import type { BattleReward } from './BattleTypes';
import { dataService } from '../../services';

const ENDLESS_MILESTONES = [10, 25, 50, 100];

export class RewardCalculator {
  /** Calculate wave completion coins (any mode): coins = wave × 10 */
  calculateWaveReward(wave: number): BattleReward {
    return {
      type: 'coin',
      amount: wave * 10,
      reason: `Wave ${wave} completion`,
    };
  }

  /** Calculate daily challenge victory bonus: +1 draw ticket */
  calculateDailyChallengeBonus(): BattleReward {
    return {
      type: 'ticket',
      amount: 1,
      reason: 'Daily Challenge victory',
    };
  }

  /**
   * Calculate endless milestone reward.
   * Returns null if wave is not a milestone (10, 25, 50, 100).
   */
  calculateMilestoneReward(wave: number): BattleReward | null {
    if (!ENDLESS_MILESTONES.includes(wave)) {
      return null;
    }
    return {
      type: 'material',
      amount: 1,
      reason: `Endless milestone wave ${wave}`,
    };
  }

  /** Calculate boss kill reward: coin 50 OR draw ticket ×1 (random) */
  calculateBossKillReward(): BattleReward {
    if (Math.random() < 0.5) {
      return {
        type: 'coin',
        amount: 50,
        reason: 'Boss kill reward',
      };
    }
    return {
      type: 'ticket',
      amount: 1,
      reason: 'Boss kill reward',
    };
  }

  /**
   * Apply rewards to gameStore and persist via dataService.
   * Only 'coin' type rewards are applied to softCurrency.
   * Tickets and materials are tracked in the rewards array for display purposes.
   */
  applyRewards(
    rewards: BattleReward[],
    gameStore: {
      player: { softCurrency: number };
      setPlayer: (update: Partial<{ softCurrency: number }>) => void;
    }
  ): void {
    const totalCoins = rewards
      .filter((r) => r.type === 'coin')
      .reduce((sum, r) => sum + r.amount, 0);

    if (totalCoins > 0) {
      const newSoftCurrency = gameStore.player.softCurrency + totalCoins;
      gameStore.setPlayer({ softCurrency: newSoftCurrency });
    }

    // Persist via dataService
    const updatedPlayer = {
      ...gameStore.player,
      softCurrency: gameStore.player.softCurrency + totalCoins,
    };
    dataService.saveSetting('playerState', JSON.stringify(updatedPlayer));
  }
}
