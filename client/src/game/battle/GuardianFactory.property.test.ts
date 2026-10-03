/**
 * Property-based tests for GuardianFactory
 *
 * **Validates: Requirements 4.4, 3.1–3.5, 15.1**
 */
import * as fc from 'fast-check';
import { calculateAttack, calculateHp, getBaseStats, createGuardian, isAttackType } from './GuardianFactory';
import type { Rarity, SkillType } from './BattleTypes';

const ALL_RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

const rarityArb = fc.constantFrom(...ALL_RARITIES);

// Levels 1–5 as per Guardian type definition
const levelArb = fc.integer({ min: 1, max: 5 });

// Attack-type skill types (Requirement 15.1)
const ATTACK_SKILL_TYPES: SkillType[] = ['single', 'aoe', 'special', 'ultimate'];
// Support-type skill types (Requirement 15.2)
const SUPPORT_SKILL_TYPES: SkillType[] = ['slow', 'summon', 'sp_regen'];

// Rarities whose default skillType is attack-type
const ATTACK_RARITIES: Rarity[] = ['common', 'rare', 'legendary', 'mythic'];
// Rarities whose default skillType is support-type
const SUPPORT_RARITIES: Rarity[] = ['epic'];

describe('GuardianFactory property tests', () => {
  /**
   * Property 3: Level scaling is strictly monotonically increasing
   * For any rarity and level N (1–4), stats at level N+1 must be strictly
   * greater than stats at level N.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 3: level N+1 stats are strictly greater than level N stats', () => {
    fc.assert(
      fc.property(
        rarityArb,
        fc.integer({ min: 1, max: 4 }), // N, so N+1 is at most 5
        (rarity, level) => {
          const base = getBaseStats(rarity);

          const attackAtN = calculateAttack(base.attack, level);
          const attackAtN1 = calculateAttack(base.attack, level + 1);

          const hpAtN = calculateHp(base.hp, level);
          const hpAtN1 = calculateHp(base.hp, level + 1);

          expect(attackAtN1).toBeGreaterThan(attackAtN);
          expect(hpAtN1).toBeGreaterThan(hpAtN);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 4: All rarities have attack > 0 and hp > 0 at every valid level
   *
   * **Validates: Requirements 3.1–3.5**
   */
  it('Property 4: all rarities have attack > 0 and hp > 0 at every level', () => {
    fc.assert(
      fc.property(rarityArb, levelArb, (rarity, level) => {
        const base = getBaseStats(rarity);

        const attack = calculateAttack(base.attack, level);
        const hp = calculateHp(base.hp, level);

        expect(attack).toBeGreaterThan(0);
        expect(hp).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property 16a: Attack-type guardians always have range === Infinity
   * For all attack-type rarities (common/rare/legendary/mythic), the created
   * guardian's range must be Infinity regardless of level or position.
   *
   * **Validates: Requirement 15.1**
   */
  it('Property 16a: attack-type guardians (single/aoe/special/ultimate) have range === Infinity', () => {
    const attackRarityArb = fc.constantFrom(...ATTACK_RARITIES);
    fc.assert(
      fc.property(
        attackRarityArb,
        levelArb,
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 2 }),
        (rarity, level, gridX, gridY) => {
          const guardian = createGuardian('card-test', rarity, '原始火山', level, gridX, gridY);
          expect(guardian.range).toBe(Infinity);
          expect(isAttackType(guardian.skillType)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 16b: Support-type guardians always have finite range
   * For all support-type rarities (epic), the created guardian's range must
   * be finite (not Infinity).
   *
   * **Validates: Requirement 15.2**
   */
  it('Property 16b: support-type guardians (slow/summon/sp_regen) have finite range', () => {
    const supportRarityArb = fc.constantFrom(...SUPPORT_RARITIES);
    fc.assert(
      fc.property(
        supportRarityArb,
        levelArb,
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 2 }),
        (rarity, level, gridX, gridY) => {
          const guardian = createGuardian('card-test', rarity, '原始火山', level, gridX, gridY);
          expect(isFinite(guardian.range)).toBe(true);
          expect(isAttackType(guardian.skillType)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 16c: isAttackType correctly classifies all skill types
   *
   * **Validates: Requirement 15.1**
   */
  it('Property 16c: isAttackType returns true for attack types and false for support types', () => {
    const attackSkillArb = fc.constantFrom(...ATTACK_SKILL_TYPES);
    const supportSkillArb = fc.constantFrom(...SUPPORT_SKILL_TYPES);

    fc.assert(
      fc.property(attackSkillArb, (skillType) => {
        expect(isAttackType(skillType)).toBe(true);
      }),
      { numRuns: 100 }
    );

    fc.assert(
      fc.property(supportSkillArb, (skillType) => {
        expect(isAttackType(skillType)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
