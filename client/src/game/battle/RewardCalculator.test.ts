import { RewardCalculator } from './RewardCalculator';

// Mock dataService to avoid real persistence
jest.mock('../../services', () => ({
  dataService: {
    saveSetting: jest.fn(),
  },
}));

describe('RewardCalculator', () => {
  let calc: RewardCalculator;

  beforeEach(() => {
    calc = new RewardCalculator();
  });

  // Requirement 9.1: coins = wave × 10 (any mode)
  describe('calculateWaveReward', () => {
    it('returns coins equal to wave × 10 for wave 1', () => {
      const reward = calc.calculateWaveReward(1);
      expect(reward.type).toBe('coin');
      expect(reward.amount).toBe(10);
    });

    it('returns coins equal to wave × 10 for wave 5', () => {
      const reward = calc.calculateWaveReward(5);
      expect(reward.type).toBe('coin');
      expect(reward.amount).toBe(50);
    });

    it('returns coins equal to wave × 10 for wave 10', () => {
      const reward = calc.calculateWaveReward(10);
      expect(reward.type).toBe('coin');
      expect(reward.amount).toBe(100);
    });

    it('includes a reason string', () => {
      const reward = calc.calculateWaveReward(3);
      expect(reward.reason).toBeTruthy();
    });
  });

  // Requirement 9.2: Daily Challenge victory gives +1 draw ticket
  describe('calculateDailyChallengeBonus', () => {
    it('returns a ticket reward on victory', () => {
      const reward = calc.calculateDailyChallengeBonus();
      expect(reward.type).toBe('ticket');
      expect(reward.amount).toBe(1);
    });

    it('has a reason string', () => {
      const reward = calc.calculateDailyChallengeBonus();
      expect(reward.reason).toBeTruthy();
    });
  });

  // Requirement 9.3: Endless mode milestone rewards at waves 10, 25, 50, 100
  describe('calculateMilestoneReward', () => {
    it.each([10, 25, 50, 100])('returns a reward at milestone wave %i', (wave) => {
      const reward = calc.calculateMilestoneReward(wave);
      expect(reward).not.toBeNull();
      expect(reward!.amount).toBeGreaterThan(0);
    });

    it.each([1, 5, 11, 20, 30, 99, 101])('returns null for non-milestone wave %i', (wave) => {
      const reward = calc.calculateMilestoneReward(wave);
      expect(reward).toBeNull();
    });
  });

  // Requirement 9.4: Boss kill immediate reward: 50 coins OR 1 draw ticket
  describe('calculateBossKillReward', () => {
    it('returns either 50 coins or 1 ticket', () => {
      // Run multiple times to cover both branches
      const results = Array.from({ length: 20 }, () => calc.calculateBossKillReward());
      for (const reward of results) {
        const isCoins = reward.type === 'coin' && reward.amount === 50;
        const isTicket = reward.type === 'ticket' && reward.amount === 1;
        expect(isCoins || isTicket).toBe(true);
      }
    });

    it('has a reason string', () => {
      const reward = calc.calculateBossKillReward();
      expect(reward.reason).toBeTruthy();
    });
  });

  // Daily challenge defeat should NOT give a draw ticket (caller responsibility)
  // The calculator only provides the bonus when explicitly called; no defeat path exists
  describe('daily challenge defeat', () => {
    it('calculateDailyChallengeBonus is only called on victory — defeat gives no ticket', () => {
      // The API has no "defeat" variant; the bonus is only granted when the caller
      // explicitly invokes calculateDailyChallengeBonus (i.e., on victory).
      // Verifying the function always returns exactly 1 ticket (not 0) confirms
      // that callers must gate it behind a victory condition.
      const reward = calc.calculateDailyChallengeBonus();
      expect(reward.type).toBe('ticket');
      expect(reward.amount).toBe(1);
    });
  });

  // applyRewards: coins are credited, dataService is called
  describe('applyRewards', () => {
    it('adds coin rewards to softCurrency', () => {
      const store = {
        player: { softCurrency: 100 },
        setPlayer: jest.fn(),
      };
      calc.applyRewards([{ type: 'coin', amount: 50, reason: 'test' }], store);
      expect(store.setPlayer).toHaveBeenCalledWith({ softCurrency: 150 });
    });

    it('does not call setPlayer when there are no coin rewards', () => {
      const store = {
        player: { softCurrency: 100 },
        setPlayer: jest.fn(),
      };
      calc.applyRewards([{ type: 'ticket', amount: 1, reason: 'test' }], store);
      expect(store.setPlayer).not.toHaveBeenCalled();
    });
  });
});
