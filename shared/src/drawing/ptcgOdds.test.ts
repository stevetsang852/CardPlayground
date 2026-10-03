import { JP_HIT_AS_APP_RARITY, JP_HIT_SLOT, rollJpHitSlot } from './ptcgOdds';

describe('ptcgOdds', () => {
  it('keeps hit-slot rates adding to less than 1 so R can fill the rest', () => {
    const hits = JP_HIT_SLOT.ur + JP_HIT_SLOT.sar + JP_HIT_SLOT.sr + JP_HIT_SLOT.ar + JP_HIT_SLOT.rr;
    expect(hits).toBeLessThan(1);
    expect(JP_HIT_AS_APP_RARITY.legendary).toBeCloseTo(0.01, 3);
  });

  it('rolls UR at the bottom of the range', () => {
    expect(rollJpHitSlot(0)).toBe('ur');
    expect(rollJpHitSlot(0.99)).toBe('r');
  });
});
