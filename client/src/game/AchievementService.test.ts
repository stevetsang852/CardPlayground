import { checkAchievements, ACHIEVEMENT_DEFINITIONS } from './AchievementService';
import type { PlayerState } from '../store/gameStore';
import type { ICardInstance } from '../db';

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

function makeCard(cardId: number, rarity: ICardInstance['rarity']): ICardInstance {
  return { id: cardId, cardId, rarity, level: 1, obtainedAt: Date.now() };
}

describe('AchievementService', () => {
  describe('checkAchievements', () => {
    it('unlocks first_draw when totalDraws >= 1', () => {
      const player = { ...defaultPlayer, totalDraws: 1 };
      const result = checkAchievements(player, [], []);
      const ids = result.newlyUnlocked.map(a => a.id);
      expect(ids).toContain('first_draw');
    });

    it('does not unlock first_draw when totalDraws is 0', () => {
      const result = checkAchievements(defaultPlayer, [], []);
      const ids = result.newlyUnlocked.map(a => a.id);
      expect(ids).not.toContain('first_draw');
    });

    it('does not re-unlock already unlocked achievements', () => {
      const player = { ...defaultPlayer, totalDraws: 10 };
      const existing = [{ id: 'first_draw', unlocked: true, progress: 1, unlockedAt: 0 }];
      const result = checkAchievements(player, [], existing);
      const ids = result.newlyUnlocked.map(a => a.id);
      expect(ids).not.toContain('first_draw');
    });

    it('unlocks first_rare when player has a rare card', () => {
      const cards = [makeCard(121, 'rare')];
      const result = checkAchievements(defaultPlayer, cards, []);
      const ids = result.newlyUnlocked.map(a => a.id);
      expect(ids).toContain('first_rare');
    });

    it('unlocks first_legendary when player has a legendary card', () => {
      const cards = [makeCard(196, 'legendary')];
      const result = checkAchievements(defaultPlayer, cards, []);
      const ids = result.newlyUnlocked.map(a => a.id);
      expect(ids).toContain('first_legendary');
    });

    it('awards correct currency reward', () => {
      const player = { ...defaultPlayer, totalDraws: 1 };
      const result = checkAchievements(player, [], []);
      // first_draw reward is 100
      expect(result.currencyReward).toBeGreaterThanOrEqual(100);
    });

    it('unlocks collection_50 when 50 unique cards collected', () => {
      const cards = Array.from({ length: 50 }, (_, i) => makeCard(i + 1, 'common'));
      const result = checkAchievements(defaultPlayer, cards, []);
      const ids = result.newlyUnlocked.map(a => a.id);
      expect(ids).toContain('collection_50');
    });

    it('unlocks login_7 when loginDays >= 7', () => {
      const player = { ...defaultPlayer, loginDays: 7 };
      const result = checkAchievements(player, [], []);
      const ids = result.newlyUnlocked.map(a => a.id);
      expect(ids).toContain('login_7');
    });
  });
});
