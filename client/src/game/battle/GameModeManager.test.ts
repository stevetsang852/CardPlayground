import { GameModeManager } from './GameModeManager';

describe('GameModeManager', () => {
  let manager: GameModeManager;

  beforeEach(() => {
    manager = new GameModeManager();
    localStorage.clear();
  });

  // ─── Mode Config ───────────────────────────────────────────────────────────

  describe('getModeConfig', () => {
    it('returns daily_challenge config with maxWaves=20 and no boss-only', () => {
      const cfg = manager.getModeConfig('daily_challenge');
      expect(cfg.mode).toBe('daily_challenge');
      expect(cfg.maxWaves).toBe(20);
      expect(cfg.onlyBosses).toBe(false);
    });

    it('endless mode has no wave limit (maxWaves=null)', () => {
      const cfg = manager.getModeConfig('endless');
      expect(cfg.maxWaves).toBeNull();
      expect(cfg.onlyBosses).toBe(false);
    });

    it('boss_rush only generates boss enemies (onlyBosses=true)', () => {
      const cfg = manager.getModeConfig('boss_rush');
      expect(cfg.onlyBosses).toBe(true);
    });

    it('boss_rush has no wave limit', () => {
      const cfg = manager.getModeConfig('boss_rush');
      expect(cfg.maxWaves).toBeNull();
    });
  });

  // ─── Daily Challenge ───────────────────────────────────────────────────────

  describe('checkDailyChallenge', () => {
    it('first attempt on a day is allowed', () => {
      const now = new Date('2024-06-15T10:00:00');
      const result = manager.checkDailyChallenge(now);
      expect(result.allowed).toBe(true);
      expect(result.remainingMs).toBeUndefined();
    });

    it('second attempt on the same day is rejected', () => {
      const now = new Date('2024-06-15T10:00:00');
      manager.completeDailyChallenge(now);

      const later = new Date('2024-06-15T18:00:00');
      const result = manager.checkDailyChallenge(later);
      expect(result.allowed).toBe(false);
    });

    it('second attempt returns remainingMs > 0', () => {
      const now = new Date('2024-06-15T10:00:00');
      manager.completeDailyChallenge(now);

      const later = new Date('2024-06-15T23:00:00');
      const result = manager.checkDailyChallenge(later);
      expect(result.remainingMs).toBeGreaterThan(0);
    });

    it('attempt on a different day is allowed again', () => {
      const day1 = new Date('2024-06-15T10:00:00');
      manager.completeDailyChallenge(day1);

      const day2 = new Date('2024-06-16T08:00:00');
      const result = manager.checkDailyChallenge(day2);
      expect(result.allowed).toBe(true);
    });
  });

  // ─── completeDailyChallenge ────────────────────────────────────────────────

  describe('completeDailyChallenge', () => {
    it('records completion in localStorage with the correct date key', () => {
      const now = new Date('2024-06-15T12:00:00');
      manager.completeDailyChallenge(now);

      const key = 'battle_daily_2024-06-15';
      expect(localStorage.getItem(key)).not.toBeNull();
    });

    it('stored value is the timestamp of completion', () => {
      const now = new Date('2024-06-15T12:00:00');
      manager.completeDailyChallenge(now);

      const key = 'battle_daily_2024-06-15';
      const stored = localStorage.getItem(key);
      expect(stored).toBe(String(now.getTime()));
    });
  });

  // ─── Reset time calculation ────────────────────────────────────────────────

  describe('reset time calculation', () => {
    it('remainingMs equals time until next midnight (00:00)', () => {
      const now = new Date('2024-06-15T23:00:00');
      manager.completeDailyChallenge(now);

      const result = manager.checkDailyChallenge(now);
      expect(result.allowed).toBe(false);

      // Next midnight is 2024-06-16T00:00:00
      const nextMidnight = new Date('2024-06-16T00:00:00').getTime();
      const expected = nextMidnight - now.getTime();
      expect(result.remainingMs).toBe(expected);
    });

    it('remainingMs is exactly 1 hour before midnight', () => {
      const now = new Date('2024-06-15T23:00:00');
      manager.completeDailyChallenge(now);

      const result = manager.checkDailyChallenge(now);
      // 1 hour = 3_600_000 ms
      expect(result.remainingMs).toBe(3_600_000);
    });
  });

  // ─── Mode switching ────────────────────────────────────────────────────────

  describe('mode switching', () => {
    it('can retrieve config for all three modes', () => {
      const modes = ['daily_challenge', 'endless', 'boss_rush'] as const;
      for (const mode of modes) {
        const cfg = manager.getModeConfig(mode);
        expect(cfg.mode).toBe(mode);
      }
    });

    it('daily_challenge and endless are independent (different configs)', () => {
      const daily = manager.getModeConfig('daily_challenge');
      const endless = manager.getModeConfig('endless');
      expect(daily.maxWaves).not.toBe(endless.maxWaves);
    });
  });

  // ─── isMilestone ──────────────────────────────────────────────────────────

  describe('isMilestone', () => {
    it('endless mode has milestones at 10, 25, 50, 100', () => {
      expect(manager.isMilestone(10, 'endless')).toBe(true);
      expect(manager.isMilestone(25, 'endless')).toBe(true);
      expect(manager.isMilestone(50, 'endless')).toBe(true);
      expect(manager.isMilestone(100, 'endless')).toBe(true);
    });

    it('non-milestone wave returns false for endless', () => {
      expect(manager.isMilestone(5, 'endless')).toBe(false);
      expect(manager.isMilestone(99, 'endless')).toBe(false);
    });

    it('daily_challenge has no milestones', () => {
      expect(manager.isMilestone(10, 'daily_challenge')).toBe(false);
    });

    it('boss_rush has no milestones', () => {
      expect(manager.isMilestone(10, 'boss_rush')).toBe(false);
    });
  });

  // ─── High Score ───────────────────────────────────────────────────────────

  describe('getHighScore / setHighScore', () => {
    it('returns 0 when no high score is stored', () => {
      expect(manager.getHighScore('endless')).toBe(0);
    });

    it('stores and retrieves a high score', () => {
      manager.setHighScore('endless', 42);
      expect(manager.getHighScore('endless')).toBe(42);
    });

    it('does not overwrite with a lower score', () => {
      manager.setHighScore('endless', 42);
      manager.setHighScore('endless', 10);
      expect(manager.getHighScore('endless')).toBe(42);
    });

    it('high scores are stored per mode independently', () => {
      manager.setHighScore('endless', 50);
      manager.setHighScore('boss_rush', 20);
      expect(manager.getHighScore('endless')).toBe(50);
      expect(manager.getHighScore('boss_rush')).toBe(20);
    });
  });
});
