import { JP_HIT_AS_APP_RARITY, JP_HIT_SLOT } from '@shared/drawing/ptcgOdds';

describe('backend pack seed rates', () => {
  it('keeps legendary near 1% per pack (SAR+UR)', () => {
    expect(JP_HIT_AS_APP_RARITY.legendary).toBeGreaterThan(0.009);
    expect(JP_HIT_AS_APP_RARITY.legendary).toBeLessThan(0.012);
  });

  it('keeps RR around 4 per 30-pack box', () => {
    expect(JP_HIT_SLOT.rr * 30).toBeCloseTo(4, 5);
  });
});
