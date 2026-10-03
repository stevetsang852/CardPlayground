// BattleEngine.ts — Core game loop and battle logic
// Requirements: 5.1–5.5, 6.3, 6.4, 8.1–8.5, 11.6

import type { BattleState, BattleMode, Deck, Enemy, Guardian, Rarity, SeriesBonus } from './BattleTypes';
import { BattleFSM } from './BattleFSM';
import { ObjectPool } from './ObjectPool';
import { createGuardian, getBaseStats, calculateAttack, calculateHp } from './GuardianFactory';

// Coin upgrade cost table (Requirement 16.2)
const UPGRADE_COST: Record<number, number> = { 1: 50, 2: 100, 3: 200, 4: 400 };

// All card IDs available for random synthesis result (populated from deck)
// Exported so UI can read it
export let _deckCardIds: string[] = [];

// Wave difficulty constants
const BASE_ENEMY_COUNT = 5;
const BASE_ENEMY_HP = 50;

// SP summon costs per rarity (Requirement 8.1, 2.5)
const SUMMON_COSTS: Record<Rarity, number> = {
  common: 2,
  rare: 3,
  epic: 5,
  legendary: 8,
  mythic: 15,
};

// SP rewards per kill
const SP_REWARD_NORMAL = 1;
const SP_REWARD_BOSS = 5;

// Grid dimensions
const GRID_COLS = 8;
const GRID_ROWS = 3;

// Guardian limit (Requirement 11.4)
const GUARDIAN_LIMIT = 20;

let _enemyIdCounter = 0;

function makeEnemyFactory(): () => Enemy {
  return () => ({
    id: `enemy-${++_enemyIdCounter}`,
    hp: 0,
    maxHp: 0,
    speed: 1,
    reward: SP_REWARD_NORMAL,
    gridX: 0,
    gridY: 0,
    isBoss: false,
    pathProgress: 0,
  });
}

function resetEnemy(e: Enemy): void {
  e.hp = 0;
  e.maxHp = 0;
  e.speed = 1;
  e.reward = SP_REWARD_NORMAL;
  e.gridX = 0;
  e.gridY = 0;
  e.isBoss = false;
}

export class BattleEngine {
  state: BattleState;
  fsm: BattleFSM;
  private enemyPool: ObjectPool<Enemy>;

  constructor(mode: BattleMode, deck: Deck, galleryScore: number) {
    this.fsm = new BattleFSM();

    // Initial SP = 10 + floor(galleryScore / 100) × 10 (Requirement 8.1)
    const initialSP = 10 + Math.floor(galleryScore / 100) * 10;

    // Build initial grid (3 rows × 8 cols)
    const grid = Array.from({ length: GRID_ROWS }, (_, y) =>
      Array.from({ length: GRID_COLS }, (_, x) => ({ x, y, guardian: null }))
    );

    this.state = {
      mode,
      wave: 0,
      playerHp: 20,
      sp: initialSP,
      grid,
      enemies: [],
      deck,
      activeBonuses: [],
      rewards: [],
      coins: 0,
    };

    // Store deck card IDs for random synthesis
    _deckCardIds = [...deck.cards];

    // Enemy pool capacity: max enemies per wave × 2 (Requirement 11.1)
    const maxEnemiesPerWave = this.enemyCount(20) * 2;
    this.enemyPool = new ObjectPool<Enemy>(makeEnemyFactory(), resetEnemy, maxEnemiesPerWave);
  }

  // ─── Game Loop Tick (Requirement 5.1–5.5, 11.6) ───────────────────────────

