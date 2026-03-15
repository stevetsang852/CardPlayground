import { AchievementService } from './achievementService';
import { Firestore } from 'firebase-admin/firestore';
import { Achievement, PlayerAchievementProgress } from '../../../shared/src/types/achievement';
import fc from 'fast-check';

/**
 * Property-based tests for AchievementService
 *
 * Feature: card-mystery-realm
 */

// ---------------------------------------------------------------------------
// MockFirestore (mirrors the pattern from socialService.property.test.ts)
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
    const self = this;

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
        // Only direct children (no deeper nesting)
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

  count() {
    return {
      get: async () => {
        const result = await this.get();
        return { data: () => ({ count: result.docs.length }) };
      },
    };
  }

  async runTransaction(fn: (tx: any) => Promise<void>) {
    const dataStore = this.data;
    const tx = {
      get: async (docRef: any) => {
        const key = `${docRef._collection}/${docRef._id}`;
        const d = dataStore.get(key);
        return { exists: !!d, data: () => d, id: docRef._id };
      },
      update: (docRef: any, updates: any) => {
        const key = `${docRef._collection}/${docRef._id}`;
        const existing = dataStore.get(key) || {};
        dataStore.set(key, { ...existing, ...updates });
      },
      set: (docRef: any, d: any, _opts?: any) => {
        const key = `${docRef._collection}/${docRef._id}`;
        const existing = dataStore.get(key) || {};
        dataStore.set(key, { ...existing, ...d });
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

  // Test helpers
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
// Helpers to build a MockFirestore with a transaction that resolves doc refs
// ---------------------------------------------------------------------------
function buildDb(): MockFirestore {
  return new MockFirestore();
}

/**
 * Patch the db so runTransaction can resolve doc refs produced by
 * db.collection(...).doc(...) — we attach _collection and _id to the ref.
 */
function patchDocRef(db: MockFirestore) {
  const origCollection = db.collection.bind(db);
  // We rely on the fact that MockFirestore.doc() returns a plain object;
  // we just need to ensure the transaction helper can find the right key.
  // The simplest approach: override runTransaction to use the data map directly.
  (db as any).runTransaction = async (fn: (tx: any) => Promise<void>) => {
    const dataStore = (db as any).data as Map<string, any>;
    const tx = {
      get: async (docRef: any) => {
        // docRef has .id; we search for any key ending with /<id>
        let found: any = null;
        let foundKey = '';
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            found = value;
            foundKey = key;
            break;
          }
        }
        return { exists: !!found, data: () => found, id: docRef.id, _key: foundKey };
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
        // If not found, create it
        dataStore.set(`unknown/${docRef.id}`, d);
      },
    };
    await fn(tx);
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyId = fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

const achievementRequirementArb = fc.oneof(
  fc.record({
    type: fc.constant('legendary_count' as const),
    target: fc.integer({ min: 1, max: 20 }),
  }),
  fc.record({
    type: fc.constant('gallery_likes' as const),
    target: fc.integer({ min: 1, max: 1000 }),
  }),
  fc.record({
    type: fc.constant('merchant_streak' as const),
    target: fc.integer({ min: 1, max: 10 }),
  })
);

const achievementArb = fc.record({
  id: nonEmptyId,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  category: fc.constantFrom('collection', 'rarity', 'social', 'random', 'secret') as fc.Arbitrary<Achievement['category']>,
  requirement: achievementRequirementArb,
  rewards: fc.record({
    softCurrency: fc.integer({ min: 0, max: 10000 }),
    hardCurrency: fc.integer({ min: 0, max: 100 }),
  }),
  iconUrl: fc.constant('https://example.com/icon.png'),
  isSecret: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 24: Achievement unlock conditions
// **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
// ---------------------------------------------------------------------------
describe('Property 24: Achievement unlock conditions', () => {
  /**
   * For any achievement with defined unlock conditions, when a player meets
   * those conditions, the achievement should be unlocked and rewards granted.
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4
   */
  it('validateAndUnlock returns true when player meets requirement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          achievement: achievementArb,
          initialSoftCurrency: fc.integer({ min: 0, max: 100_000 }),
        }),
        async ({ playerId, achievement, initialSoftCurrency }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          // Seed achievement definition
          db.addData('achievements', achievement.id, achievement);

          // Seed player
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: initialSoftCurrency,
            hardCurrency: 0,
            cards: [],
          });

          // Seed the player's current value to meet the requirement
          const { type, target } = achievement.requirement;
          if (type === 'legendary_count') {
            for (let i = 0; i < target; i++) {
              db.addData('cards', `${playerId}_leg_${i}`, {
                playerId,
                rarity: 'legendary',
              });
            }
          } else if (type === 'gallery_likes') {
            db.addData('galleries', playerId, { playerId, totalLikes: target });
          } else if (type === 'merchant_streak') {
            db.addData('players', playerId, {
              id: playerId,
              softCurrency: initialSoftCurrency,
              hardCurrency: 0,
              cards: [],
              merchantStreak: target,
            });
          }

          const result = await service.validateAndUnlock(playerId, achievement.id);
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateAndUnlock returns false when player does not meet requirement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          achievement: achievementArb.filter(a => a.requirement.target > 1),
        }),
        async ({ playerId, achievement }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
            merchantStreak: 0,
          });
          // Do NOT seed enough data to meet the requirement

          const result = await service.validateAndUnlock(playerId, achievement.id);
          return result === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rewards are granted when achievement is unlocked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          softReward: fc.integer({ min: 1, max: 5000 }),
          hardReward: fc.integer({ min: 0, max: 50 }),
          initialSoft: fc.integer({ min: 0, max: 100_000 }),
          initialHard: fc.integer({ min: 0, max: 1000 }),
        }),
        async ({ playerId, softReward, hardReward, initialSoft, initialHard }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          const achievement: Achievement = {
            id: 'ach_reward_test',
            name: 'Test',
            description: 'Test',
            category: 'rarity',
            requirement: { type: 'legendary_count', target: 1 },
            rewards: { softCurrency: softReward, hardCurrency: hardReward },
            iconUrl: '',
            isSecret: false,
          };

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: initialSoft,
            hardCurrency: initialHard,
            cards: [],
          });
          // Meet requirement: 1 legendary card
          db.addData('cards', `${playerId}_leg_0`, { playerId, rarity: 'legendary' });

          await service.validateAndUnlock(playerId, achievement.id);

          const playerAfter = db.getData('players', playerId);
          const softOk = playerAfter.softCurrency === initialSoft + softReward;
          const hardOk = playerAfter.hardCurrency === initialHard + hardReward;
          return softOk && hardOk;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: Achievement progress calculation
