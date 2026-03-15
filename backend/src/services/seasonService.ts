import { Firestore } from 'firebase-admin/firestore';
import {
  Season,
  Mission,
  Reward,
  BattlePassProgress,
  LoginStreakData,
} from '../../../shared/src/types/season';

/**
 * Service for managing the Season System
 *
 * Handles:
 * - Seasonal content cycles (Req 7.1, 7.2, 7.3)
 * - Battle pass progression and reward unlocking (Req 7.3, 7.4, 7.5, 7.6)
 * - Daily/weekly mission generation (Req 8.3, 8.4)
 * - Login streak tracking and rewards (Req 8.1, 8.2)
 * - Return rewards for inactive players (Req 8.7)
 * - Season content availability (Req 7.7, 7.8)
 */
export class SeasonService {
  private db: Firestore;
  private seasonsCollection: FirebaseFirestore.CollectionReference;
  private playersCollection: FirebaseFirestore.CollectionReference;
  private playerMissionsCollection: FirebaseFirestore.CollectionReference;
  private battlePassCollection: FirebaseFirestore.CollectionReference;

  constructor(db: Firestore) {
    this.db = db;
    this.seasonsCollection = db.collection('seasons');
    this.playersCollection = db.collection('players');
    this.playerMissionsCollection = db.collection('player_missions');
    this.battlePassCollection = db.collection('battle_pass_progress');
  }

  // ---------------------------------------------------------------------------
  // Season management
  // ---------------------------------------------------------------------------

