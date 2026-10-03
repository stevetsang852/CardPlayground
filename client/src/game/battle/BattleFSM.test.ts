import { BattleFSM, BattleStateType } from './BattleFSM';

describe('BattleFSM', () => {
  let fsm: BattleFSM;

  beforeEach(() => {
    fsm = new BattleFSM();
  });

  it('starts in Idle', () => {
    expect(fsm.getState()).toBe('Idle');
  });

  it('allows all legal transitions', () => {
    const legalPaths: [BattleStateType, BattleStateType][] = [
      ['Idle', 'Preparing'],
      ['Preparing', 'Fighting'],
      ['Fighting', 'BetweenWaves'],
      ['Fighting', 'Defeat'],
      ['BetweenWaves', 'Fighting'],
      ['BetweenWaves', 'BossFight'],
      ['BetweenWaves', 'Victory'],
      ['BossFight', 'BetweenWaves'],
      ['BossFight', 'Defeat'],
    ];

    for (const [from, to] of legalPaths) {
      const f = new BattleFSM();
      f.currentState = from;
      expect(f.transition(to)).toBe(true);
      expect(f.getState()).toBe(to);
    }
  });

  it('rejects illegal transitions and keeps current state', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(fsm.transition('Fighting')).toBe(false);
    expect(fsm.getState()).toBe('Idle');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Illegal transition')
    );
    warnSpy.mockRestore();
  });

  it('does not throw on illegal transition', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => fsm.transition('Victory')).not.toThrow();
    jest.restoreAllMocks();
  });

  it('fires onExit and onEnter callbacks on legal transition', () => {
    const exits: BattleStateType[] = [];
    const enters: BattleStateType[] = [];
    fsm.onExit = (s) => exits.push(s);
    fsm.onEnter = (s) => enters.push(s);

    fsm.transition('Preparing');
    expect(exits).toEqual(['Idle']);
    expect(enters).toEqual(['Preparing']);
  });

  it('does not fire callbacks on illegal transition', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const exits: BattleStateType[] = [];
    const enters: BattleStateType[] = [];
    fsm.onExit = (s) => exits.push(s);
    fsm.onEnter = (s) => enters.push(s);

    fsm.transition('Victory'); // illegal from Idle
    expect(exits).toHaveLength(0);
    expect(enters).toHaveLength(0);
    jest.restoreAllMocks();
  });

  it('Victory and Defeat are terminal states', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    fsm.currentState = 'Victory';
    expect(fsm.transition('Idle')).toBe(false);

    fsm.currentState = 'Defeat';
    expect(fsm.transition('Idle')).toBe(false);
    jest.restoreAllMocks();
  });

  it('toJSON / fromJSON round-trips correctly', () => {
    fsm.currentState = 'BetweenWaves';
    const json = fsm.toJSON();
    const restored = BattleFSM.fromJSON(json);
    expect(restored.getState()).toBe('BetweenWaves');
  });
});
