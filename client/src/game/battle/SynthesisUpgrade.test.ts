// SynthesisUpgrade.test.ts
// Requirements: 4.2, 4.3

import { BattleEngine } from './BattleEngine';
import { createGuardian } from './GuardianFactory';
import type { Deck, Rarity } from './BattleTypes';

const TEST_DECK: Deck = { cards: ['c1', 'c2', 'c3', 'c4', 'c5'] };

function makeEngine(galleryScore = 200): BattleEngine {
  // galleryScore=200 → initialSP = 10 + 2*10 = 30
  return new BattleEngine('endless', TEST_DECK, galleryScore);
}

// ─── Helper: place a guardian directly into a grid cell ───────────────────
function placeGuardian(
  engine: BattleEngine,
  cardId: string,
  rarity: Rarity,
  level: number,
  gridX: number,
  gridY: number,
): void {
  const guardian = createGuardian(cardId, rarity, '原始火山', level, gridX, gridY);
  engine.state.grid[gridY][gridX].guardian = guardian;
}

// ─── 1. Level increases by 1 after synthesis (Requirement 4.2) ────────────
describe('Synthesis: level after upgrade', () => {
  it('resulting guardian has level = original level + 1', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 1, 1, 0);

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.success).toBe(true);
    expect(engine.state.grid[0][0].guardian?.level).toBe(2);
  });

  it('level 2 guardians synthesize to level 3', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-b', 'rare', 2, 0, 0);
    placeGuardian(engine, 'card-b', 'rare', 2, 0, 1);

    const result = engine.synthesize(0, 0, 0, 1);

    expect(result.success).toBe(true);
    expect(engine.state.grid[0][0].guardian?.level).toBe(3);
  });

  it('second cell is cleared after synthesis', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 1, 1, 0);

    engine.synthesize(0, 0, 1, 0);

    expect(engine.state.grid[0][1].guardian).toBeNull();
  });
});

// ─── 2. SP is correctly deducted during synthesis (Requirement 4.2) ────────
describe('Synthesis: SP cost', () => {
  it('deducts SP equal to the summon cost of the guardian rarity', () => {
    const engine = makeEngine(); // SP = 30
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 1, 1, 0);

    const spBefore = engine.state.sp;
    const cost = engine.getSummonCost('common'); // 2

    engine.synthesize(0, 0, 1, 0);

    expect(engine.state.sp).toBe(spBefore - cost);
  });

  it('deducts correct SP for rare rarity (cost = 3)', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-r', 'rare', 1, 0, 0);
    placeGuardian(engine, 'card-r', 'rare', 1, 1, 0);

    const spBefore = engine.state.sp;
    engine.synthesize(0, 0, 1, 0);

    expect(engine.state.sp).toBe(spBefore - 3);
  });

  it('fails synthesis when SP is insufficient', () => {
    const engine = makeEngine(0); // SP = 10
    engine.state.sp = 0; // force SP to 0

    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 1, 1, 0);

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.success).toBe(false);
    expect(result.message).toContain('SP');
  });

  it('does not deduct SP when synthesis fails', () => {
    const engine = makeEngine(0);
    engine.state.sp = 0;

    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 1, 1, 0);

    const spBefore = engine.state.sp;
    engine.synthesize(0, 0, 1, 0);

    expect(engine.state.sp).toBe(spBefore);
  });
});

// ─── 3. Max level cap: reject synthesis at level 5 (Requirement 4.3) ───────
describe('Synthesis: max level cap', () => {
  it('rejects synthesis when guardian is already at level 5', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 5, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 5, 1, 0);

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.success).toBe(false);
  });

  it('returns appropriate error message when at max level', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 5, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 5, 1, 0);

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.message).toBe('已達最高等級');
  });

  it('allows synthesis at level 4 (resulting in level 5)', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 4, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 4, 1, 0);

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.success).toBe(true);
    expect(engine.state.grid[0][0].guardian?.level).toBe(5);
  });
});

// ─── 4. Adjacent same-card same-level guardians can be synthesized ──────────
describe('Synthesis: adjacency requirement', () => {
  it('synthesizes two horizontally adjacent same-card same-level guardians', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-x', 'epic', 2, 3, 1);
    placeGuardian(engine, 'card-x', 'epic', 2, 4, 1);

    const result = engine.synthesize(3, 1, 4, 1);

    expect(result.success).toBe(true);
  });

  it('synthesizes two vertically adjacent same-card same-level guardians', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-y', 'rare', 1, 2, 0);
    placeGuardian(engine, 'card-y', 'rare', 1, 2, 1);

    const result = engine.synthesize(2, 0, 2, 1);

    expect(result.success).toBe(true);
  });
});

// ─── 5. Non-adjacent or different-card guardians cannot be synthesized ──────
describe('Synthesis: rejection cases', () => {
  it('rejects synthesis of non-adjacent guardians', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 1, 2, 0); // gap of 2

    const result = engine.synthesize(0, 0, 2, 0);

    expect(result.success).toBe(false);
    expect(result.message).toBe('守衛不相鄰');
  });

  it('rejects synthesis of different-card guardians', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-b', 'common', 1, 1, 0);

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.success).toBe(false);
    expect(result.message).toBe('守衛卡牌不同');
  });

  it('rejects synthesis of same-card but different-level guardians', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 2, 1, 0);

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.success).toBe(false);
    expect(result.message).toBe('守衛等級不同');
  });

  it('rejects synthesis when a cell has no guardian', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    // cell (1, 0) is empty

    const result = engine.synthesize(0, 0, 1, 0);

    expect(result.success).toBe(false);
    expect(result.message).toBe('格子沒有守衛');
  });

  it('rejects diagonal adjacency (not up/down/left/right)', () => {
    const engine = makeEngine();
    placeGuardian(engine, 'card-a', 'common', 1, 0, 0);
    placeGuardian(engine, 'card-a', 'common', 1, 1, 1); // diagonal

    const result = engine.synthesize(0, 0, 1, 1);

    expect(result.success).toBe(false);
    expect(result.message).toBe('守衛不相鄰');
  });
});
