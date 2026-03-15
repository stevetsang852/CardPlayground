import { SeasonService } from './seasonService';
import { Firestore } from 'firebase-admin/firestore';
import { Season, BattlePassTier, Reward, Mission } from '../../../shared/src/types/season';
import fc from 'fast-check';

/**
 * Property-based tests for SeasonService
 *
 * Feature: card-mystery-realm
 */

// ---------------------------------------------------------------------------
// MockFirestore (mirrors the pattern from achievementService.property.test.ts)
// ---------------------------------------------------------------------------
class MockFirestore {
  private data: Map<string, any> = new Map();
  private currentCollection: string = '';
  private queryFilters: Array<{ field: string; op: string; value: any }> = [];
  private queryLimit: number = Infinity;
  private queryOrderBy: { field: string; direction: string } | null = null;

  collection(name: string) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = name;
    return inst;
  }

  doc(id?: string) {
    const docId = id || this.generateId();
    const collectionName = this.currentCollection;
    const dataStore = this.data;

    return {
      id: docId,
      collection: (subName: string) => {
        const sub = new MockFirestore();
        sub.data = dataStore;
        sub.currentCollection = `${collectionName}/${docId}/${subName}`;
        return sub;
      },
      set: async (docData: any, _opts?: any) => {
        const key = `${collectionName}/${docId}`;
        const existing = dataStore.get(key) || {};
        dataStore.set(key, { ...existing, ...docData });
      },
      get: async () => {
        const docData = dataStore.get(`${collectionName}/${docId}`);
        return { exists: !!docData, data: () => docData };
      },
      update: async (updates: any) => {
        const key = `${collectionName}/${docId}`;
        const existing = dataStore.get(key) || {};
        dataStore.set(key, { ...existing, ...updates });
      },
    };
  }

  where(field: string, op: string, value: any) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = this.currentCollection;
    inst.queryFilters = [...this.queryFilters, { field, op, value }];
    inst.queryLimit = this.queryLimit;
    inst.queryOrderBy = this.queryOrderBy;
    return inst;
  }

  orderBy(field: string, direction: string) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = this.currentCollection;
    inst.queryFilters = [...this.queryFilters];
    inst.queryLimit = this.queryLimit;
    inst.queryOrderBy = { field, direction };
    return inst;
  }

  limit(count: number) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = this.currentCollection;
    inst.queryFilters = [...this.queryFilters];
    inst.queryLimit = count;
    inst.queryOrderBy = this.queryOrderBy;
    return inst;
  }

  async get() {
    const results: any[] = [];
    this.data.forEach((value, key) => {
      if (key.startsWith(this.currentCollection + '/')) {
        const rest = key.slice(this.currentCollection.length + 1);
        if (rest.includes('/')) return;

        let matches = true;
        for (const filter of this.queryFilters) {
          const fieldValue = this.getNestedField(value, filter.field);
          switch (filter.op) {
            case '==': if (fieldValue !== filter.value) matches = false; break;
            case '>':  if (!(fieldValue > filter.value)) matches = false; break;
            case '<':  if (!(fieldValue < filter.value)) matches = false; break;
            case '>=': if (!(fieldValue >= filter.value)) matches = false; break;
            case '<=': if (!(fieldValue <= filter.value)) matches = false; break;
          }
          if (!matches) break;
        }
        if (matches) results.push({ data: () => value });
      }
    });

    if (this.queryOrderBy) {
      const { field, direction } = this.queryOrderBy;
      results.sort((a, b) => {
        const aVal = a.data()[field];
        const bVal = b.data()[field];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    const limited = results.slice(0, this.queryLimit);
    return { empty: limited.length === 0, docs: limited };
  }

  async runTransaction(fn: (tx: any) => Promise<void>) {
    const dataStore = this.data;
    const tx = {
      get: async (docRef: any) => {
        let found: any = null;
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            found = value;
            break;
          }
        }
        return { exists: !!found, data: () => found, id: docRef.id };
      },
      update: (docRef: any, updates: any) => {
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            dataStore.set(key, { ...value, ...updates });
            return;
          }
        }
      },
      set: (docRef: any, d: any, _opts?: any) => {
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            dataStore.set(key, { ...value, ...d });
            return;
          }
        }
        dataStore.set(`unknown/${docRef.id}`, d);
      },
    };
    await fn(tx);
  }

  private getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  addData(collection: string, id: string, docData: any) {
    this.data.set(`${collection}/${id}`, docData);
  }

  getData(collection: string, id: string): any {
    return this.data.get(`${collection}/${id}`);
  }

  clear() {
    this.data.clear();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDb(): MockFirestore {
  return new MockFirestore();
}

const nonEmptyId = fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

const rewardArb: fc.Arbitrary<Reward> = fc.record({
  type: fc.constantFrom('soft_currency', 'hard_currency', 'card', 'pack', 'material', 'cosmetic') as fc.Arbitrary<Reward['type']>,
  quantity: fc.integer({ min: 1, max: 1000 }),
});

const battlePassTierArb: fc.Arbitrary<BattlePassTier> = fc.record({
  level: fc.integer({ min: 1, max: 100 }),
  xpRequired: fc.integer({ min: 100, max: 10000 }),
  freeRewards: fc.array(rewardArb, { minLength: 1, maxLength: 3 }),
  paidRewards: fc.array(rewardArb, { minLength: 1, maxLength: 3 }),
});

function makeSeason(overrides: Partial<Season> = {}): Season {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  return {
    id: 'season_test',
    name: 'Test Season',
    theme: 'test',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    exclusiveCardTemplates: ['card_a', 'card_b'],
    exclusivePacks: ['pack_a'],
    battlePassTiers: [
      { level: 1, xpRequired: 100, freeRewards: [{ type: 'soft_currency', quantity: 100 }], paidRewards: [{ type: 'hard_currency', quantity: 10 }] },
      { level: 2, xpRequired: 300, freeRewards: [{ type: 'soft_currency', quantity: 200 }], paidRewards: [{ type: 'hard_currency', quantity: 20 }] },
      { level: 3, xpRequired: 600, freeRewards: [{ type: 'soft_currency', quantity: 300 }], paidRewards: [{ type: 'hard_currency', quantity: 30 }] },
    ],
    scheduledEvents: [],
    ...overrides,
  };
}

function makePlayer(playerId: string, overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: playerId,
    softCurrency: 1000,
    hardCurrency: 100,
    cards: [],
    consecutiveLoginDays: 0,
    lastLoginDate: '',
    lastActiveAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 27: Mission generation count
// **Validates: Requirements 8.3, 8.4**
// ---------------------------------------------------------------------------
describe('Property 27: Mission generation count', () => {
  /**
   * For any mission reset period (daily or weekly), exactly 3 missions of
   * that type should be generated for each player.
   *
   * Validates: Requirements 8.3, 8.4
   */
  it('generateDailyMissions always returns exactly 3 missions', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const missions = await service.generateDailyMissions(playerId);
          return missions.length === 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generateWeeklyMissions always returns exactly 3 missions', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const missions = await service.generateWeeklyMissions(playerId);
          return missions.length === 3;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all generated daily missions have type "daily"', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const missions = await service.generateDailyMissions(playerId);
          return missions.every(m => m.type === 'daily');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all generated weekly missions have type "weekly"', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const missions = await service.generateWeeklyMissions(playerId);
          return missions.every(m => m.type === 'weekly');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generated missions have unique IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const daily = await service.generateDailyMissions(playerId);
          const weekly = await service.generateWeeklyMissions(playerId);

          const dailyIds = new Set(daily.map(m => m.id));
          const weeklyIds = new Set(weekly.map(m => m.id));

          return dailyIds.size === 3 && weeklyIds.size === 3;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 28: Mission completion rewards
// **Validates: Requirements 7.4, 7.5, 8.5, 8.6**
// ---------------------------------------------------------------------------
describe('Property 28: Mission completion rewards', () => {
  /**
   * For any completed mission, the player should receive the configured
   * soft currency reward and battle pass XP.
   *
   * Validates: Requirements 7.4, 7.5, 8.5, 8.6
   */
  it('completing a mission grants the specified soft currency reward', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          initialSoftCurrency: fc.integer({ min: 0, max: 100_000 }),
          rewardAmount: fc.integer({ min: 1, max: 5000 }),
        }),
        async ({ playerId, initialSoftCurrency, rewardAmount }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          const season = makeSeason();
          db.addData('seasons', season.id, season);
          db.addData('players', playerId, makePlayer(playerId, { softCurrency: initialSoftCurrency }));

          // Simulate mission completion by granting rewards directly
          const rewards: Reward[] = [{ type: 'soft_currency', quantity: rewardAmount }];
          await (service as any).grantRewards(playerId, rewards);

          const playerAfter = db.getData('players', playerId);
          return playerAfter.softCurrency === initialSoftCurrency + rewardAmount;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('completing a mission grants battle pass XP', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          xpAmount: fc.integer({ min: 1, max: 1000 }),
        }),
        async ({ playerId, xpAmount }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          const season = makeSeason();
          db.addData('seasons', season.id, season);
          db.addData('players', playerId, makePlayer(playerId));

          const result = await service.addBattlePassXP(playerId, xpAmount);
          return result.newXP >= xpAmount;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('mission rewards are non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const daily = await service.generateDailyMissions(playerId);
          const weekly = await service.generateWeeklyMissions(playerId);

          const allMissions = [...daily, ...weekly];
          return allMissions.every(m =>
            m.rewards.every(r => r.quantity >= 0) && m.battlePassXP >= 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 29: Battle pass reward unlocking
// **Validates: Requirements 7.6**
// ---------------------------------------------------------------------------
describe('Property 29: Battle pass reward unlocking', () => {
  /**
   * For any battle pass level increase, all rewards for that level on the
   * player's accessible tracks should be unlocked.
   *
   * Validates: Requirements 7.6
   */
  it('adding enough XP to level up unlocks the new tier', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          xpToAdd: fc.integer({ min: 100, max: 200 }),
        }),
        async ({ playerId, xpToAdd }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          const season = makeSeason();
          db.addData('seasons', season.id, season);
          db.addData('players', playerId, makePlayer(playerId));

          // Level 1 requires 100 XP
          const result = await service.addBattlePassXP(playerId, xpToAdd);

          if (xpToAdd >= 100) {
            return result.newLevel >= 1 && result.unlockedRewards.length > 0;
          }
          return result.newLevel === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('free track rewards are always unlocked on level up', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          const season = makeSeason();
          db.addData('seasons', season.id, season);
          db.addData('players', playerId, makePlayer(playerId));

          // Add enough XP to reach level 1 (requires 100 XP)
          const result = await service.addBattlePassXP(playerId, 100);

          // Free rewards for level 1 should be included
          const freeRewardForLevel1 = season.battlePassTiers[0].freeRewards;
          const hasAllFreeRewards = freeRewardForLevel1.every(expected =>
            result.unlockedRewards.some(r => r.type === expected.type && r.quantity === expected.quantity)
          );
          return hasAllFreeRewards;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('paid track rewards are only unlocked when player has paid pass', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          hasPaidPass: fc.boolean(),
        }),
        async ({ playerId, hasPaidPass }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          const season = makeSeason();
          db.addData('seasons', season.id, season);
          db.addData('players', playerId, makePlayer(playerId));

          // Set up battle pass progress with paid/free status
          db.addData('battle_pass_progress', `${playerId}_${season.id}`, {
            playerId,
            seasonId: season.id,
            level: 0,
            currentXP: 0,
            hasPaidPass,
            unlockedTiers: [],
          });

          const result = await service.addBattlePassXP(playerId, 100);

          const paidRewardsForLevel1 = season.battlePassTiers[0].paidRewards;
          const hasPaidRewards = paidRewardsForLevel1.every(expected =>
            result.unlockedRewards.some(r => r.type === expected.type && r.quantity === expected.quantity)
          );

          if (hasPaidPass) {
            return hasPaidRewards;
          } else {
            return !hasPaidRewards;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('battle pass level never decreases when XP is added', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          xp1: fc.integer({ min: 0, max: 500 }),
          xp2: fc.integer({ min: 0, max: 500 }),
        }),
        async ({ playerId, xp1, xp2 }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          const season = makeSeason();
          db.addData('seasons', season.id, season);
          db.addData('players', playerId, makePlayer(playerId));

          const result1 = await service.addBattlePassXP(playerId, xp1);
          const result2 = await service.addBattlePassXP(playerId, xp2);

          return result2.newLevel >= result1.newLevel;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 30: Login streak tracking
// **Validates: Requirements 8.1, 8.2**
// ---------------------------------------------------------------------------
describe('Property 30: Login streak tracking', () => {
  /**
   * For any player login sequence, consecutive daily logins should increment
   * the streak counter, and missing a day should reset the streak to zero.
   *
   * Validates: Requirements 8.1, 8.2
   */
  it('first login sets streak to 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          db.addData('players', playerId, makePlayer(playerId, {
            consecutiveLoginDays: 0,
            lastLoginDate: '',
          }));

          const result = await service.claimLoginReward(playerId);
          return result.newStreak === 1 && !result.alreadyClaimed;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('consecutive login increments streak', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          currentStreak: fc.integer({ min: 1, max: 30 }),
        }),
        async ({ playerId, currentStreak }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const yesterday = new Date();
          yesterday.setUTCDate(yesterday.getUTCDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          db.addData('players', playerId, makePlayer(playerId, {
            consecutiveLoginDays: currentStreak,
            lastLoginDate: yesterdayStr,
          }));

          const result = await service.claimLoginReward(playerId);
          return result.newStreak === currentStreak + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('missing a day resets streak to 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          currentStreak: fc.integer({ min: 1, max: 30 }),
          daysAgo: fc.integer({ min: 2, max: 30 }),
        }),
        async ({ playerId, currentStreak, daysAgo }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const pastDate = new Date();
          pastDate.setUTCDate(pastDate.getUTCDate() - daysAgo);
          const pastDateStr = pastDate.toISOString().split('T')[0];

          db.addData('players', playerId, makePlayer(playerId, {
            consecutiveLoginDays: currentStreak,
            lastLoginDate: pastDateStr,
          }));

          const result = await service.claimLoginReward(playerId);
          return result.newStreak === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('claiming twice on the same day returns alreadyClaimed=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);
          const todayStr = new Date().toISOString().split('T')[0];

          db.addData('players', playerId, makePlayer(playerId, {
            consecutiveLoginDays: 1,
            lastLoginDate: todayStr,
            lastLoginRewardDate: todayStr,
          }));

          const result = await service.claimLoginReward(playerId);
          return result.alreadyClaimed === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('login reward value increases with streak', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          streak1: fc.integer({ min: 1, max: 10 }),
          streak2: fc.integer({ min: 11, max: 20 }),
        }),
        async ({ playerId, streak1, streak2 }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          // Simulate reward calculation for two different streaks
          const reward1 = (service as any).calculateLoginReward(streak1);
          const reward2 = (service as any).calculateLoginReward(streak2);

          return reward2.quantity >= reward1.quantity;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 31: Return reward eligibility
// **Validates: Requirements 8.7**
// ---------------------------------------------------------------------------
describe('Property 31: Return reward eligibility', () => {
  /**
   * For any player who has been inactive for 7 or more consecutive days,
   * logging in should grant return rewards including free card packs.
   *
   * Validates: Requirements 8.7
   */
  it('players inactive for 7+ days qualify for return rewards', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          daysInactive: fc.integer({ min: 7, max: 365 }),
        }),
        async ({ playerId, daysInactive }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const lastActive = new Date();
          lastActive.setUTCDate(lastActive.getUTCDate() - daysInactive);

          db.addData('players', playerId, makePlayer(playerId, {
            lastActiveAt: lastActive.toISOString(),
            softCurrency: 0,
            hardCurrency: 0,
          }));

          const result = await service.checkReturnReward(playerId);
          return result.qualifies === true && result.rewards.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('players inactive for less than 7 days do not qualify', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          daysInactive: fc.integer({ min: 0, max: 6 }),
        }),
        async ({ playerId, daysInactive }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const lastActive = new Date();
          lastActive.setUTCDate(lastActive.getUTCDate() - daysInactive);

          db.addData('players', playerId, makePlayer(playerId, {
            lastActiveAt: lastActive.toISOString(),
          }));

          const result = await service.checkReturnReward(playerId);
          return result.qualifies === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('return rewards include free card packs', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const lastActive = new Date();
          lastActive.setUTCDate(lastActive.getUTCDate() - 10);

          db.addData('players', playerId, makePlayer(playerId, {
            lastActiveAt: lastActive.toISOString(),
            softCurrency: 0,
            hardCurrency: 0,
          }));

          const result = await service.checkReturnReward(playerId);
          const hasPackReward = result.rewards.some(r => r.type === 'pack' && r.quantity > 0);
          return result.qualifies && hasPackReward;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 32: Season content availability
// **Validates: Requirements 7.7**
// ---------------------------------------------------------------------------
describe('Property 32: Season content availability', () => {
  /**
   * For any season-exclusive card, it should be obtainable only during that
   * season's active period and unavailable after the season ends.
   *
   * Validates: Requirements 7.7
   */
  it('exclusive content is available during active season', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contentId: nonEmptyId,
          contentType: fc.constantFrom('card', 'pack') as fc.Arbitrary<'card' | 'pack'>,
        }),
        async ({ contentId, contentType }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const now = new Date();
          const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

          const season: Season = {
            id: 'active_season',
            name: 'Active Season',
            theme: 'test',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            exclusiveCardTemplates: contentType === 'card' ? [contentId] : [],
            exclusivePacks: contentType === 'pack' ? [contentId] : [],
            battlePassTiers: [],
            scheduledEvents: [],
          };
          db.addData('seasons', season.id, season);

          const available = await service.isSeasonContentAvailable(contentId, contentType);
          return available === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('exclusive content is unavailable after season ends', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contentId: nonEmptyId,
          contentType: fc.constantFrom('card', 'pack') as fc.Arbitrary<'card' | 'pack'>,
          daysAgo: fc.integer({ min: 1, max: 365 }),
        }),
        async ({ contentId, contentType, daysAgo }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const now = new Date();
          const end = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

          const season: Season = {
            id: 'past_season',
            name: 'Past Season',
            theme: 'test',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            exclusiveCardTemplates: contentType === 'card' ? [contentId] : [],
            exclusivePacks: contentType === 'pack' ? [contentId] : [],
            battlePassTiers: [],
            scheduledEvents: [],
          };
          db.addData('seasons', season.id, season);

          const available = await service.isSeasonContentAvailable(contentId, contentType);
          return available === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('exclusive content is unavailable before season starts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contentId: nonEmptyId,
          contentType: fc.constantFrom('card', 'pack') as fc.Arbitrary<'card' | 'pack'>,
          daysUntilStart: fc.integer({ min: 1, max: 365 }),
        }),
        async ({ contentId, contentType, daysUntilStart }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          const now = new Date();
          const start = new Date(now.getTime() + daysUntilStart * 24 * 60 * 60 * 1000);
          const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);

          const season: Season = {
            id: 'future_season',
            name: 'Future Season',
            theme: 'test',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            exclusiveCardTemplates: contentType === 'card' ? [contentId] : [],
            exclusivePacks: contentType === 'pack' ? [contentId] : [],
            battlePassTiers: [],
            scheduledEvents: [],
          };
          db.addData('seasons', season.id, season);

          const available = await service.isSeasonContentAvailable(contentId, contentType);
          return available === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-exclusive content is not found in any season', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          contentId: nonEmptyId,
          contentType: fc.constantFrom('card', 'pack') as fc.Arbitrary<'card' | 'pack'>,
        }),
        async ({ contentId, contentType }) => {
          const db = buildDb();
          const service = new SeasonService(db as any as Firestore);

          // Active season but with different content
          const season = makeSeason({ id: 'season_other' });
          db.addData('seasons', season.id, season);

          // contentId is not in the season's exclusive lists
          const available = await service.isSeasonContentAvailable(
            `nonexistent_${contentId}`,
            contentType
          );
          return available === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
