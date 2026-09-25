export const JP_BOX_PACKS = 30;
export const JP_HIT_SLOT = {
  ur: 1 / (10 * JP_BOX_PACKS),
  sar: 1 / (5 * JP_BOX_PACKS),
  sr: 1 / JP_BOX_PACKS,
  ar: 3 / JP_BOX_PACKS,
  rr: 4 / JP_BOX_PACKS,
} as const;

export type HitKind = 'ur' | 'sar' | 'sr' | 'ar' | 'rr' | 'r';
export type AppRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export function rollJpHitSlot(roll: number): HitKind {
  let cursor = 0;
  const steps: Array<[HitKind, number]> = [
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

export function hitKindToAppRarity(kind: HitKind): AppRarity {
  if (kind === 'ur' || kind === 'sar') return 'legendary';
  if (kind === 'sr' || kind === 'ar' || kind === 'rr') return 'epic';
  return 'rare';
}
