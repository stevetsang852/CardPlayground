import {
  getBaseStats,
  getElementFromSeries,
  calculateAttack,
  calculateHp,
  createGuardian,
} from './GuardianFactory';
import type { Rarity } from './BattleTypes';

// Requirements 3.1–3.5: correct base stats per rarity
describe('getBaseStats', () => {
  it('common: attack=10, hp=100, range=2, attackSpeed=1000, skillType=single', () => {
    const s = getBaseStats('common');
    expect(s).toEqual({ attack: 10, hp: 100, range: 2, attackSpeed: 1000, skillType: 'single' });
  });

  it('rare: attack=18, hp=160, range=3, attackSpeed=900, skillType=aoe', () => {
    const s = getBaseStats('rare');
    expect(s).toEqual({ attack: 18, hp: 160, range: 3, attackSpeed: 900, skillType: 'aoe' });
  });

  it('epic: attack=28, hp=240, range=3, attackSpeed=800, skillType=summon', () => {
    const s = getBaseStats('epic');
    expect(s).toEqual({ attack: 28, hp: 240, range: 3, attackSpeed: 800, skillType: 'summon' });
  });

  it('legendary: attack=45, hp=380, range=4, attackSpeed=700, skillType=special', () => {
    const s = getBaseStats('legendary');
    expect(s).toEqual({ attack: 45, hp: 380, range: 4, attackSpeed: 700, skillType: 'special' });
  });

  it('mythic: attack=80, hp=600, range=5, attackSpeed=600, skillType=ultimate', () => {
    const s = getBaseStats('mythic');
    expect(s).toEqual({ attack: 80, hp: 600, range: 5, attackSpeed: 600, skillType: 'ultimate' });
  });
});

// Requirement 4.4: level bonus formula — stat(level) = base × (1 + 0.5 × (level - 1))
describe('calculateAttack / calculateHp level bonus', () => {
  const base = 100;

  it('level 1 = base × 1.0', () => {
    expect(calculateAttack(base, 1)).toBe(100);
    expect(calculateHp(base, 1)).toBe(100);
  });

  it('level 2 = base × 1.5', () => {
    expect(calculateAttack(base, 2)).toBe(150);
    expect(calculateHp(base, 2)).toBe(150);
  });

  it('level 3 = base × 2.0', () => {
    expect(calculateAttack(base, 3)).toBe(200);
    expect(calculateHp(base, 3)).toBe(200);
  });

  it('level 5 = base × 3.0', () => {
    expect(calculateAttack(base, 5)).toBe(300);
    expect(calculateHp(base, 5)).toBe(300);
  });
});

// Requirements 3.7, 8.4: series → element mapping
describe('getElementFromSeries', () => {
  it('原始火山 → fire', () => expect(getElementFromSeries('原始火山')).toBe('fire'));
  it('寒冰紀元 → ice',  () => expect(getElementFromSeries('寒冰紀元')).toBe('ice'));
  it('神秘森林 → nature', () => expect(getElementFromSeries('神秘森林')).toBe('nature'));
  it('光明聖域 → light', () => expect(getElementFromSeries('光明聖域')).toBe('light'));
  it('暗影深淵 → shadow', () => expect(getElementFromSeries('暗影深淵')).toBe('shadow'));
  it('unknown series defaults to fire', () => expect(getElementFromSeries('未知系列')).toBe('fire'));
});

// Requirements 3.1–3.7, 4.4: createGuardian produces a valid Guardian
describe('createGuardian', () => {
  it('produces correct id, cardId, level, gridX, gridY', () => {
    const g = createGuardian('card-001', 'common', '原始火山', 1, 2, 3);
    expect(g.id).toBe('card-001-2-3');
    expect(g.cardId).toBe('card-001');
    expect(g.level).toBe(1);
    expect(g.gridX).toBe(2);
    expect(g.gridY).toBe(3);
  });

  it('sets rarity and element correctly', () => {
    const g = createGuardian('card-002', 'rare', '寒冰紀元', 1, 0, 0);
    expect(g.rarity).toBe('rare');
    expect(g.element).toBe('ice');
  });

  it('applies level bonus to attack and hp (level 2)', () => {
    const g = createGuardian('card-003', 'common', '原始火山', 2, 0, 0);
    // base attack=10, level 2 → 10 × 1.5 = 15
    expect(g.attack).toBe(15);
    // base hp=100, level 2 → 100 × 1.5 = 150
    expect(g.hp).toBe(150);
    expect(g.maxHp).toBe(150);
  });

  it('attackSpeed comes from base stats (not scaled by level)', () => {
    const g = createGuardian('card-004', 'legendary', '光明聖域', 3, 1, 1);
    expect(g.attackSpeed).toBe(700);
  });

  // Requirements 15.1, 15.4: attack-type guardians have range === Infinity
  it('common (single) → range === Infinity', () => {
    const g = createGuardian('card-r1', 'common', '原始火山', 1, 0, 0);
    expect(g.range).toBe(Infinity);
  });

  it('rare (aoe) → range === Infinity', () => {
    const g = createGuardian('card-r2', 'rare', '原始火山', 1, 0, 0);
    expect(g.range).toBe(Infinity);
  });

  it('epic (summon) → range is finite (support type)', () => {
    const g = createGuardian('card-r3', 'epic', '原始火山', 1, 0, 0);
    expect(isFinite(g.range)).toBe(true);
  });

  it('legendary (special) → range === Infinity', () => {
    const g = createGuardian('card-r4', 'legendary', '光明聖域', 1, 0, 0);
    expect(g.range).toBe(Infinity);
  });

  it('mythic (ultimate) → range === Infinity', () => {
    const g = createGuardian('card-r5', 'mythic', '暗影深淵', 1, 0, 0);
    expect(g.range).toBe(Infinity);
  });

  it('skillType matches rarity', () => {
    const cases: [Rarity, string][] = [
      ['common', 'single'],
      ['rare', 'aoe'],
      ['epic', 'summon'],
      ['legendary', 'special'],
      ['mythic', 'ultimate'],
    ];
    for (const [rarity, expected] of cases) {
      const g = createGuardian('c', rarity, '原始火山', 1, 0, 0);
      expect(g.skillType).toBe(expected);
    }
  });

  // Requirement 3.5–3.6: mythicUsed flag
  it('mythicUsed is false for mythic guardian', () => {
    const g = createGuardian('card-m', 'mythic', '暗影深淵', 1, 0, 0);
    expect(g.mythicUsed).toBe(false);
  });

  it('mythicUsed is undefined for non-mythic guardians', () => {
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as Rarity[]) {
      const g = createGuardian('c', rarity, '原始火山', 1, 0, 0);
      expect(g.mythicUsed).toBeUndefined();
    }
  });

  it('hp equals maxHp on creation', () => {
    const g = createGuardian('card-005', 'epic', '神秘森林', 3, 0, 0);
    expect(g.hp).toBe(g.maxHp);
  });
});
