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
  it('opens the official 6-card M6a booster', () => {
    const booster = PACK_CONFIGS[0]!;
    expect(booster.id).toBe('m6a');
    expect(booster.setCode).toBe('M6a');
    expect(booster.name).toContain('30th CELEBRATION');
    expect(booster.imageUrl).toBe('/packs/m6a.webp');
    expect(booster.cost).toBe(25);
    const result = drawCards(booster, 1, player(), []);
    expect(result.packs).toHaveLength(1);
    expect(result.cards).toHaveLength(6);
    expect(result.packs[0]!.cards).toHaveLength(6);
  });

  it('opens every booster inside a multi-pack product', () => {
    const partners = PACK_CONFIGS.find((pack) => pack.id === 'm6a-first-partners')!;
    expect(partners.imageUrl).toBe('/packs/m6a-first-partners.webp');
    expect(partners.packsIncluded).toBe(4);
    const result = drawCards(partners, 1, player(), []);
    expect(result.packs).toHaveLength(4);
    expect(result.cards).toHaveLength(24);
    expect(result.updatedPlayer.softCurrency).toBe(100000 - 135);
  });

  it('opens 60 cards for ten M6a boosters', () => {
    const result = drawCards(PACK_CONFIGS[0]!, 10, player(), []);
    expect(result.packs).toHaveLength(10);
    expect(result.cards).toHaveLength(60);
  });

  it('deducts pack cost and tags foil on the hit card', () => {
    const p = player();
    const result = drawCards(PACK_CONFIGS[0]!, 1, p, []);
    expect(result.updatedPlayer.softCurrency).toBe(p.softCurrency - 25);
    const hit = result.packs[0]!.cards[5];
    expect(hit?.foil).toBeTruthy();
  });

  it('forces SAR foil when pity is ready', () => {
    const p = player();
    p.drawsSinceLastLegendary = PACK_CONFIGS[0]!.pityLegendaryAt;
    const result = drawCards(PACK_CONFIGS[0]!, 1, p, []);
    expect(result.packs[0]!.hitKind).toBe('sar');
    expect(result.packs[0]!.cards[5]!.foil).toContain('cosmos');
  });
});