// **Validates: Requirements 6.5**
// ---------------------------------------------------------------------------
describe('Property 25: Achievement progress calculation', () => {
  /**
   * For any trackable achievement, the displayed progress percentage should
   * equal (current progress / target progress) × 100, clamped to [0, 100].
   *
   * Validates: Requirements 6.5
   */
  it('progress percentage is always between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          target: fc.integer({ min: 1, max: 100 }),
          current: fc.integer({ min: 0, max: 200 }),
        }),
        async ({ playerId, target, current }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          const achievement: Achievement = {
            id: 'ach_progress_test',
            name: 'Progress Test',
            description: 'Test',
            category: 'rarity',
            requirement: { type: 'legendary_count', target },
            rewards: {},
            iconUrl: '',
            isSecret: false,
          };

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });

          // Seed `current` legendary cards
          for (let i = 0; i < current; i++) {
            db.addData('cards', `${playerId}_leg_${i}`, { playerId, rarity: 'legendary' });
          }

          const progress = await service.getAchievementProgress(playerId, achievement.id);
          return progress >= 0 && progress <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('progress percentage equals (current / target) * 100 when current < target', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          target: fc.integer({ min: 2, max: 50 }),
          current: fc.integer({ min: 0, max: 49 }),
        }).filter(({ current, target }) => current < target),
        async ({ playerId, target, current }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          const achievement: Achievement = {
            id: 'ach_pct_test',
            name: 'Pct Test',
            description: 'Test',
            category: 'rarity',
            requirement: { type: 'legendary_count', target },
            rewards: {},
            iconUrl: '',
            isSecret: false,
          };

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });

          for (let i = 0; i < current; i++) {
            db.addData('cards', `${playerId}_leg_${i}`, { playerId, rarity: 'legendary' });
          }

          const progress = await service.getAchievementProgress(playerId, achievement.id);
          const expected = (current / target) * 100;
          return Math.abs(progress - expected) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('progress is 100 when achievement is already unlocked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          target: fc.integer({ min: 1, max: 20 }),
        }),
        async ({ playerId, target }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          const achievement: Achievement = {
            id: 'ach_unlocked_test',
            name: 'Unlocked Test',
            description: 'Test',
            category: 'rarity',
            requirement: { type: 'legendary_count', target },
            rewards: {},
            iconUrl: '',
            isSecret: false,
          };

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });

          // Seed player progress as already unlocked
          const progressRecord: PlayerAchievementProgress = {
            achievementId: achievement.id,
            playerId,
            progress: target,
            unlocked: true,
            unlockedAt: new Date().toISOString(),
          };
          db.addData(
            `player_achievements/${playerId}/achievements`,
            achievement.id,
            progressRecord
          );

          const progress = await service.getAchievementProgress(playerId, achievement.id);
          return progress === 100;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 26: Secret achievement condition hiding
