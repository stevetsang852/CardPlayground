/**
 * Approximate Japanese SV-era expansion pack model.
 * 5 cards / pack, ~30 packs / box.
 * Rates are community observations (not an official TPC PDF).
 *
 * Hit slot (5th card) per pack:
 *   UR   ~ 1 / 10 boxes = 1/300 packs = 0.333%
 *   SAR  ~ 1 / 5 boxes  = 1/150 packs = 0.667%
 *   SR   ~ 1 / box      = 1/30        = 3.33%
 *   AR   ~ 3 / box                    = 10.0%
 *   RR   ~ 4 / box                    = 13.33%
 *   R    remainder of hit slot        = 72.34%
 */
export const JP_BOX_PACKS = 30;

export const JP_HIT_SLOT = {
  ur: 1 / (10 * JP_BOX_PACKS),
  sar: 1 / (5 * JP_BOX_PACKS),
  sr: 1 / JP_BOX_PACKS,
  ar: 3 / JP_BOX_PACKS,
  rr: 4 / JP_BOX_PACKS,
} as const;

export type PtcgHitKind = 'ur' | 'sar' | 'sr' | 'ar' | 'rr' | 'r';

export function rollJpHitSlot(roll: number): PtcgHitKind {
  let cursor = 0;
  const steps: Array<[PtcgHitKind, number]> = [
    ['ur', JP_HIT_SLOT.ur],
    ['sar', JP_HIT_SLOT.sar],
    ['sr', JP_HIT_SLOT.sr],
    ['ar', JP_HIT_SLOT.ar],
    ['rr', JP_HIT_SLOT.rr],
  ];
  for (const [kind, p] of steps) {
    cursor += p;
    if (roll < cursor) return kind;
  }
  return 'r';
}

export function hitKindToAppRarity(kind: PtcgHitKind): 'common' | 'rare' | 'epic' | 'legendary' {
  if (kind === 'ur' || kind === 'sar') return 'legendary';
  if (kind === 'sr' || kind === 'ar' || kind === 'rr') return 'epic';
  return 'rare';
}

/** Single-card gacha mapping of the hit slot (for /cards/draw quantity=1). */
export const JP_HIT_AS_APP_RARITY = {
  legendary: JP_HIT_SLOT.ur + JP_HIT_SLOT.sar,
  epic: JP_HIT_SLOT.sr + JP_HIT_SLOT.ar + JP_HIT_SLOT.rr,
  rare: 1 - (JP_HIT_SLOT.ur + JP_HIT_SLOT.sar + JP_HIT_SLOT.sr + JP_HIT_SLOT.ar + JP_HIT_SLOT.rr),
  common: 0,
};
