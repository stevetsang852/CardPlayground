// BattleEngine.test.ts
// Requirements: 5.1–5.5, 6.3, 8.3, 8.5

import { BattleEngine } from './BattleEngine';
import type { Deck } from './BattleTypes';

const TEST_DECK: Deck = { cards: ['c1', 'c2', 'c3', 'c4', 'c5'] };

function makeEngine(galleryScore = 0): BattleEngine {
  return new BattleEngine('endless', TEST_DECK, galleryScore);
}

// ─── Helper: put engine into Fighting state ────────────────────────────────
function startFighting(engine: BattleEngine): void {
  engine.fsm.transition('Preparing');
  engine.fsm.transition('Fighting');
}

// ─── 1. Enemy movement and HP deduction (Requirements 5.1, 5.2, 5.3) ──────
describe('Enemy movement and player HP deduction', () => {
  it('moves enemies forward by speed × deltaTime each tick (Req 5.1)', () => {
    const engine = makeEngine();
    startFighting(engine);

    // Manually inject an enemy
    const enemy = {
      id: 'e1',
      hp: 50,
      maxHp: 50,
      speed: 2,
      reward: 1,
      gridX: 0,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [enemy];

    engine.tick(0.5); // deltaTime = 0.5s → should move 2 × 0.5 = 1 grid

    // Enemy should have moved to gridX = 1
    expect(engine.state.enemies[0].gridX).toBeCloseTo(1);
  });

  it('deducts 1 player HP when enemy reaches end (gridX >= 8) (Req 5.2)', () => {
    const engine = makeEngine();
    startFighting(engine);
    const initialHp = engine.state.playerHp;

    const enemy = {
      id: 'e2',
      hp: 50,
      maxHp: 50,
      speed: 10,
      reward: 1,
      gridX: 7.5,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [enemy];

    engine.tick(0.1); // moves 10 × 0.1 = 1 → gridX = 8.5 → reaches end

    expect(engine.state.playerHp).toBe(initialHp - 1);
    expect(engine.state.enemies).toHaveLength(0); // enemy removed
  });

  it('triggers Defeat FSM state when player HP reaches 0 (Req 5.3)', () => {
    const engine = makeEngine();
    startFighting(engine);
    engine.state.playerHp = 1;

    const enemy = {
      id: 'e3',
      hp: 50,
      maxHp: 50,
      speed: 10,
      reward: 1,
      gridX: 7.5,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [enemy];

    engine.tick(0.1);

    expect(engine.fsm.getState()).toBe('Defeat');
  });

  it('does not move enemies when FSM is not in Fighting/BossFight (Req 5.1)', () => {
    const engine = makeEngine();
    // FSM is in Idle — tick should be a no-op
    const enemy = {
      id: 'e4',
      hp: 50,
      maxHp: 50,
      speed: 2,
      reward: 1,
      gridX: 0,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [enemy];

    engine.tick(1);

    expect(engine.state.enemies[0].gridX).toBe(0); // no movement
  });
});

// ─── 2. Guardian attack range detection (Requirements 5.4, 15.1–15.3) ─────
describe('Guardian attack range and targeting nearest enemy', () => {
  it('attack-type guardian (common/single) targets enemy with highest gridX (Req 15.3)', () => {
    const engine = makeEngine();
    startFighting(engine);

    // Place a common guardian at (0, 0) — range = Infinity (attack type)
    engine.summonGuardian('card-common', 'common', '原始火山', 0, 0);

    // Place two enemies: one near, one far (higher gridX)
    const nearEnemy = {
      id: 'near',
      hp: 100,
      maxHp: 100,
      speed: 0,
      reward: 1,
      gridX: 1,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    const farEnemy = {
      id: 'far',
      hp: 100,
      maxHp: 100,
      speed: 0,
      reward: 1,
      gridX: 5,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [nearEnemy, farEnemy];

    engine.tick(0.001); // tiny tick — just enough to trigger attack logic

    // Attack-type guardian targets highest gridX (far enemy), not nearest
    const near = engine.state.enemies.find((e) => e.id === 'near');
    const far = engine.state.enemies.find((e) => e.id === 'far');

    // far enemy (highest gridX) should have taken damage
    expect(far === undefined || far.hp < 100).toBe(true);
    // near enemy should be untouched
    expect(near).toBeDefined();
    expect(near!.hp).toBe(100);
  });

  it('attack-type guardian attacks any enemy regardless of distance (Req 15.1)', () => {
    const engine = makeEngine();
    startFighting(engine);

    // Place a common guardian at (0, 0) — range = Infinity (attack type)
    engine.summonGuardian('card-common', 'common', '原始火山', 0, 0);

    const distantEnemy = {
      id: 'distant',
      hp: 100,
      maxHp: 100,
      speed: 0,
      reward: 1,
      gridX: 7, // far away
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [distantEnemy];

    engine.tick(0.001);

    // Attack-type guardian should attack even very distant enemies
    expect(engine.state.enemies[0].hp).toBeLessThan(100);
  });

  it('attack-type guardian targets highest gridX when multiple enemies present (Req 15.3)', () => {
    const engine = makeEngine();
    startFighting(engine);

    // Place a legendary guardian at (0, 0) — range = Infinity (attack type, special)
    engine.summonGuardian('card-leg', 'legendary', '光明聖域', 0, 0);

    const closer = {
      id: 'closer',
      hp: 200,
      maxHp: 200,
      speed: 0,
      reward: 1,
      gridX: 1,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    const further = {
      id: 'further',
      hp: 200,
      maxHp: 200,
      speed: 0,
      reward: 1,
      gridX: 3,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [closer, further];

    engine.tick(0.001);

    const closerEnemy = engine.state.enemies.find((e) => e.id === 'closer');
    const furtherEnemy = engine.state.enemies.find((e) => e.id === 'further');

    // Attack-type guardian targets highest gridX (further enemy)
    expect(furtherEnemy === undefined || furtherEnemy.hp < 200).toBe(true);
    // Closer enemy should be untouched
    expect(closerEnemy).toBeDefined();
    expect(closerEnemy!.hp).toBe(200);
  });
});

// ─── 3. SP rewards on enemy kill (Requirements 5.5, 8.1) ───────────────────
describe('SP rewards on enemy kill', () => {
  it('gives +1 SP for killing a normal enemy (Req 5.5)', () => {
    // Use galleryScore=500 so initialSP=60, enough to summon mythic (cost=15)
    const engine = makeEngine(500);
    startFighting(engine);

    // Place a strong guardian that will one-shot the enemy
    engine.summonGuardian('card-mythic', 'mythic', '暗影深淵', 0, 0);
    const spAfterSummon = engine.state.sp;

    const weakEnemy = {
      id: 'weak-normal',
      hp: 1,
      maxHp: 1,
      speed: 0,
      reward: 1,
      gridX: 1,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [weakEnemy];

    engine.tick(0.001);

    // Enemy should be dead and SP should have increased by 1
    expect(engine.state.enemies.find((e) => e.id === 'weak-normal')).toBeUndefined();
    expect(engine.state.sp).toBe(spAfterSummon + 1);
  });

  it('gives +5 SP for killing a boss enemy (Req 5.5)', () => {
    const engine = makeEngine(500);
    startFighting(engine);

    engine.summonGuardian('card-mythic', 'mythic', '暗影深淵', 0, 0);
    const spAfterSummon = engine.state.sp;

    const weakBoss = {
      id: 'weak-boss',
      hp: 1,
      maxHp: 1,
      speed: 0,
      reward: 5,
      gridX: 1,
      gridY: 0,
      isBoss: true,
      pathProgress: 0,
    };
    engine.state.enemies = [weakBoss];

    engine.tick(0.001);

    expect(engine.state.enemies.find((e) => e.id === 'weak-boss')).toBeUndefined();
    expect(engine.state.sp).toBe(spAfterSummon + 5);
  });
});

// ─── 4. Wave difficulty scaling (Requirement 6.3) ──────────────────────────
describe('Wave difficulty scaling', () => {
  it('enemyCount increases with wave number (Req 6.3)', () => {
    const engine = makeEngine();
    const count1 = engine.enemyCount(1);
    const count5 = engine.enemyCount(5);
    const count10 = engine.enemyCount(10);

    expect(count5).toBeGreaterThan(count1);
    expect(count10).toBeGreaterThan(count5);
  });

  it('enemyCount formula: baseCount(5) + floor(wave × 1.5) (Req 6.3)', () => {
    const engine = makeEngine();
    expect(engine.enemyCount(1)).toBe(5 + Math.floor(1 * 1.5));  // 6
    expect(engine.enemyCount(2)).toBe(5 + Math.floor(2 * 1.5));  // 8
    expect(engine.enemyCount(10)).toBe(5 + Math.floor(10 * 1.5)); // 20
  });

  it('enemyHp increases with wave number (Req 6.3)', () => {
    const engine = makeEngine();
    const hp1 = engine.enemyHp(1);
    const hp5 = engine.enemyHp(5);
    const hp10 = engine.enemyHp(10);

    expect(hp5).toBeGreaterThan(hp1);
    expect(hp10).toBeGreaterThan(hp5);
  });

  it('enemyHp formula: baseHp(50) × 1.1^wave (Req 6.3)', () => {
    const engine = makeEngine();
    expect(engine.enemyHp(0)).toBeCloseTo(50 * Math.pow(1.1, 0));
    expect(engine.enemyHp(1)).toBeCloseTo(50 * Math.pow(1.1, 1));
    expect(engine.enemyHp(5)).toBeCloseTo(50 * Math.pow(1.1, 5));
  });

  it('spawnWave sets correct enemy count and hp for wave 1 (Req 6.3)', () => {
    const engine = makeEngine();
    engine.fsm.transition('Preparing');
    engine.spawnWave(1);

    const expectedCount = engine.enemyCount(1);
    const expectedHp = engine.enemyHp(1);

    expect(engine.state.enemies).toHaveLength(expectedCount);
    for (const enemy of engine.state.enemies) {
      expect(enemy.hp).toBeCloseTo(expectedHp);
      expect(enemy.maxHp).toBeCloseTo(expectedHp);
    }
  });

  it('spawnWave marks first enemy as boss on wave 5 (Req 6.4)', () => {
    const engine = makeEngine();
    engine.fsm.transition('Preparing');
    engine.spawnWave(5);

    const boss = engine.state.enemies.find((e) => e.isBoss);
    expect(boss).toBeDefined();
  });

  it('spawnWave triggers BossFight FSM state on wave 5 (Req 6.4)', () => {
    const engine = makeEngine();
    engine.fsm.transition('Preparing');
    engine.fsm.transition('Fighting');
    engine.fsm.transition('BetweenWaves');
    engine.spawnWave(5);

    expect(engine.fsm.getState()).toBe('BossFight');
  });

  it('spawnWave triggers Fighting FSM state on non-boss wave (Req 6.3)', () => {
    const engine = makeEngine();
    engine.fsm.transition('Preparing');
    engine.spawnWave(1);

    expect(engine.fsm.getState()).toBe('Fighting');
  });
});

// ─── 5. Series_Bonus stacking (Requirements 8.3, 8.5) ─────────────────────
describe('Series_Bonus stacking', () => {
  const cardCollection = [
    { id: 'f1', series: '原始火山' },
    { id: 'f2', series: '原始火山' },
    { id: 'f3', series: '原始火山' },
    { id: 'i1', series: '寒冰紀元' },
    { id: 'i2', series: '寒冰紀元' },
    { id: 'i3', series: '寒冰紀元' },
    { id: 'n1', series: '神秘森林' },
    { id: 'n2', series: '神秘森林' },
  ];

  it('activates +10% bonus when ≥3 cards of same series in deck (Req 8.3)', () => {
    const engine = makeEngine();
    const deck: Deck = { cards: ['f1', 'f2', 'f3', 'i1', 'i2'] };

    const bonuses = engine.calculateSeriesBonus(deck, cardCollection);

    const fireBonus = bonuses.find((b) => b.series === '原始火山');
    expect(fireBonus).toBeDefined();
    expect(fireBonus!.attackBonus).toBe(0.1);
  });

  it('does not activate bonus when fewer than 3 cards of same series (Req 8.3)', () => {
    const engine = makeEngine();
    const deck: Deck = { cards: ['i1', 'i2', 'n1', 'n2', 'f1'] };

    const bonuses = engine.calculateSeriesBonus(deck, cardCollection);

    // No series has ≥3 cards
    expect(bonuses).toHaveLength(0);
  });

  it('stacks multiple series bonuses when multiple series have ≥3 cards (Req 8.5)', () => {
    const engine = makeEngine();
    const deck: Deck = { cards: ['f1', 'f2', 'f3', 'i1', 'i2', 'i3'] };

    const bonuses = engine.calculateSeriesBonus(deck, cardCollection);

    expect(bonuses.length).toBeGreaterThanOrEqual(2);

    const fireBonus = bonuses.find((b) => b.series === '原始火山');
    const iceBonus = bonuses.find((b) => b.series === '寒冰紀元');

    expect(fireBonus).toBeDefined();
    expect(fireBonus!.attackBonus).toBe(0.1);
    expect(iceBonus).toBeDefined();
    expect(iceBonus!.attackBonus).toBe(0.1);
  });

  it('updates state.activeBonuses after calculateSeriesBonus (Req 8.3)', () => {
    const engine = makeEngine();
    const deck: Deck = { cards: ['f1', 'f2', 'f3', 'i1', 'i2'] };

    engine.calculateSeriesBonus(deck, cardCollection);

    expect(engine.state.activeBonuses).toHaveLength(1);
    expect(engine.state.activeBonuses[0].series).toBe('原始火山');
  });

  it('each bonus has attackBonus of exactly 0.1 (+10%) (Req 8.3)', () => {
    const engine = makeEngine();
    const deck: Deck = { cards: ['f1', 'f2', 'f3', 'i1', 'i2', 'i3'] };

    const bonuses = engine.calculateSeriesBonus(deck, cardCollection);

    for (const bonus of bonuses) {
      expect(bonus.attackBonus).toBe(0.1);
    }
  });
});

// ─── 6. Initial SP from Gallery Score (Requirement 8.1) ────────────────────
describe('Initial SP from Gallery Score', () => {
  it('initialSP = 10 when galleryScore = 0 (Req 8.1)', () => {
    const engine = makeEngine(0);
    expect(engine.state.sp).toBe(10);
  });

  it('initialSP = 20 when galleryScore = 100 (Req 8.1)', () => {
    const engine = makeEngine(100);
    expect(engine.state.sp).toBe(20);
  });

  it('initialSP = 30 when galleryScore = 250 (Req 8.1)', () => {
    const engine = makeEngine(250);
    expect(engine.state.sp).toBe(30); // 10 + floor(250/100)*10 = 10 + 20 = 30
  });
});

// ─── 7. Wave end triggers BetweenWaves FSM (Requirement 5.5, 6.2) ──────────
describe('Wave end condition', () => {
  it('transitions to BetweenWaves when all enemies are eliminated (Req 5.5)', () => {
    // Use galleryScore=500 so initialSP=60, enough to summon mythic (cost=15)
    const engine = makeEngine(500);
    startFighting(engine);

    // Place a mythic guardian to one-shot the enemy
    engine.summonGuardian('card-mythic', 'mythic', '暗影深淵', 0, 0);

    const weakEnemy = {
      id: 'last-enemy',
      hp: 1,
      maxHp: 1,
      speed: 0,
      reward: 1,
      gridX: 1,
      gridY: 0,
      isBoss: false,
      pathProgress: 0,
    };
    engine.state.enemies = [weakEnemy];

    engine.tick(0.001);

    expect(engine.state.enemies).toHaveLength(0);
    expect(engine.fsm.getState()).toBe('BetweenWaves');
  });
});