  tick(deltaTime: number): void {
    const fsmState = this.fsm.getState();
    if (fsmState !== 'Fighting' && fsmState !== 'BossFight') return;

    // 1. Move all enemies (speed × deltaTime)
    for (const enemy of this.state.enemies) {
      enemy.gridX += enemy.speed * deltaTime;
    }

    // 2. Check if enemy reached end → deduct player HP, release to pool
    const surviving: Enemy[] = [];
    for (const enemy of this.state.enemies) {
      if (enemy.gridX >= GRID_COLS) {
        this.state.playerHp -= 1;
        this.enemyPool.release(enemy);
        // Check defeat condition (Requirement 5.3)
        if (this.state.playerHp <= 0) {
          this.fsm.transition('Defeat');
          return;
        }
      } else {
        surviving.push(enemy);
      }
    }
    this.state.enemies = surviving;

    // 3. Batch process Guardian attack checks (nearest enemy in range) (Requirement 11.6)
    const allGuardians = this._getAllGuardians();
    const bulletHits: Array<{ enemy: Enemy; damage: number }> = [];

    for (const guardian of allGuardians) {
      const target = this._findNearestEnemyInRange(guardian);
      if (target) {
        bulletHits.push({ enemy: target, damage: guardian.attack });
      }
    }

    // 4. Handle bullet hits → deduct enemy HP, give SP on death
    const deadIds = new Set<string>();
    for (const hit of bulletHits) {
      if (deadIds.has(hit.enemy.id)) continue;
      hit.enemy.hp -= hit.damage;
      if (hit.enemy.hp <= 0) {
        deadIds.add(hit.enemy.id);
        // Give SP reward (Requirement 5.5, 8.1)
        this.state.sp += hit.enemy.isBoss ? SP_REWARD_BOSS : SP_REWARD_NORMAL;
      }
    }

    // Remove dead enemies and release to pool
    this.state.enemies = this.state.enemies.filter((e) => {
      if (deadIds.has(e.id)) {
        this.enemyPool.release(e);
        return false;
      }
      return true;
    });

    // 5. Check wave end condition → trigger FSM transition (Requirement 5.5, 6.2)
    if (this.state.enemies.length === 0) {
      // Award coins when transitioning to BetweenWaves (Requirement 16.1)
      this.state.coins += this.state.wave * 5 + (this.state.coinHarvestBonus ?? 0);
      this.fsm.transition('BetweenWaves');
    }
  }

  // ─── Wave Management (Requirement 6.3, 6.4) ───────────────────────────────

  spawnWave(waveNumber: number): void {
    this.state.wave = waveNumber;
    const count = this.enemyCount(waveNumber);
    const hp = this.enemyHp(waveNumber);
    const isBossWave = waveNumber % 5 === 0;

    const newEnemies: Enemy[] = [];
    for (let i = 0; i < count; i++) {
      const enemy = this.enemyPool.acquire();
      enemy.id = `enemy-w${waveNumber}-${i}`;
      enemy.hp = hp;
      enemy.maxHp = hp;
      enemy.speed = 1;
      enemy.gridX = 0;
      enemy.gridY = Math.floor(Math.random() * GRID_ROWS);
      enemy.isBoss = isBossWave && i === 0; // first enemy is boss on boss waves
      enemy.reward = enemy.isBoss ? SP_REWARD_BOSS : SP_REWARD_NORMAL;
      newEnemies.push(enemy);
    }

    this.state.enemies = newEnemies;

    // Trigger BossFight FSM state for boss waves (Requirement 6.4)
    if (isBossWave) {
      this.fsm.transition('BossFight');
    } else {
      this.fsm.transition('Fighting');
    }
  }

  /** enemyCount(wave) = baseCount(5) + floor(wave × 1.5) */
  enemyCount(wave: number): number {
    return BASE_ENEMY_COUNT + Math.floor(wave * 1.5);
  }

  /** enemyHp(wave) = baseHp(50) × 1.1^wave */
  enemyHp(wave: number): number {
    return BASE_ENEMY_HP * Math.pow(1.1, wave);
  }

