import type { Rarity } from '../cardData';

/**
 * Foil keys follow simeydotme/pokemon-cards-css data-rarity values.
 * Grades follow the Japanese SV / M6a pack language used by this app:
 *   C common, U uncommon, R rare, RR double rare (ex),
 *   AR illustration rare, SR ultra rare, SAR special illustration rare, UR hyper rare.
 * English Scarlet & Violet symbols for the same tiers: circle, diamond, star,
 * two stars, gold star (IR), two silver stars (UR), two gold stars (SIR), three gold stars (HR).
 */
export const FOIL_BY_HIT: Record<string, string> = {
  c: 'common',
  u: 'uncommon reverse holo',
  r: 'rare holo',
  rr: 'rare holo v',
  ar: 'trainer gallery rare holo',
  sr: 'rare rainbow',
  sar: 'rare holo cosmos',
  ur: 'rare secret',
};

export const GRADE_BY_HIT: Record<string, string> = {
  c: 'C',
  u: 'U',
  r: 'R',
  rr: 'RR',
  ar: 'AR',
  sr: 'SR',
  sar: 'SAR',
  ur: 'UR',
};

export const GRADE_BY_FOIL: Record<string, string> = {
  common: 'C',
  'uncommon reverse holo': 'U',
  'rare holo': 'R',
  'rare holo v': 'RR',
  'trainer gallery rare holo': 'AR',
  'rare rainbow': 'SR',
  'rare holo cosmos': 'SAR',
  'rare secret': 'UR',
};

export const GRADE_RANK: Record<string, number> = {
  C: 0, U: 1, R: 2, RR: 3, AR: 4, SR: 5, SAR: 6, UR: 7,
};

export const FOIL_BY_RARITY: Record<Rarity, string> = {
  common: 'common',
  rare: 'rare holo',
  epic: 'rare holo v',
  legendary: 'rare holo cosmos',
  mythic: 'rare secret',
};

export function foilForCard(hitKind?: string, rarity?: Rarity): string {
  if (hitKind && FOIL_BY_HIT[hitKind]) return FOIL_BY_HIT[hitKind];
  if (rarity && FOIL_BY_RARITY[rarity]) return FOIL_BY_RARITY[rarity];
  return 'common';
}

export function gradeForFoil(foil?: string): string {
  if (foil && GRADE_BY_FOIL[foil]) return GRADE_BY_FOIL[foil];
  return 'C';
}

export function gradeForHit(hitKind?: string): string {
  if (hitKind && GRADE_BY_HIT[hitKind]) return GRADE_BY_HIT[hitKind];
  return 'C';
}
