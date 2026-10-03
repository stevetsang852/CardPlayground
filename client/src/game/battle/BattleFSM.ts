// Finite State Machine for Battle Defense Mode

export type BattleStateType =
  | 'Idle'
  | 'Preparing'
  | 'Fighting'
  | 'BetweenWaves'
  | 'BossFight'
  | 'Victory'
  | 'Defeat';

// Legal transitions: key = from state, value = set of reachable states
const LEGAL_TRANSITIONS: Record<BattleStateType, ReadonlySet<BattleStateType>> = {
  Idle:         new Set<BattleStateType>(['Preparing']),
  Preparing:    new Set<BattleStateType>(['Fighting']),
  Fighting:     new Set<BattleStateType>(['BetweenWaves', 'Defeat']),
  BetweenWaves: new Set<BattleStateType>(['Fighting', 'BossFight', 'Victory']),
  BossFight:    new Set<BattleStateType>(['BetweenWaves', 'Defeat']),
  Victory:      new Set<BattleStateType>(),
  Defeat:       new Set<BattleStateType>(),
};

export class BattleFSM {
  currentState: BattleStateType = 'Idle';

  onEnter?: (state: BattleStateType) => void;
  onExit?: (state: BattleStateType) => void;

  /**
   * Attempt to transition to the given state.
   * Returns true on success, false if the transition is illegal.
   * Illegal transitions emit a console.warn and are ignored (no exception thrown).
   */
  transition(to: BattleStateType): boolean {
    const allowed = LEGAL_TRANSITIONS[this.currentState];
    if (!allowed.has(to)) {
      console.warn(
        `[BattleFSM] Illegal transition: ${this.currentState} → ${to}`
      );
      return false;
    }

    const prev = this.currentState;
    this.onExit?.(prev);
    this.currentState = to;
    this.onEnter?.(to);
    return true;
  }

  getState(): BattleStateType {
    return this.currentState;
  }

  toJSON(): { currentState: BattleStateType } {
    return { currentState: this.currentState };
  }

  static fromJSON(data: { currentState: BattleStateType }): BattleFSM {
    const validStates: BattleStateType[] = [
      'Idle', 'Preparing', 'Fighting', 'BetweenWaves', 'BossFight', 'Victory', 'Defeat',
    ];
    if (!data || !validStates.includes(data.currentState)) {
      throw new Error(`[BattleFSM] Invalid state in fromJSON: ${data?.currentState}`);
    }
    const fsm = new BattleFSM();
    fsm.currentState = data.currentState;
    return fsm;
  }
}