  /**
   * Returns the currently active season based on the current date.
   * Req 7.1: New season every 3 months
   */
  async getCurrentSeason(): Promise<Season | null> {
    const now = new Date().toISOString();
    const snap = await this.seasonsCollection
      .where('startDate', '<=', now)
      .where('endDate', '>=', now)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].data() as Season;
  }

  /**
   * Checks if season-exclusive content is currently available.
   * Req 7.7: Season-exclusive cards unavailable after season ends
   */
  async isSeasonContentAvailable(contentId: string, contentType: 'card' | 'pack'): Promise<boolean> {
    const now = new Date().toISOString();
    const snap = await this.seasonsCollection.get();

    for (const doc of snap.docs) {
      const season = doc.data() as Season;
      const isActive = season.startDate <= now && season.endDate >= now;
      if (!isActive) continue;

      if (contentType === 'card' && season.exclusiveCardTemplates.includes(contentId)) {
        return true;
      }
      if (contentType === 'pack' && season.exclusivePacks.includes(contentId)) {
        return true;
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Battle pass progression
  // ---------------------------------------------------------------------------

  /**
   * Returns the player's current battle pass progress.
   * Req 7.3: Battle pass with free and paid tracks
   */
  async getBattlePassProgress(playerId: string): Promise<BattlePassProgress | null> {
    const season = await this.getCurrentSeason();
    if (!season) return null;

    const doc = await this.battlePassCollection.doc(`${playerId}_${season.id}`).get();
    if (!doc.exists) {
      // Return default progress
      return {
        playerId,
        seasonId: season.id,
        level: 0,
        currentXP: 0,
        hasPaidPass: false,
        unlockedTiers: [],
      };
    }
    return doc.data() as BattlePassProgress;
  }

  /**
   * Adds XP to the player's battle pass and unlocks rewards on level up.
   * Req 7.4, 7.5: Daily/weekly missions grant battle pass XP
   * Req 7.6: Battle pass level increases unlock rewards
   */
  async addBattlePassXP(playerId: string, xp: number): Promise<{
    newLevel: number;
    newXP: number;
    unlockedRewards: Reward[];
  }> {
    const season = await this.getCurrentSeason();
    if (!season) {
      return { newLevel: 0, newXP: 0, unlockedRewards: [] };
    }

    const progressRef = this.battlePassCollection.doc(`${playerId}_${season.id}`);
    const progressDoc = await progressRef.get();

    let progress: BattlePassProgress = progressDoc.exists
      ? (progressDoc.data() as BattlePassProgress)
      : {
          playerId,
          seasonId: season.id,
          level: 0,
          currentXP: 0,
          hasPaidPass: false,
          unlockedTiers: [],
        };

    const previousLevel = progress.level;
    let totalXP = progress.currentXP + xp;
    let currentLevel = progress.level;
    const unlockedRewards: Reward[] = [];

    // Process level-ups
    const tiers = season.battlePassTiers.sort((a, b) => a.level - b.level);
    for (const tier of tiers) {
      if (tier.level <= currentLevel) continue;
      if (totalXP >= tier.xpRequired) {
        currentLevel = tier.level;
        // Collect rewards for this tier
        unlockedRewards.push(...tier.freeRewards);
        if (progress.hasPaidPass) {
          unlockedRewards.push(...tier.paidRewards);
        }
      } else {
        break;
      }
    }

    const newUnlockedTiers = [...progress.unlockedTiers];
    for (let lvl = previousLevel + 1; lvl <= currentLevel; lvl++) {
      if (!newUnlockedTiers.includes(lvl)) {
        newUnlockedTiers.push(lvl);
      }
    }

    const updatedProgress: BattlePassProgress = {
      ...progress,
      level: currentLevel,
      currentXP: totalXP,
      unlockedTiers: newUnlockedTiers,
    };

    await progressRef.set(updatedProgress);

    // Grant rewards to player
    if (unlockedRewards.length > 0) {
      await this.grantRewards(playerId, unlockedRewards);
    }

    return { newLevel: currentLevel, newXP: totalXP, unlockedRewards };
  }

  // ---------------------------------------------------------------------------
  // Mission generation
  // ---------------------------------------------------------------------------

  private readonly DAILY_MISSION_TEMPLATES = [
    { name: 'Card Collector', description: 'Draw 3 cards today', objective: { type: 'draw_cards', target: 3 }, battlePassXP: 50 },
    { name: 'Synthesis Apprentice', description: 'Attempt 2 syntheses', objective: { type: 'synthesize', target: 2 }, battlePassXP: 60 },
    { name: 'Market Visitor', description: 'Browse the market', objective: { type: 'browse_market', target: 1 }, battlePassXP: 30 },
    { name: 'Social Butterfly', description: 'Like a friend\'s gallery', objective: { type: 'like_gallery', target: 1 }, battlePassXP: 40 },
    { name: 'Lucky Trader', description: 'List a card for sale', objective: { type: 'list_card', target: 1 }, battlePassXP: 45 },
    { name: 'Daily Login', description: 'Log in today', objective: { type: 'login', target: 1 }, battlePassXP: 20 },
  ];

  private readonly WEEKLY_MISSION_TEMPLATES = [
    { name: 'Avid Collector', description: 'Draw 20 cards this week', objective: { type: 'draw_cards', target: 20 }, battlePassXP: 300 },
    { name: 'Master Synthesizer', description: 'Complete 10 syntheses', objective: { type: 'synthesize', target: 10 }, battlePassXP: 400 },
    { name: 'Market Mogul', description: 'Complete 3 market trades', objective: { type: 'trade', target: 3 }, battlePassXP: 350 },
    { name: 'Social Star', description: 'Receive 5 gallery likes', objective: { type: 'receive_likes', target: 5 }, battlePassXP: 250 },
    { name: 'Event Hunter', description: 'Trigger 3 random events', objective: { type: 'trigger_events', target: 3 }, battlePassXP: 500 },
    { name: 'Legendary Seeker', description: 'Draw 1 legendary card', objective: { type: 'draw_legendary', target: 1 }, battlePassXP: 600 },
  ];

  /**
   * Generates exactly 3 daily missions for a player.
   * Req 8.3: Generate 3 daily missions at midnight UTC
   */
  async generateDailyMissions(playerId: string): Promise<Mission[]> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const availableFrom = todayStart.toISOString();
    const expiresAt = tomorrowStart.toISOString();

    // Select 3 templates deterministically based on date
    const dayOfYear = Math.floor(todayStart.getTime() / (24 * 60 * 60 * 1000));
    const missions: Mission[] = [];

    for (let i = 0; i < 3; i++) {
      const templateIndex = (dayOfYear + i) % this.DAILY_MISSION_TEMPLATES.length;
      const template = this.DAILY_MISSION_TEMPLATES[templateIndex];
      const missionId = `daily_${playerId}_${todayStart.toISOString().split('T')[0]}_${i}`;

      const mission: Mission = {
        id: missionId,
        type: 'daily',
        name: template.name,
        description: template.description,
        objective: template.objective,
        rewards: [{ type: 'soft_currency', quantity: 100 + i * 50 }],
        battlePassXP: template.battlePassXP,
        progress: 0,
        completed: false,
        claimed: false,
        availableFrom,
        expiresAt,
      };

      missions.push(mission);

      // Persist to player missions
      await this.db
        .collection('player_missions')
        .doc(playerId)
        .collection('missions')
        .doc(missionId)
        .set(mission, { merge: true });
    }

    return missions;
  }

  /**
   * Generates exactly 3 weekly missions for a player.
   * Req 8.4: Generate 3 weekly missions at week start
   */
  async generateWeeklyMissions(playerId: string): Promise<Mission[]> {
    const now = new Date();
    // Week starts on Monday UTC
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToMonday
    ));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const availableFrom = weekStart.toISOString();
    const expiresAt = weekEnd.toISOString();

    const weekNumber = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
    const missions: Mission[] = [];

    for (let i = 0; i < 3; i++) {
      const templateIndex = (weekNumber + i) % this.WEEKLY_MISSION_TEMPLATES.length;
      const template = this.WEEKLY_MISSION_TEMPLATES[templateIndex];
      const missionId = `weekly_${playerId}_${weekStart.toISOString().split('T')[0]}_${i}`;

      const mission: Mission = {
        id: missionId,
        type: 'weekly',
        name: template.name,
        description: template.description,
        objective: template.objective,
        rewards: [{ type: 'soft_currency', quantity: 500 + i * 200 }],
        battlePassXP: template.battlePassXP,
        progress: 0,
        completed: false,
        claimed: false,
        availableFrom,
        expiresAt,
      };

      missions.push(mission);

      await this.db
        .collection('player_missions')
        .doc(playerId)
        .collection('missions')
        .doc(missionId)
        .set(mission, { merge: true });
    }

    return missions;
  }

  // ---------------------------------------------------------------------------
  // Login streak tracking
  // ---------------------------------------------------------------------------

  /**
   * Claims the daily login reward and updates the streak.
   * Req 8.1: Daily login rewards with increasing value for consecutive days
   * Req 8.2: Reset streak if player misses a day
   */
  async claimLoginReward(playerId: string): Promise<{
    reward: Reward;
    newStreak: number;
    alreadyClaimed: boolean;
  }> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const playerRef = this.playersCollection.doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) {
      throw new Error(`Player ${playerId} not found`);
    }

    const player = playerDoc.data() as any;
    const lastLoginDate: string = player.lastLoginDate || '';
    const consecutiveDays: number = player.consecutiveLoginDays || 0;
    const lastClaimedDate: string = player.lastLoginRewardDate || '';

    // Already claimed today
    if (lastClaimedDate === todayStr) {
      const reward: Reward = { type: 'soft_currency', quantity: 0 };
      return { reward, newStreak: consecutiveDays, alreadyClaimed: true };
    }

    // Calculate new streak
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak: number;
    if (lastLoginDate === yesterdayStr) {
      newStreak = consecutiveDays + 1;
    } else if (lastLoginDate === todayStr) {
      newStreak = consecutiveDays;
    } else {
      newStreak = 1;
    }

    // Calculate reward based on streak (increasing value)
    const reward: Reward = this.calculateLoginReward(newStreak);

    // Update player
    await playerRef.update({
      consecutiveLoginDays: newStreak,
      lastLoginDate: todayStr,
      lastLoginRewardDate: todayStr,
      lastActiveAt: now.toISOString(),
    });

    // Grant reward
    await this.grantRewards(playerId, [reward]);

    return { reward, newStreak, alreadyClaimed: false };
  }

  private calculateLoginReward(streak: number): Reward {
    // Increasing value for consecutive days
    const baseAmount = 50;
    const bonusPerDay = 25;
    const maxBonus = 500;
    const quantity = Math.min(baseAmount + (streak - 1) * bonusPerDay, maxBonus);
    return { type: 'soft_currency', quantity };
  }

  // ---------------------------------------------------------------------------
  // Return reward system
  // ---------------------------------------------------------------------------

  /**
   * Checks if a player qualifies for return rewards (7+ days inactive).
   * Req 8.7: Return rewards for players inactive 7+ days
   */
  async checkReturnReward(playerId: string): Promise<{
    qualifies: boolean;
    daysInactive: number;
    rewards: Reward[];
  }> {
    const playerDoc = await this.playersCollection.doc(playerId).get();

    if (!playerDoc.exists) {
      return { qualifies: false, daysInactive: 0, rewards: [] };
    }

    const player = playerDoc.data() as any;
    const lastActiveAt: string = player.lastActiveAt || player.createdAt || new Date().toISOString();

    const now = new Date();
    const lastActive = new Date(lastActiveAt);
    const diffMs = now.getTime() - lastActive.getTime();
    const daysInactive = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (daysInactive < 7) {
      return { qualifies: false, daysInactive, rewards: [] };
    }

    // Check if return reward was already claimed recently
    const lastReturnRewardDate: string = player.lastReturnRewardDate || '';
    if (lastReturnRewardDate) {
      const lastRewardDate = new Date(lastReturnRewardDate);
      const daysSinceReward = Math.floor((now.getTime() - lastRewardDate.getTime()) / (24 * 60 * 60 * 1000));
      if (daysSinceReward < 7) {
        return { qualifies: false, daysInactive, rewards: [] };
      }
    }

    // Return rewards: free card packs + soft currency
    const rewards: Reward[] = [
      { type: 'pack', itemId: 'basic_pack', quantity: 3 },
      { type: 'soft_currency', quantity: 500 },
    ];

    // Grant rewards and update player
    await this.grantRewards(playerId, rewards);
    await this.playersCollection.doc(playerId).update({
      lastReturnRewardDate: now.toISOString(),
      lastActiveAt: now.toISOString(),
    });

    return { qualifies: true, daysInactive, rewards };
  }

  // ---------------------------------------------------------------------------
  // Mission claiming
  // ---------------------------------------------------------------------------

  /**
   * Claims a completed mission reward for a player.
   * Req 8.5: Players can claim rewards for completed missions
   * Req 8.6: Claimed missions grant battle pass XP
   */
  async claimMission(playerId: string, missionId: string): Promise<{
    rewards: Reward[];
    newBattlePassXP: number;
  }> {
    const missionRef = this.db
      .collection('player_missions')
      .doc(playerId)
      .collection('missions')
      .doc(missionId);

    const missionDoc = await missionRef.get();
    if (!missionDoc.exists) {
      throw new Error(`Mission ${missionId} not found`);
    }

    const mission = missionDoc.data() as Mission;

    if (!mission.completed) {
      throw new Error('Mission is not yet completed');
    }
    if (mission.claimed) {
      throw new Error('Mission rewards already claimed');
    }

    // Mark as claimed
    await missionRef.update({ claimed: true });

    // Grant rewards
    await this.grantRewards(playerId, mission.rewards);

    // Add battle pass XP
    const { newXP } = await this.addBattlePassXP(playerId, mission.battlePassXP);

    return { rewards: mission.rewards, newBattlePassXP: newXP };
  }

  // ---------------------------------------------------------------------------
  // Mission progress tracking
  // ---------------------------------------------------------------------------

  /**
   * Tracks player action progress against active missions.
   * Req 8.3, 8.4: Daily/weekly missions track player actions
   */
  async trackMissionProgress(
    playerId: string,
    actionType: string,
    params: Record<string, any> = {}
  ): Promise<void> {
    const now = new Date().toISOString();

    // Map action types to mission objective types
    const objectiveTypeMap: Record<string, string[]> = {
      card_draw: ['draw_cards', 'draw_legendary'],
      card_synthesis: ['synthesize'],
      browse_market: ['browse_market'],
      list_card: ['list_card'],
      trade: ['trade'],
      like_gallery: ['like_gallery'],
      receive_likes: ['receive_likes'],
      trigger_events: ['trigger_events'],
      login: ['login'],
    };

    const matchingObjectiveTypes = objectiveTypeMap[actionType] || [actionType];

    // Get all active (non-expired, non-claimed) missions for the player
    const missionsSnap = await this.db
      .collection('player_missions')
      .doc(playerId)
      .collection('missions')
      .where('expiresAt', '>=', now)
      .where('claimed', '==', false)
      .get();

    if (missionsSnap.empty) return;

    const batch = this.db.batch();
    let hasUpdates = false;

    for (const doc of missionsSnap.docs) {
      const mission = doc.data() as Mission;

      if (mission.completed) continue;
      if (!matchingObjectiveTypes.includes(mission.objective.type)) continue;

      // Determine increment amount
      let increment = 1;
      if (actionType === 'card_draw' && mission.objective.type === 'draw_cards') {
        increment = params.quantity ?? 1;
      } else if (actionType === 'card_draw' && mission.objective.type === 'draw_legendary') {
        // Only count if a legendary was drawn — caller should pass { legendary: true }
        increment = params.legendary ? 1 : 0;
      }

      if (increment === 0) continue;

      const currentProgress = mission.progress ?? 0;
      const newProgress = Math.min(currentProgress + increment, mission.objective.target);
      const completed = newProgress >= mission.objective.target;

      batch.update(doc.ref, { progress: newProgress, completed });
      hasUpdates = true;
    }

    if (hasUpdates) {
      await batch.commit();
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async grantRewards(playerId: string, rewards: Reward[]): Promise<void> {
    const playerRef = this.playersCollection.doc(playerId);

    await this.db.runTransaction(async (transaction) => {
      const playerDoc = await transaction.get(playerRef);
      if (!playerDoc.exists) throw new Error(`Player ${playerId} not found`);

      const player = playerDoc.data() as any;
      const updates: Record<string, any> = {};

      for (const reward of rewards) {
        if (reward.type === 'soft_currency') {
          updates.softCurrency = (updates.softCurrency ?? player.softCurrency ?? 0) + reward.quantity;
        } else if (reward.type === 'hard_currency') {
          updates.hardCurrency = (updates.hardCurrency ?? player.hardCurrency ?? 0) + reward.quantity;
        }
        // Pack and card rewards would be handled by their respective services
      }

      if (Object.keys(updates).length > 0) {
        transaction.update(playerRef, updates);
      }
    });
  }
}