  // ─── RD-style: Buy a random guardian into a random empty cell ────────────
  /**
   * Spends SP to place a random card from the deck into a random empty cell.
   * Both the card type AND the cell are random — exactly like Random Dice.
   * Returns the placed guardian on success, null if no SP or no empty cells.
   */
  buyRandomGuardian(rarity: Rarity): Guardian | null {
    const cost = this.getSummonCost(rarity);
    if (this.state.sp < cost) return null;

    // Find all empty cells
    const emptyCells: { x: number; y: number }[] = [];
    for (const row of this.state.grid) {
      for (const cell of row) {
        if (!cell.guardian) emptyCells.push({ x: cell.x, y: cell.y });
      }
    }
    if (emptyCells.length === 0) return null;
    if (this._getAllGuardians().length >= GUARDIAN_LIMIT) return null;

    // Random empty cell
    const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    // Random card from deck
    const cardIds = _deckCardIds.length > 0 ? _deckCardIds : this.state.deck.cards;
    const cardId = cardIds[Math.floor(Math.random() * cardIds.length)];

    this.state.sp -= cost;
    const guardian = createGuardian(cardId, rarity, '', 1, x, y);
    this.state.grid[y][x].guardian = guardian;
    return guardian;
  }

  // ─── SP System (Requirement 8.1, 2.5) ─────────────────────────────────────

  getSummonCost(rarity: Rarity): number {
    return SUMMON_COSTS[rarity];
  }

  summonGuardian(
    cardId: string,
    rarity: Rarity,
    series: string,
    gridX: number,
    gridY: number,
  ): boolean {
    const cost = this.getSummonCost(rarity);

    // Check SP
    if (this.state.sp < cost) return false;

    // Check grid bounds
    if (gridY < 0 || gridY >= GRID_ROWS || gridX < 0 || gridX >= GRID_COLS) return false;

    // Check cell is empty
    const cell = this.state.grid[gridY]?.[gridX];
    if (!cell || cell.guardian !== null) return false;

    // Check guardian limit (Requirement 11.4)
    if (this._getAllGuardians().length >= GUARDIAN_LIMIT) return false;

    // Deduct SP and place guardian
    this.state.sp -= cost;
    const guardian = createGuardian(cardId, rarity, series, 1, gridX, gridY);
    cell.guardian = guardian;

    return true;
  }

  // ─── Series Bonus Calculation (Requirement 8.2–8.5) ──────────────────────

  calculateSeriesBonus(
    deck: Deck,
    cardCollection: Array<{ id: string; series: string }>,
  ): SeriesBonus[] {
    // Count cards per series in deck
    const seriesCount = new Map<string, number>();

    for (const cardId of deck.cards) {
      const card = cardCollection.find((c) => c.id === cardId);
      if (card?.series) {
        seriesCount.set(card.series, (seriesCount.get(card.series) ?? 0) + 1);
      }
    }

    // Activate +10% attack bonus for series with ≥3 cards (Requirement 8.3)
    const bonuses: SeriesBonus[] = [];
    for (const [series, count] of seriesCount.entries()) {
      if (count >= 3) {
        bonuses.push({ series, attackBonus: 0.1 });
      }
    }

    // Update active bonuses on state
    this.state.activeBonuses = bonuses;
    return bonuses;
  }

  // ─── Synthesis Upgrade (Requirements 4.1, 4.2, 4.3) ──────────────────────

  /**
   * Returns valid adjacent cells (up/down/left/right) within grid bounds.
   */
  getAdjacentCells(gridX: number, gridY: number): Array<{ x: number; y: number }> {
    const candidates = [
      { x: gridX, y: gridY - 1 },
      { x: gridX, y: gridY + 1 },
      { x: gridX - 1, y: gridY },
      { x: gridX + 1, y: gridY },
    ];
    return candidates.filter(
      (c) => c.x >= 0 && c.x < GRID_COLS && c.y >= 0 && c.y < GRID_ROWS,
    );
  }