// **Validates: Requirements 6.6**
// ---------------------------------------------------------------------------
describe('Property 26: Secret achievement condition hiding', () => {
  /**
   * For any secret achievement that is not yet unlocked, the specific unlock
   * conditions should not be visible to the player.
   *
   * Validates: Requirements 6.6
   */
  it('secret unlocked=false achievements have requirement hidden (null)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          achievement: achievementArb.map(a => ({ ...a, isSecret: true })),
        }),
        async ({ playerId, achievement }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });
          // No progress record → not unlocked

          const achievements = await service.getAchievements(playerId);
          const found = achievements.find(a => a.id === achievement.id);
          if (!found) return false;

          // Requirement must be null/hidden for secret + not unlocked
          return found.unlocked === false && (found as any).requirement === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('secret unlocked=true achievements have requirement visible', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          achievement: achievementArb.map(a => ({ ...a, isSecret: true })),
        }),
        async ({ playerId, achievement }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });

          // Mark as unlocked
          const progressRecord: PlayerAchievementProgress = {
            achievementId: achievement.id,
            playerId,
            progress: achievement.requirement.target,
            unlocked: true,
            unlockedAt: new Date().toISOString(),
          };
          db.addData(
            `player_achievements/${playerId}/achievements`,
            achievement.id,
            progressRecord
          );

          const achievements = await service.getAchievements(playerId);
          const found = achievements.find(a => a.id === achievement.id);
          if (!found) return false;

          // Requirement must be visible for unlocked secret achievements
          return found.unlocked === true && (found as any).requirement !== null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-secret achievements always have requirement visible regardless of unlock state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          achievement: achievementArb.map(a => ({ ...a, isSecret: false })),
          isUnlocked: fc.boolean(),
        }),
        async ({ playerId, achievement, isUnlocked }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });

          if (isUnlocked) {
            db.addData(
              `player_achievements/${playerId}/achievements`,
              achievement.id,
              {
                achievementId: achievement.id,
                playerId,
                progress: achievement.requirement.target,
                unlocked: true,
                unlockedAt: new Date().toISOString(),
              }
            );
          }

          const achievements = await service.getAchievements(playerId);
          const found = achievements.find(a => a.id === achievement.id);
          if (!found) return false;

          return (found as any).requirement !== null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 43: Server-side achievement validation
// **Validates: Requirements 12.8**
// ---------------------------------------------------------------------------
describe('Property 43: Server-side achievement validation', () => {
  /**
   * For any achievement unlock attempt, the server must validate that the
   * unlock conditions are genuinely met before granting the achievement.
   *
   * Validates: Requirements 12.8
   */
  it('validateAndUnlock only succeeds when player genuinely meets requirement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          target: fc.integer({ min: 1, max: 20 }),
          actual: fc.integer({ min: 0, max: 25 }),
        }),
        async ({ playerId, target, actual }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          const achievement: Achievement = {
            id: 'ach_validation_test',
            name: 'Validation Test',
            description: 'Test',
            category: 'rarity',
            requirement: { type: 'legendary_count', target },
            rewards: { softCurrency: 100 },
            iconUrl: '',
            isSecret: false,
          };

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });

          // Seed `actual` legendary cards
          for (let i = 0; i < actual; i++) {
            db.addData('cards', `${playerId}_leg_${i}`, { playerId, rarity: 'legendary' });
          }

          const result = await service.validateAndUnlock(playerId, achievement.id);
          const shouldSucceed = actual >= target;

          return result === shouldSucceed;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateAndUnlock cannot be called twice for the same achievement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          target: fc.integer({ min: 1, max: 10 }),
        }),
        async ({ playerId, target }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          const achievement: Achievement = {
            id: 'ach_double_test',
            name: 'Double Test',
            description: 'Test',
            category: 'rarity',
            requirement: { type: 'legendary_count', target },
            rewards: { softCurrency: 500 },
            iconUrl: '',
            isSecret: false,
          };

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: 0,
            hardCurrency: 0,
            cards: [],
          });

          // Meet requirement
          for (let i = 0; i < target; i++) {
            db.addData('cards', `${playerId}_leg_${i}`, { playerId, rarity: 'legendary' });
          }

          const first = await service.validateAndUnlock(playerId, achievement.id);
          const second = await service.validateAndUnlock(playerId, achievement.id);

          // First should succeed, second should fail (already unlocked)
          return first === true && second === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rewards are only granted once even if unlock is attempted multiple times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          softReward: fc.integer({ min: 1, max: 1000 }),
          initialSoft: fc.integer({ min: 0, max: 10_000 }),
        }),
        async ({ playerId, softReward, initialSoft }) => {
          const db = buildDb();
          patchDocRef(db);
          const service = new AchievementService(db as any as Firestore);

          const achievement: Achievement = {
            id: 'ach_once_test',
            name: 'Once Test',
            description: 'Test',
            category: 'rarity',
            requirement: { type: 'legendary_count', target: 1 },
            rewards: { softCurrency: softReward },
            iconUrl: '',
            isSecret: false,
          };

          db.addData('achievements', achievement.id, achievement);
          db.addData('players', playerId, {
            id: playerId,
            softCurrency: initialSoft,
            hardCurrency: 0,
            cards: [],
          });
          db.addData('cards', `${playerId}_leg_0`, { playerId, rarity: 'legendary' });

          await service.validateAndUnlock(playerId, achievement.id);
          await service.validateAndUnlock(playerId, achievement.id); // second attempt

          const playerAfter = db.getData('players', playerId);
          // Reward should only be granted once
          return playerAfter.softCurrency === initialSoft + softReward;
        }
      ),
      { numRuns: 100 }
    );
  });
});
