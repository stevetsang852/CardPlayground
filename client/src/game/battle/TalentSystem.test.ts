// TalentSystem.test.ts — Unit tests for TalentSystem
// Requirements: 17.4, 17.7

import { TalentSystem, TALENT_POOL } from './TalentSystem';
import type { BattleState, GridCell } from './BattleTypes';

function makeEmptyState(): BattleState {
  return {
    mode: 'daily_challenge',
    wave: 1,
    playerHp: 20,
    sp: 10,
    grid: [],
    enemies: [],
    deck: { cards: [] },
    activeBonuses: [],
    rewards: [],
    coins: 0,
  };
}

function makeStateWithGuardian(attackSpeed: number): BattleState {
  const cell: GridCell = {
    x: 0,
    y: 0,
    guardian: {
      id: 'g1',
      cardId: 'card1',
      level: 1,
      rarity: 'common',
      element: 'fire',
      attack: 10,
      hp: 100,
      maxHp: 100,
      range: 2,
      attackSpeed,
      skillType: 'single',
      gridX: 0,
      gridY: 0,
    },
  };
  return { ...makeEmptyState(), grid: [[cell]] };
}

describe('TalentSystem', () => {
  const system = new TalentSystem();

  // ─── drawTalents ───────────────────────────────────────────────────────────

  it('drawTalents returns exactly count talents', () => {
    const result = system.drawTalents(3);
    expect(result).toHaveLength(3);
  });

  it('drawTalents returns unique talents (no duplicates)', () => {
    const result = system.drawTalents(5);
    const ids = result.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('drawTalents returns 1 talent when count is 1', () => {
    const result = system.drawTalents(1);
    expect(result).toHaveLength(1);
    expect(TALENT_POOL.map((t) => t.id)).toContain(result[0].id);
  });

  it('drawTalents does not exceed pool size', () => {
    const result = system.drawTalents(TALENT_POOL.length + 10);
    expect(result).toHaveLength(TALENT_POOL.length);
  });

  // ─── applyTalent: sp_bonus ─────────────────────────────────────────────────

  it('applyTalent sp_bonus adds 20 SP', () => {
    const state = makeEmptyState();
    state.sp = 10;
    const talent = TALENT_POOL.find((t) => t.type === 'sp_bonus')!;
    const result = system.applyTalent(talent, state);
    expect(result.sp).toBe(30);
  });

  // ─── applyTalent: attack_speed ─────────────────────────────────────────────

  it('applyTalent attack_speed reduces guardian attackSpeed by 10%', () => {
    const state = makeStateWithGuardian(1000);
    const talent = TALENT_POOL.find((t) => t.type === 'attack_speed')!;
    const result = system.applyTalent(talent, state);
    const guardian = result.grid[0][0].guardian!;
    expect(guardian.attackSpeed).toBeCloseTo(900, 5);
  });

  // ─── applyTalent: first_wave_reduction ────────────────────────────────────

  it('applyTalent first_wave_reduction sets firstWaveReduction', () => {
    const state = makeEmptyState();
    const talent = TALENT_POOL.find((t) => t.type === 'first_wave_reduction')!;
    const result = system.applyTalent(talent, state);
    expect(result.firstWaveReduction).toBe(0.3);
  });

  // ─── applyTalent: synthesis_luck ──────────────────────────────────────────

  it('applyTalent synthesis_luck sets synthesisLuckChance', () => {
    const state = makeEmptyState();
    const talent = TALENT_POOL.find((t) => t.type === 'synthesis_luck')!;
    const result = system.applyTalent(talent, state);
    expect(result.synthesisLuckChance).toBe(0.2);
  });

  // ─── applyTalent: coin_harvest ────────────────────────────────────────────

  it('applyTalent coin_harvest sets coinHarvestBonus', () => {
    const state = makeEmptyState();
    const talent = TALENT_POOL.find((t) => t.type === 'coin_harvest')!;
    const result = system.applyTalent(talent, state);
    expect(result.coinHarvestBonus).toBe(5);
  });
});
