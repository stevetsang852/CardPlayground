/**
 * Property-based tests for BattleFSM
 *
 * **Validates: Requirements 10.3, 10.7**
 */
import * as fc from 'fast-check';
import { BattleFSM, BattleStateType } from './BattleFSM';

const ALL_STATES: BattleStateType[] = [
  'Idle',
  'Preparing',
  'Fighting',
  'BetweenWaves',
  'BossFight',
  'Victory',
  'Defeat',
];

const LEGAL_TRANSITIONS: Record<BattleStateType, BattleStateType[]> = {
  Idle:         ['Preparing'],
  Preparing:    ['Fighting'],
  Fighting:     ['BetweenWaves', 'Defeat'],
  BetweenWaves: ['Fighting', 'BossFight', 'Victory'],
  BossFight:    ['BetweenWaves', 'Defeat'],
  Victory:      [],
  Defeat:       [],
};

const stateArb = fc.constantFrom(...ALL_STATES);

describe('BattleFSM property tests', () => {
  /**
   * Property 1: Illegal transitions do not change state
   * **Validates: Requirements 10.3**
   *
   * For every state S and every target state T, if T is not a legal
   * successor of S, then after calling transition(T) the FSM must
   * still be in state S.
   */
  it('Property 1: illegal transitions do not change state', () => {
    // Suppress console.warn noise during property runs
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    fc.assert(
      fc.property(stateArb, stateArb, (from, to) => {
        const isLegal = LEGAL_TRANSITIONS[from].includes(to);
        if (isLegal) return; // only test illegal transitions

        const fsm = new BattleFSM();
        fsm.currentState = from;
        const result = fsm.transition(to);

        expect(result).toBe(false);
        expect(fsm.getState()).toBe(from);
      }),
      { numRuns: 500 }
    );

    warnSpy.mockRestore();
  });

  /**
   * Property 2: JSON round-trip equivalence
   * **Validates: Requirements 10.7**
   *
   * For every valid BattleStateType, creating a BattleFSM with that
   * state, calling toJSON(), then fromJSON() must produce an FSM with
   * the same state.
   */
  it('Property 2: JSON round-trip produces equivalent FSM', () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        const fsm = new BattleFSM();
        fsm.currentState = state;

        const json = fsm.toJSON();
        const restored = BattleFSM.fromJSON(json);

        expect(restored.getState()).toBe(fsm.getState());
      }),
      { numRuns: 200 }
    );
  });
});
