import { Card, CardRarity } from '../types/card';
import { JP_HIT_AS_APP_RARITY, JP_HIT_SLOT, hitKindToAppRarity, rollJpHitSlot } from './ptcgOdds';
import { openJpExpansionPack } from './PtcgPackOpener';

function stubCard(rarity: CardRarity, name: string): Card {
  return {
    id: name,
    templateId: name,
    name,
    description: name,
    rarity,
    theme: 'ptcg',
    imageUrl: '',
    score: 1,
    isLimitedEdition: false,
    obtainedAt: new Date().toISOString(),
    obtainedFrom: 'draw',
  };
}

function pool(): Map<CardRarity, Card[]> {
  return new Map([
    ['common', [stubCard('common', 'C1'), stubCard('common', 'C2')]],
    ['rare', [stubCard('rare', 'R1')]],
    ['epic', [stubCard('epic', 'E1')]],
    ['legendary', [stubCard('legendary', 'L1')]],
  ]);
}

describe('JP PTCG pack odds', () => {
  it('maps UR/SAR to legendary and RR/AR/SR to epic', () => {
    expect(hitKindToAppRarity('ur')).toBe('legendary');
    expect(hitKindToAppRarity('sar')).toBe('legendary');
    expect(hitKindToAppRarity('sr')).toBe('epic');
    expect(hitKindToAppRarity('ar')).toBe('epic');
    expect(hitKindToAppRarity('rr')).toBe('epic');
    expect(hitKindToAppRarity('r')).toBe('rare');
  });

  it('opens exactly 5 cards: 3 common-slot + 1 uncommon-slot + hit', () => {
    const opened = openJpExpansionPack(pool(), 42);
    expect(opened.cards).toHaveLength(5);
    expect(['ur', 'sar', 'sr', 'ar', 'rr', 'r']).toContain(opened.hitKind);
  });

  it('is deterministic for the same seed', () => {
    const a = openJpExpansionPack(pool(), 2026);
    const b = openJpExpansionPack(pool(), 2026);
    expect(a.hitKind).toBe(b.hitKind);
    expect(a.hitRarity).toBe(b.hitRarity);
  });

  it('matches published hit-slot rates within sampling error', () => {
    const n = 20000;
    const counts: Record<string, number> = { ur: 0, sar: 0, sr: 0, ar: 0, rr: 0, r: 0 };
    for (let i = 0; i < n; i++) {
      counts[rollJpHitSlot((i + 0.5) / n)] += 1;
    }
    const rate = (k: string) => counts[k] / n;
    expect(rate('ur')).toBeCloseTo(JP_HIT_SLOT.ur, 3);
    expect(rate('sar')).toBeCloseTo(JP_HIT_SLOT.sar, 3);
    expect(rate('sr')).toBeCloseTo(JP_HIT_SLOT.sr, 2);
    expect(rate('ar')).toBeCloseTo(JP_HIT_SLOT.ar, 2);
    expect(rate('rr')).toBeCloseTo(JP_HIT_SLOT.rr, 2);
    expect(rate('ur') + rate('sar')).toBeCloseTo(JP_HIT_AS_APP_RARITY.legendary, 3);
  });
});
