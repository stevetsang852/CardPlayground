import type { Rarity } from '../cardData';

/** Upstream simeydotme/pokemon-cards-css data-rarity values */
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