  /**
   * Synthesizes two adjacent guardians of the same cardId and level into one
   * guardian at level+1. Deducts SP equal to the summon cost of the resulting
   * guardian's rarity.
   *
   * Returns { success: true } on success, or { success: false, message } on failure.
   * Requirement 4.1, 4.2, 4.3
   */
  synthesize(
    gridX1: number,
    gridY1: number,
    gridX2: number,
    gridY2: number,
  ): { success: boolean; message?: string } {
    const cell1 = this.state.grid[gridY1]?.[gridX1];
    const cell2 = this.state.grid[gridY2]?.[gridX2];

    // Both cells must have guardians (Requirement 4.1)
    if (!cell1?.guardian) return { success: false, message: '格子沒有守衛' };
    if (!cell2?.guardian) return { success: false, message: '格子沒有守衛' };

    const g1 = cell1.guardian;
    const g2 = cell2.guardian;

    // Both guardians must have the same cardId AND same level (Requirement 4.1)
    if (g1.cardId !== g2.cardId) return { success: false, message: '守衛卡牌不同' };
    if (g1.level !== g2.level) return { success: false, message: '守衛等級不同' };

    // They must be adjacent (up/down/left/right — not diagonal) (Requirement 4.1)
    const adjacent = this.getAdjacentCells(gridX1, gridY1);
    const isAdjacent = adjacent.some((c) => c.x === gridX2 && c.y === gridY2);
    if (!isAdjacent) return { success: false, message: '守衛不相鄰' };

    // Level cap check: reject if either guardian is at level 5 (Requirement 4.3)
    if (g1.level >= 5 || g2.level >= 5) return { success: false, message: '已達最高等級' };

    const newLevel = g1.level + 1;
    const cost = this.getSummonCost(g1.rarity);

    // Player must have enough SP (Requirement 4.2)
    if (this.state.sp < cost) return { success: false, message: 'SP 不足' };

    // On success: remove both guardians, place NEW RANDOM card at (gridX1, gridY1), deduct SP
    // This is the core Random Dice mechanic: synthesis produces a RANDOM new guardian type
    this.state.sp -= cost;
    cell2.guardian = null;

    // Pick a random card from the deck for the new guardian (RD-style random synthesis)
    const cardIds = _deckCardIds.length > 0 ? _deckCardIds : this.state.deck.cards;
    const newCardId = cardIds[Math.floor(Math.random() * cardIds.length)];
    cell1.guardian = createGuardian(newCardId, g1.rarity, '', newLevel, gridX1, gridY1);
    cell1.guardian.element = g1.element;

    return { success: true };
  }

  // ─── Coin Upgrade (Requirement 16.1, 16.2, 16.3) ─────────────────────────

  /**
   * Upgrades a guardian at (gridX, gridY) by spending coins.
   * Cost: 1→2: 50, 2→3: 100, 3→4: 200, 4→5: 400 coins.
   */
  coinUpgrade(gridX: number, gridY: number): { success: boolean; message?: string } {
    const cell = this.state.grid[gridY]?.[gridX];
    if (!cell?.guardian) return { success: false, message: '格子沒有守衛' };
    const guardian = cell.guardian;
    const cost = UPGRADE_COST[guardian.level];
    if (!cost) return { success: false, message: '已達最高等級' };
    if (this.state.coins < cost) return { success: false, message: `金幣不足，需要 ${cost} 金幣` };
    this.state.coins -= cost;
    guardian.level += 1;
    guardian.attack = calculateAttack(getBaseStats(guardian.rarity).attack, guardian.level);
    guardian.hp = guardian.maxHp = calculateHp(getBaseStats(guardian.rarity).hp, guardian.level);
    return { success: true };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private _getAllGuardians(): Guardian[] {
    const guardians: Guardian[] = [];
    for (const row of this.state.grid) {
      for (const cell of row) {
        if (cell.guardian) guardians.push(cell.guardian);
      }
    }
    return guardians;
  }

  private _findNearestEnemyInRange(guardian: Guardian): Enemy | null {
    if (this.state.enemies.length === 0) return null;

    // Attack-type guardians (range === Infinity): target enemy with highest gridX
    // (closest to endpoint). Requirement 15.1, 15.2, 15.3
    if (guardian.range === Infinity) {
      let target: Enemy | null = null;
      let maxGridX = -Infinity;
      for (const enemy of this.state.enemies) {
        if (enemy.gridX > maxGridX) {
          maxGridX = enemy.gridX;
          target = enemy;
        }
      }
      return target;
    }

    // Support-type guardians: keep existing distance-based selection (only in range)
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const enemy of this.state.enemies) {
      const dx = enemy.gridX - guardian.gridX;
      const dy = enemy.gridY - guardian.gridY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= guardian.range && dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }
}
