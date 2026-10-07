import { BattleSerializer } from './BattleSerializer';
import type { BattleState } from './BattleTypes';

const validState: BattleState = {
  mode: 'daily_challenge',
  wave: 1,
  playerHp: 100,
  sp: 50,
  coins: 0,
  grid: [],
  enemies: [],
  deck: { cards: ['c1', 'c2', 'c3', 'c4', 'c5'] },
  activeBonuses: [],
  rewards: [],
};

describe('BattleSerializer', () => {
  let serializer: BattleSerializer;

  beforeEach(() => {
    serializer = new BattleSerializer();
  });

  describe('serialize / deserialize round-trip', () => {
    it('serialize produces a valid JSON string', () => {
      const json = serializer.serialize(validState);
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('deserializes a valid JSON string back to BattleState', () => {
      const json = serializer.serialize(validState);
      const result = serializer.deserialize(json);
      expect(result).not.toBeInstanceOf(Error);
      const state = result as BattleState;
      expect(state.mode).toBe(validState.mode);
      expect(state.wave).toBe(validState.wave);
      expect(state.playerHp).toBe(validState.playerHp);
      expect(state.sp).toBe(validState.sp);
      expect(state.coins).toBe(validState.coins);
    });
  });

  describe('deserialize – malformed JSON (Req 12.3)', () => {
    it('returns an Error for completely invalid JSON', () => {
      const result = serializer.deserialize('not json at all');
      expect(result).toBeInstanceOf(Error);
    });

    it('returns an Error for truncated JSON', () => {
      const result = serializer.deserialize('{"mode": "daily_challenge"');
      expect(result).toBeInstanceOf(Error);
    });

    it('returns an Error for a bare number', () => {
      const result = serializer.deserialize('42');
      expect(result).toBeInstanceOf(Error);
    });

    it('returns an Error for a JSON array instead of object', () => {
      const result = serializer.deserialize('[]');
      expect(result).toBeInstanceOf(Error);
    });

    it('does NOT throw – returns Error instance instead', () => {
      expect(() => serializer.deserialize('{bad}')).not.toThrow();
      expect(serializer.deserialize('{bad}')).toBeInstanceOf(Error);
    });
  });

  describe('deserialize – missing required fields (Req 12.4)', () => {
    const requiredFields = [
      'mode', 'wave', 'playerHp', 'sp', 'grid', 'enemies', 'deck', 'activeBonuses', 'rewards',
    ] as const;

    it('returns an Error when all required fields are absent', () => {
      const result = serializer.deserialize('{}');
      expect(result).toBeInstanceOf(Error);
      const msg = (result as Error).message;
      for (const field of requiredFields) {
        expect(msg).toContain(field);
      }
    });

    it('lists only the actually missing fields', () => {
      const partial = { mode: 'endless', wave: 2 };
      const result = serializer.deserialize(JSON.stringify(partial));
      expect(result).toBeInstanceOf(Error);
      const msg = (result as Error).message;
      expect(msg).not.toContain('mode');
      expect(msg).not.toContain('wave');
      expect(msg).toContain('playerHp');
      expect(msg).toContain('sp');
      expect(msg).toContain('grid');
    });

    it('returns BattleState (not Error) when all required fields are present', () => {
      const result = serializer.deserialize(JSON.stringify(validState));
      expect(result).not.toBeInstanceOf(Error);
    });
  });

  describe('prettyPrint (Req 12.6)', () => {
    it('returns a string with 2-space indentation', () => {
      const pretty = serializer.prettyPrint(validState);
      expect(typeof pretty).toBe('string');
      expect(pretty).toMatch(/^\{\n  "/);
    });

    it('produces valid JSON that round-trips correctly', () => {
      const pretty = serializer.prettyPrint(validState);
      const parsed = JSON.parse(pretty) as BattleState;
      expect(parsed.mode).toBe(validState.mode);
      expect(parsed.wave).toBe(validState.wave);
    });

    it('output differs from compact serialize output', () => {
      const compact = serializer.serialize(validState);
      const pretty = serializer.prettyPrint(validState);
      expect(pretty).not.toBe(compact);
      expect(pretty.length).toBeGreaterThan(compact.length);
    });
  });
});
