import { drawCards, PACK_CONFIGS } from './DrawService';
import type { PlayerState, ActiveEvent } from '../store/gameStore';

// Polyfill crypto for Node/Jest
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

const basicPack = PACK_CONFIGS.find(p => p.id === 'basic')!;
const premiumPack = PACK_CONFIGS.find(p => p.id === 'premium')!;

describe('DrawService', () => {
  describe('drawCards', () => {
    it('returns the correct number of cards', () => {
      const result = drawCards(basicPack, 10, defaultPlayer, []);
      expect(result.cards).toHaveLength(10);
    });

    it('all drawn cards have valid rarities', () => {
      const result = drawCards(basicPack, 50, defaultPlayer, []);
      const validRarities = ['common', 'rare', 'epic', 'legendary', 'mythic'];
      for (const card of result.cards) {
        expect(validRarities).toContain(card.rarity);
      }
    });

    it('pity system triggers legendary at threshold', () => {
      const playerAtPity: PlayerState = {
        ...defaultPlayer,
        drawsSinceLastLegendary: basicPack.pityLegendaryAt,
      };
      const result = drawCards(basicPack, 1, playerAtPity, []);
      expect(result.cards[0]!.rarity).toBe('legendary');
    });

    it('pity system triggers mythic at threshold', () => {
      const playerAtPity: PlayerState = {
        ...defaultPlayer,
        drawsSinceLastMythic: basicPack.pityMythicAt,
      };
      const result = drawCards(basicPack, 1, playerAtPity, []);
      expect(result.cards[0]!.rarity).toBe('mythic');
    });

    it('double_drop event doubles card count', () => {
      const doubleDropEvent: ActiveEvent = {
        id: 'evt1',
        type: 'double_drop',
        remainingActions: 5,
        multiplier: 2,
      };
      const result = drawCards(basicPack, 10, defaultPlayer, [doubleDropEvent]);
      expect(result.cards).toHaveLength(20);
    });

    it('updates totalDraws in updatedPlayer', () => {
      const result = drawCards(basicPack, 5, defaultPlayer, []);
      expect(result.updatedPlayer.totalDraws).toBe(5);
    });

    it('resets drawsSinceLastLegendary after legendary draw', () => {
      const playerAtPity: PlayerState = {
        ...defaultPlayer,
        drawsSinceLastLegendary: basicPack.pityLegendaryAt,
      };
      const result = drawCards(basicPack, 1, playerAtPity, []);
      expect(result.updatedPlayer.drawsSinceLastLegendary).toBe(0);
    });

    it('all cards have obtainedAt timestamp', () => {
      const before = Date.now();
      const result = drawCards(basicPack, 5, defaultPlayer, []);
      const after = Date.now();
      for (const card of result.cards) {
        expect(card.obtainedAt).toBeGreaterThanOrEqual(before);
        expect(card.obtainedAt).toBeLessThanOrEqual(after);
      }
    });
  });
});
