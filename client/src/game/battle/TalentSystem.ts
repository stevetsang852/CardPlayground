// TalentSystem.ts — Roguelike talent pool, draw, and apply logic
// Requirements: 17.1, 17.3, 17.4, 17.5

import type { Talent, BattleState } from './BattleTypes';

export const TALENT_POOL: Talent[] = [
  {
    id: 'sp_bonus',
    name: '初始 SP 加成',
    type: 'sp_bonus',
    value: 20,
    description: '戰鬥開始時額外獲得 20 點 SP',
  },
  {
    id: 'attack_speed',
    name: '攻速強化',
    type: 'attack_speed',
    value: 0.1,
    description: '所有 Guardian 攻擊速度提升 10%',
  },
  {
    id: 'first_wave_reduction',
    name: '首波減員',
    type: 'first_wave_reduction',
    value: 0.3,
    description: '第一波敵人數量減少 30%',
  },
  {
    id: 'synthesis_luck',
    name: '合成幸運',
    type: 'synthesis_luck',
    value: 0.2,
    description: '合成時有 20% 機率保留原守衛種類',
  },
  {
    id: 'coin_harvest',
    name: '金幣豐收',
    type: 'coin_harvest',
    value: 5,
    description: '每波結束後額外獲得 wave × 5 金幣',
  },
];

export class TalentSystem {
  /**
   * Randomly draw `count` unique talents from TALENT_POOL.
   * count must be <= TALENT_POOL.length.
   */
  drawTalents(count: number): Talent[] {
    const pool = [...TALENT_POOL];
    const result: Talent[] = [];
    const drawCount = Math.min(count, pool.length);

    for (let i = 0; i < drawCount; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      result.push(pool[idx]);
      pool.splice(idx, 1);
    }

    return result;
  }

  /**
   * Apply a talent's effect to the battle state and return the updated state.
   */
  applyTalent(talent: Talent, state: BattleState): BattleState {
    switch (talent.type) {
      case 'sp_bonus':
        state.sp += talent.value;
        break;

      case 'attack_speed':
        for (const row of state.grid) {
          for (const cell of row) {
            if (cell.guardian) {
              cell.guardian.attackSpeed *= (1 - talent.value);
            }
          }
        }
        break;

      case 'first_wave_reduction':
        state.firstWaveReduction = talent.value;
        break;

      case 'synthesis_luck':
        state.synthesisLuckChance = talent.value;
        break;

      case 'coin_harvest':
        state.coinHarvestBonus = talent.value;
        break;
    }

    return state;
  }
}
