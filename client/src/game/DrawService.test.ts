import { drawCards, PACK_CONFIGS } from './DrawService';
import type { PlayerState } from '../store/gameStore';

const player = (): PlayerState =>
  ({
    softCurrency: 100000,
    hardCurrency: 0,
    luckValue: 0,
    totalDraws: 0,
    drawsSinceLastLegendary: 0,
    drawsSinceLastMythic: 0,
  } as PlayerState);

describe('frontend DrawService', () => {
  it('opens 5 cards per pack', () => {
    const result = drawCards(PACK_CONFIGS[0]!, 1, player(), []);
    expect(result.packs).toHaveLength(1);
    expect(result.cards).toHaveLength(5);
    expect(result.packs[0]!.cards).toHaveLength(5);
  });

  it('opens 50 cards for a 10-pack pull', () => {
    const result = drawCards(PACK_CONFIGS[0]!, 10, player(), []);
    expect(result.packs).toHaveLength(10);
    expect(result.cards).toHaveLength(50);
  });

  it('deducts pack cost and tags foil on the hit card', () => {
    const p = player();
    const result = drawCards(PACK_CONFIGS[0]!, 1, p, []);
    expect(result.updatedPlayer.softCurrency).toBe(p.softCurrency - 100);
    const hit = result.packs[0]!.cards[4];
    expect(hit?.foil).toBeTruthy();
  });

  it('forces SAR foil when pity is ready', () => {
    const p = player();
    p.drawsSinceLastLegendary = PACK_CONFIGS[0]!.pityLegendaryAt;
    const result = drawCards(PACK_CONFIGS[0]!, 1, p, []);
    expect(result.packs[0]!.hitKind).toBe('sar');
    expect(result.packs[0]!.cards[4]!.foil).toContain('cosmos');
  });
});
