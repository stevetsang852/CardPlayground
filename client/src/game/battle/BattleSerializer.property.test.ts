/**
 * Property-based tests for BattleSerializer
 *
 * **Validates: Requirements 12.5, 12.3**
 */
import * as fc from 'fast-check';
import { BattleSerializer } from './BattleSerializer';
import type {
  BattleState,
  BattleMode,
  GridCell,
  Enemy,
  Deck,
  SeriesBonus,
  BattleReward,
} from './BattleTypes';

const battleModeArb = fc.constantFrom<BattleMode>(
  'daily_challenge',
  'endless',
  'boss_rush'
);

const gridCellArb: fc.Arbitrary<GridCell> = fc.record({
  x: fc.integer({ min: 0, max: 9 }),
  y: fc.integer({ min: 0, max: 9 }),
  guardian: fc.constant(null),
});

const enemyArb: fc.Arbitrary<Enemy> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 16 }),
  hp: fc.integer({ min: 1, max: 1000 }),
  maxHp: fc.integer({ min: 1, max: 1000 }),
  speed: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
  reward: fc.integer({ min: 0, max: 100 }),
  gridX: fc.integer({ min: 0, max: 9 }),
  gridY: fc.integer({ min: 0, max: 9 }),
  isBoss: fc.boolean(),
  pathProgress: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
});

const deckArb: fc.Arbitrary<Deck> = fc.record({
  cards: fc.array(fc.string({ minLength: 1, maxLength: 8 }), {
    minLength: 5,
    maxLength: 8,
  }),
});

const seriesBonusArb: fc.Arbitrary<SeriesBonus> = fc.record({
  series: fc.string({ minLength: 1, maxLength: 16 }),
  attackBonus: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
});

const battleRewardArb: fc.Arbitrary<BattleReward> = fc.record({
  type: fc.constantFrom<'coin' | 'ticket' | 'material'>('coin', 'ticket', 'material'),
  amount: fc.integer({ min: 0, max: 9999 }),
  reason: fc.string({ minLength: 1, maxLength: 32 }),
});

const battleStateArb: fc.Arbitrary<BattleState> = fc.record({
  mode: battleModeArb,
  wave: fc.integer({ min: 1, max: 100 }),
  playerHp: fc.integer({ min: 0, max: 100 }),
  sp: fc.integer({ min: 0, max: 999 }),
  coins: fc.integer({ min: 0, max: 9999 }),
  grid: fc.array(fc.array(gridCellArb, { minLength: 0, maxLength: 10 }), {
    minLength: 0,
    maxLength: 10,
  }),
  enemies: fc.array(enemyArb, { minLength: 0, maxLength: 20 }),
  deck: deckArb,
  activeBonuses: fc.array(seriesBonusArb, { minLength: 0, maxLength: 5 }),
  rewards: fc.array(battleRewardArb, { minLength: 0, maxLength: 10 }),
});

/** Non-JSON strings: printable ASCII that is not valid JSON */
const malformedStringArb: fc.Arbitrary<string> = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
    try { JSON.parse(s); return false; } catch { return true; }
  }),
  fc.string({ minLength: 1, maxLength: 20 }).map((s) => `{${s}`),
  fc.constantFrom(
    'not json',
    'hello world',
    '{bad json}',
    '{"unclosed": ',
    '<xml>data</xml>',
    'undefined',
    'NaN',
    '...',
  )
);

describe('BattleSerializer property tests', () => {
  const serializer = new BattleSerializer();

  it('Property 12: round-trip deserialize(serialize(state)) ≡ state', () => {
    fc.assert(
      fc.property(battleStateArb, (state) => {
        const json = serializer.serialize(state);
        const result = serializer.deserialize(json);

        expect(result).not.toBeInstanceOf(Error);

        const restored = result as BattleState;

        expect(restored.mode).toBe(state.mode);
        expect(restored.wave).toBe(state.wave);
        expect(restored.playerHp).toBe(state.playerHp);
        expect(restored.sp).toBe(state.sp);
        expect(restored.coins).toBe(state.coins);
        expect(restored.enemies).toEqual(state.enemies);
        expect(restored.deck).toEqual(state.deck);
        expect(restored.activeBonuses).toEqual(state.activeBonuses);
        expect(restored.rewards).toEqual(state.rewards);
        expect(restored.grid).toEqual(state.grid);
      }),
      { numRuns: 200 }
    );
  });

  it('Property 13: malformed input returns Error and never throws', () => {
    fc.assert(
      fc.property(malformedStringArb, (badInput) => {
        let result: BattleState | Error | undefined;

        expect(() => {
          result = serializer.deserialize(badInput);
        }).not.toThrow();

        expect(result).toBeInstanceOf(Error);
      }),
      { numRuns: 300 }
    );
  });
});
