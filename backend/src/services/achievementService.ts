import { Firestore } from 'firebase-admin/firestore';
import {
  Achievement,
  AchievementRequirement,
  PlayerAchievementProgress,
} from '../../../shared/src/types/achievement';
import { Player } from '../../../shared/src/types/player';

/**
 * Service for managing the Achievement System
 *
 * Handles:
 * - Monitoring player actions and checking achievement conditions (Req 6.1–6.4)
 * - Progress calculation as a percentage (Req 6.5)
 * - Hiding secret achievement conditions until unlocked (Req 6.6)
 * - Distributing soft/hard currency and exclusive card rewards (Req 6.8, 11.8)
 * - Server-side validation before granting achievements (Req 12.8)
 */
export class AchievementService {
  private db: Firestore;
  private achievementsCollection: FirebaseFirestore.CollectionReference;
  private playersCollection: FirebaseFirestore.CollectionReference;
  private cardsCollection: FirebaseFirestore.CollectionReference;
  private galleriesCollection: FirebaseFirestore.CollectionReference;

  constructor(db: Firestore) {
    this.db = db;
    this.achievementsCollection = db.collection('achievements');
    this.playersCollection = db.collection('players');
    this.cardsCollection = db.collection('cards');
    this.galleriesCollection = db.collection('galleries');
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private playerAchievementsRef(playerId: string): FirebaseFirestore.CollectionReference {
    return this.db
      .collection('player_achievements')
      .doc(playerId)
      .collection('achievements');
  }

  /**
   * Load all achievement definitions.
   */
  private async loadAllAchievements(): Promise<Achievement[]> {
    const snap = await this.achievementsCollection.get();
    return snap.docs.map((d) => d.data() as Achievement);
  }

  /**
   * Load a single achievement definition.
   */
  private async loadAchievement(achievementId: string): Promise<Achievement | null> {
    const doc = await this.achievementsCollection.doc(achievementId).get();
    if (!doc.exists) return null;
    return doc.data() as Achievement;
  }

  /**
   * Load player progress for a single achievement.
   */
  private async loadPlayerProgress(
    playerId: string,
    achievementId: string
  ): Promise<PlayerAchievementProgress | null> {
    const doc = await this.playerAchievementsRef(playerId).doc(achievementId).get();
    if (!doc.exists) return null;
    return doc.data() as PlayerAchievementProgress;
  }

  /**
   * Persist player progress for an achievement.
   */
  private async savePlayerProgress(progress: PlayerAchievementProgress): Promise<void> {
    await this.playerAchievementsRef(progress.playerId)
      .doc(progress.achievementId)
      .set(progress, { merge: true });
  }

  // ---------------------------------------------------------------------------
  // Current value resolvers
  // ---------------------------------------------------------------------------

  /**
   * Compute the player's current value for a given requirement type.
   * Returns the raw count/number that is compared against requirement.target.
   */
  async getCurrentValue(
    playerId: string,
    requirement: AchievementRequirement
  ): Promise<number> {
    switch (requirement.type) {
      case 'complete_series': {
        // Req 6.1: player owns all cards in a series
        const seriesId = requirement.params?.seriesId as string | undefined;
        if (!seriesId) return 0;
        const allInSeries = requirement.params?.totalInSeries as number | undefined;
        if (!allInSeries) return 0;
        const snap = await this.cardsCollection
          .where('playerId', '==', playerId)
          .where('theme', '==', seriesId)
          .get();
        return snap.docs.length;
      }

      case 'legendary_count': {
        // Req 6.2: player owns N legendary cards
        const snap = await this.cardsCollection
          .where('playerId', '==', playerId)
          .where('rarity', '==', 'legendary')
          .get();
        return snap.docs.length;
      }

      case 'gallery_likes': {
        // Req 6.3: player's gallery has received N total likes
        const galleryDoc = await this.galleriesCollection.doc(playerId).get();
        if (!galleryDoc.exists) return 0;
        const gallery = galleryDoc.data() as any;
        return gallery.totalLikes ?? 0;
      }

      case 'merchant_streak': {
        // Req 6.4: player triggered Mysterious Merchant on N consecutive days
        const playerDoc = await this.playersCollection.doc(playerId).get();
        if (!playerDoc.exists) return 0;
        const player = playerDoc.data() as any;
        return player.merchantStreak ?? 0;
      }

      default:
        return 0;
    }
  }

  /**
   * Check whether a player currently meets an achievement's requirement.
   */
  async meetsRequirement(
    playerId: string,
    requirement: AchievementRequirement
  ): Promise<boolean> {
    const current = await this.getCurrentValue(playerId, requirement);
    return current >= requirement.target;
  }

  // ---------------------------------------------------------------------------
  // 16.2 – Achievement monitoring
  // ---------------------------------------------------------------------------

  /**
   * Check all achievements for a player after a game event and unlock any
   * that are now satisfied.
   *
   * @param playerId - The player who performed the action
   * @param eventType - The type of event (e.g. 'card_draw', 'gallery_like', 'merchant_trigger')
   * @param eventData - Additional event context
   * @returns List of newly unlocked achievements
   */
  async checkAndUnlockAchievements(
    playerId: string,
    eventType: string,
    eventData: Record<string, any> = {}
  ): Promise<Achievement[]> {
    const achievements = await this.loadAllAchievements();
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of achievements) {
      // Skip already-unlocked achievements
      const existing = await this.loadPlayerProgress(playerId, achievement.id);
      if (existing?.unlocked) continue;

      // Only check achievements relevant to this event type
      if (!this.isRelevantEvent(achievement.requirement.type, eventType)) continue;

      const qualifies = await this.meetsRequirement(playerId, achievement.requirement);
      if (qualifies) {
        const unlocked = await this.validateAndUnlock(playerId, achievement.id);
        if (unlocked) {
          newlyUnlocked.push({ ...achievement, unlocked: true });
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Determine whether an event type is relevant to a requirement type.
   */
  private isRelevantEvent(requirementType: string, eventType: string): boolean {
    const mapping: Record<string, string[]> = {
      complete_series: ['card_draw', 'card_trade', 'card_synthesis'],
      legendary_count: ['card_draw', 'card_trade', 'card_synthesis'],
      gallery_likes: ['gallery_like'],
      merchant_streak: ['merchant_trigger'],
    };
    const relevant = mapping[requirementType];
    if (!relevant) return true; // unknown types: always check
    return relevant.includes(eventType);
  }

  // ---------------------------------------------------------------------------
  // 16.2 – Get achievements with player progress
  // ---------------------------------------------------------------------------

  /**
   * Return all achievements enriched with the player's progress.
   * Secret achievements that are not yet unlocked have their requirement hidden.
   *
   * @param playerId - The player to query for
   * @returns Achievements with player-specific state
   */
  async getAchievements(playerId: string): Promise<Achievement[]> {
    const achievements = await this.loadAllAchievements();
    const result: Achievement[] = [];

    for (const achievement of achievements) {
      const playerProgress = await this.loadPlayerProgress(playerId, achievement.id);
      const unlocked = playerProgress?.unlocked ?? false;
      const rawProgress = playerProgress?.progress ?? 0;

      const enriched: Achievement = {
        ...achievement,
        unlocked,
        progress: rawProgress,
        unlockedAt: playerProgress?.unlockedAt,
      };

      // Req 6.6: hide requirement for secret achievements that are not yet unlocked
      if (achievement.isSecret && !unlocked) {
        (enriched as any).requirement = null;
      }

      result.push(enriched);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // 16.4 – Achievement progress calculation
  // ---------------------------------------------------------------------------

  /**
   * Return the progress percentage (0–100) for a specific achievement.
   *
   * @param playerId - The player to query
   * @param achievementId - The achievement to check
   * @returns Progress percentage clamped to [0, 100]
   */
  async getAchievementProgress(playerId: string, achievementId: string): Promise<number> {
    const achievement = await this.loadAchievement(achievementId);
    if (!achievement) throw new Error(`Achievement ${achievementId} not found`);

    const playerProgress = await this.loadPlayerProgress(playerId, achievementId);
    if (playerProgress?.unlocked) return 100;

    const current = await this.getCurrentValue(playerId, achievement.requirement);
    const percentage = (current / achievement.requirement.target) * 100;
    return Math.min(100, Math.max(0, percentage));
  }

  // ---------------------------------------------------------------------------
  // 16.9 – Server-side validation
  // ---------------------------------------------------------------------------

  /**
   * Validate that the player genuinely meets the achievement requirement
   * server-side, then unlock and distribute rewards.
   *
   * @param playerId - The player attempting to unlock
   * @param achievementId - The achievement to unlock
   * @returns true if successfully validated and unlocked, false otherwise
   */
  async validateAndUnlock(playerId: string, achievementId: string): Promise<boolean> {
    const achievement = await this.loadAchievement(achievementId);
    if (!achievement) return false;

    // Server-side validation (Req 12.8)
    const qualifies = await this.meetsRequirement(playerId, achievement.requirement);
    if (!qualifies) return false;

    // Check not already unlocked
    const existing = await this.loadPlayerProgress(playerId, achievementId);
    if (existing?.unlocked) return false;

    const now = new Date().toISOString();
    const current = await this.getCurrentValue(playerId, achievement.requirement);

    // Persist unlock
    const progress: PlayerAchievementProgress = {
      achievementId,
      playerId,
      progress: current,
      unlocked: true,
      unlockedAt: now,
    };
    await this.savePlayerProgress(progress);

    // Distribute rewards (Req 6.8, 11.8)
    await this.distributeRewards(playerId, achievement);

    return true;
  }

  // ---------------------------------------------------------------------------
  // 16.8 – Reward distribution
  // ---------------------------------------------------------------------------

  /**
   * Grant the achievement's rewards to the player.
   *
   * @param playerId - The player to reward
   * @param achievement - The achievement whose rewards to grant
   */
  async distributeRewards(playerId: string, achievement: Achievement): Promise<void> {
    const { rewards } = achievement;
    if (!rewards) return;

    const playerRef = this.playersCollection.doc(playerId);

    await this.db.runTransaction(async (transaction) => {
      const playerDoc = await transaction.get(playerRef);
      if (!playerDoc.exists) throw new Error(`Player ${playerId} not found`);

      const player = playerDoc.data() as Player;
      const updates: Partial<Player> = {};

      if (rewards.softCurrency && rewards.softCurrency > 0) {
        updates.softCurrency = (player.softCurrency ?? 0) + rewards.softCurrency;
      }

      if (rewards.hardCurrency && rewards.hardCurrency > 0) {
        updates.hardCurrency = (player.hardCurrency ?? 0) + rewards.hardCurrency;
      }

      if (Object.keys(updates).length > 0) {
        transaction.update(playerRef, updates as any);
      }
    });

    // Grant exclusive card if specified (outside transaction for simplicity)
    if (rewards.exclusiveCard) {
      const cardId = this.db.collection('_').doc().id;
      const now = new Date().toISOString();
      await this.cardsCollection.doc(cardId).set({
        id: cardId,
        templateId: rewards.exclusiveCard,
        name: rewards.exclusiveCard,
        description: 'Achievement reward card',
        rarity: 'legendary',
        theme: 'achievement',
        imageUrl: '',
        score: 0,
        isLimitedEdition: false,
        obtainedAt: now,
        obtainedFrom: 'achievement',
        playerId,
      });

      // Add card to player's collection
      await this.playersCollection.doc(playerId).update({
        cards: (await this.playersCollection.doc(playerId).get()).data()?.cards
          ? [...((await this.playersCollection.doc(playerId).get()).data()?.cards ?? []), cardId]
          : [cardId],
      });
    }
  }
}
