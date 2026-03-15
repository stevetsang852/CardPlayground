import {
  checkDailyLogin,
  completeMission,
  getSeasonProgress,
  generateDailyMissions,
  checkMilestoneReward,
} from './SeasonService';
import type { PlayerState, Mission } from '../store/gameStore';

const defaultPlayer: PlayerState = {
  softCurrency: 500,
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

describe('SeasonService', () => {
  describe('checkDailyLogin', () => {
    it('awards reward on first login (new day)', () => {
      const result = checkDailyLogin(defaultPlayer);
      expect(result.isNewDay).toBe(true);
      expect(result.reward).toBeGreaterThan(0);
    });

    it('does not award reward if already logged in today', () => {
      const today = new Date().toISOString().slice(0, 10);
      const player = { ...defaultPlayer, lastLoginDate: today };
      const result = checkDailyLogin(player);
      expect(result.isNewDay).toBe(false);
      expect(result.reward).toBe(0);
    });

    it('increments loginDays on new day', () => {
      const result = checkDailyLogin(defaultPlayer);
      expect(result.updatedPlayer.loginDays).toBe(1);
    });

    it('adds reward to softCurrency', () => {
      const result = checkDailyLogin(defaultPlayer);
      expect(result.updatedPlayer.softCurrency).toBe(defaultPlayer.softCurrency + result.reward);
    });

    it('reward scales with login streak', () => {
      const veteran = { ...defaultPlayer, loginDays: 20 };
      const result = checkDailyLogin(veteran);
      const newbie = checkDailyLogin(defaultPlayer);
      expect(result.reward).toBeGreaterThan(newbie.reward);
    });
  });

  describe('completeMission', () => {
    const missions: Mission[] = [
      { id: 'draw_3', description: 'Draw 3 cards', target: 3, progress: 3, completed: false, reward: 100 },
    ];

    it('completes a valid mission', () => {
      const result = completeMission('draw_3', missions, defaultPlayer);
      expect(result.success).toBe(true);
      expect(result.reward).toBe(100);
    });

    it('fails for unknown mission', () => {
      const result = completeMission('unknown', missions, defaultPlayer);
      expect(result.success).toBe(false);
    });

    it('fails for already completed mission', () => {
      const completed: Mission[] = [
        { id: 'draw_3', description: 'Draw 3 cards', target: 3, progress: 3, completed: true, reward: 100 },
      ];
      const result = completeMission('draw_3', completed, defaultPlayer);
      expect(result.success).toBe(false);
    });
  });

  describe('getSeasonProgress', () => {
    it('returns correct completed count', () => {
      const missions: Mission[] = generateDailyMissions();
      missions[0]!.completed = true;
      const progress = getSeasonProgress(missions);
      expect(progress.completedMissions).toBe(1);
    });

    it('returns correct total missions', () => {
      const missions = generateDailyMissions();
      const progress = getSeasonProgress(missions);
      expect(progress.totalMissions).toBe(missions.length);
    });
  });

  describe('checkMilestoneReward', () => {
    it('returns reward at milestone 5', () => {
      expect(checkMilestoneReward(5)).toBe(500);
    });

    it('returns 0 for non-milestone counts', () => {
      expect(checkMilestoneReward(3)).toBe(0);
    });

    it('returns reward at milestone 30', () => {
      expect(checkMilestoneReward(30)).toBe(10000);
    });
  });
});
