// GuardianFactory.ts — creates Guardian instances with rarity-based stats,
// level bonuses, and series→element mapping.

import type { Guardian, Rarity, Element, SkillType } from './BattleTypes';

// Base stats per rarity (Requirements 3.1–3.5)
const BASE_STATS: Record<Rarity, { attack: number; hp: number; range: number; attackSpeed: number; skillType: SkillType }> = {
  common:    { attack: 10, hp: 100, range: 2, attackSpeed: 1000, skillType: 'single' },
  rare:      { attack: 18, hp: 160, range: 3, attackSpeed: 900,  skillType: 'aoe' },
  epic:      { attack: 28, hp: 240, range: 3, attackSpeed: 800,  skillType: 'summon' },
  legendary: { attack: 45, hp: 380, range: 4, attackSpeed: 700,  skillType: 'special' },
  mythic:    { attack: 80, hp: 600, range: 5, attackSpeed: 600,  skillType: 'ultimate' },
};

// Series → Element mapping (Requirements 8.4)
// Supports both Chinese and English series names
const SERIES_ELEMENT_MAP: Record<string, Element> = {
  // Chinese names (legacy)
  '原始火山': 'fire',
  '寒冰紀元': 'ice',
  '神秘森林': 'nature',
  '光明聖域': 'light',
  '暗影深淵': 'shadow',
  // English names (cardData.ts)
  'Volcanic Origins': 'fire',
  'Frozen Age': 'ice',
  'Mystic Forest': 'nature',
  'Sacred Light': 'light',
  'Shadow Abyss': 'shadow',
  'Beyond': 'shadow',
};

/**
 * Returns true if the skillType is an attack type (single, aoe, special, ultimate).
 * Attack-type guardians have no range limit (Infinity). Requirement 15.1, 15.2, 15.4
 */
export function isAttackType(skillType: SkillType): boolean {
  return ['single', 'aoe', 'special', 'ultimate'].includes(skillType);
}

/**
 * Returns base stats for a given rarity. Falls back to common if unknown.
 */
export function getBaseStats(rarity: Rarity): { attack: number; hp: number; range: number; attackSpeed: number; skillType: SkillType } {
  return BASE_STATS[rarity] ?? BASE_STATS['common'];
}

/**
 * Maps a series name to its element. Defaults to 'fire' for unknown series.
 */
export function getElementFromSeries(series: string): Element {
  return SERIES_ELEMENT_MAP[series] ?? 'fire';
}

/**
 * Calculates attack at a given level.
 * attack(level) = baseAttack × (1 + 0.5 × (level - 1))
 * Requirement 4.4
 */
export function calculateAttack(baseAttack: number, level: number): number {
  return baseAttack * (1 + 0.5 * (level - 1));
}

/**
 * Calculates hp at a given level.
 * hp(level) = baseHp × (1 + 0.5 × (level - 1))
 * Requirement 4.4
 */
export function calculateHp(baseHp: number, level: number): number {
  return baseHp * (1 + 0.5 * (level - 1));
}

/**
 * Creates a Guardian from a card ID, rarity, series, level, and grid position.
 * Requirements 3.1–3.7, 4.4, 8.4
 */
export function createGuardian(
  cardId: string,
  rarity: Rarity,
  series: string,
  level: number,
  gridX: number,
  gridY: number,
): Guardian {
  const base = getBaseStats(rarity);
  const attack = calculateAttack(base.attack, level);
  const hp = calculateHp(base.hp, level);
  const element = getElementFromSeries(series);
  const range = isAttackType(base.skillType) ? Infinity : base.range;

  return {
    id: `${cardId}-${gridX}-${gridY}`,
    cardId,
    level,
    rarity,
    element,
    attack,
    hp,
    maxHp: hp,
    range,
    attackSpeed: base.attackSpeed,
    skillType: base.skillType,
    mythicUsed: rarity === 'mythic' ? false : undefined,
    gridX,
    gridY,
  };
}
