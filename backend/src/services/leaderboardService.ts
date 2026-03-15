import { Firestore } from 'firebase-admin/firestore';
import { LeaderboardType, LeaderboardEntry, LeaderboardQuery, LeaderboardResult } from '../../../shared/src/types/leaderboard';
import { Gallery } from '../../../shared/src/types/gallery';

/**
 * Service for managing gallery leaderboards with real-time updates
 * 
 * Supports three leaderboard types:
 * - total_score: Rankings by sum of card scores
 * - rarity_score: Rankings by rarity-weighted scores
 * - creativity: Rankings by likes and comments
 */
export class LeaderboardService {
  private db: Firestore;
  private galleriesCollection: FirebaseFirestore.CollectionReference;

  constructor(db: Firestore) {
    this.db = db;
    this.galleriesCollection = db.collection('galleries');
  }

  /**
   * Get leaderboard rankings for a specific type
   * 
   * @param query - Leaderboard query with type, limit, and offset
   * @returns Leaderboard result with ranked entries
   */
  async getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardResult> {
    const { type, limit, offset } = query;

    // Determine which score field to sort by
    const scoreField = this.getScoreField(type);

    // Query galleries ordered by the appropriate score
    const galleriesQuery = this.galleriesCollection
      .orderBy(scoreField, 'desc')
      .orderBy('playerId', 'asc') // Secondary sort for consistent ordering
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset);

    const snapshot = await galleriesQuery.get();

    // Check if there are more results
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // Get player names for the galleries
    const playerIds = docs.map(doc => doc.data().playerId);
    const playerNames = await this.getPlayerNames(playerIds);

    // Build leaderboard entries with ranks
    const entries: LeaderboardEntry[] = docs.map((doc, index) => {
      const gallery = doc.data() as Gallery;
      const score = this.getScore(gallery, type);
      const rank = offset + index + 1;

      return {
        playerId: gallery.playerId,
        playerName: playerNames[gallery.playerId] || 'Unknown Player',
        score,
        rank,
        galleryCardCount: gallery.cardIds.length,
        totalLikes: type === 'creativity' ? gallery.totalLikes : undefined,
        totalComments: type === 'creativity' ? gallery.totalComments : undefined,
      };
    });

    // Get total count for pagination info
    const totalCount = await this.getTotalCount();

    return {
      type,
      entries,
      totalCount,
      hasMore,
    };
  }

  /**
   * Subscribe to real-time leaderboard updates
   * 
   * @param type - Leaderboard type to subscribe to
   * @param limit - Number of entries to fetch
   * @param callback - Callback function called when leaderboard updates
   * @returns Unsubscribe function
   */
  subscribeToLeaderboard(
    type: LeaderboardType,
    limit: number,
    callback: (entries: LeaderboardEntry[]) => void
  ): () => void {
    const scoreField = this.getScoreField(type);

    const unsubscribe = this.galleriesCollection
      .orderBy(scoreField, 'desc')
      .orderBy('playerId', 'asc')
      .limit(limit)
      .onSnapshot(async (snapshot) => {
        const playerIds = snapshot.docs.map(doc => doc.data().playerId);
        const playerNames = await this.getPlayerNames(playerIds);

        const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
          const gallery = doc.data() as Gallery;
          const score = this.getScore(gallery, type);

          return {
            playerId: gallery.playerId,
            playerName: playerNames[gallery.playerId] || 'Unknown Player',
            score,
            rank: index + 1,
            galleryCardCount: gallery.cardIds.length,
            totalLikes: type === 'creativity' ? gallery.totalLikes : undefined,
            totalComments: type === 'creativity' ? gallery.totalComments : undefined,
          };
        });

        callback(entries);
      });

    return unsubscribe;
  }

  /**
   * Get a player's rank on a specific leaderboard
   * 
   * @param playerId - Player ID to get rank for
   * @param type - Leaderboard type
   * @returns Player's rank (1-indexed) or null if not found
   */
  async getPlayerRank(playerId: string, type: LeaderboardType): Promise<number | null> {
    const galleryDoc = await this.galleriesCollection.doc(playerId).get();
    
    if (!galleryDoc.exists) {
      return null;
    }

    const gallery = galleryDoc.data() as Gallery;
    const playerScore = this.getScore(gallery, type);
    const scoreField = this.getScoreField(type);

    // Count how many galleries have a higher score
    const higherScoresQuery = this.galleriesCollection
      .where(scoreField, '>', playerScore);

    const higherScoresSnapshot = await higherScoresQuery.get();
    const rank = higherScoresSnapshot.size + 1;

    return rank;
  }

  /**
   * Get the Firestore field name for a leaderboard type
   */
  private getScoreField(type: LeaderboardType): string {
    switch (type) {
      case 'total_score':
        return 'totalScore';
      case 'rarity_score':
        return 'rarityScore';
      case 'creativity':
        return 'creativityScore';
      default:
        throw new Error(`Unknown leaderboard type: ${type}`);
    }
  }

  /**
   * Get the score value from a gallery for a specific leaderboard type
   */
  private getScore(gallery: Gallery, type: LeaderboardType): number {
    switch (type) {
      case 'total_score':
        return gallery.totalScore;
      case 'rarity_score':
        return gallery.rarityScore;
      case 'creativity':
        return gallery.creativityScore;
      default:
        return 0;
    }
  }

  /**
   * Get player names for a list of player IDs
   */
  private async getPlayerNames(playerIds: string[]): Promise<Record<string, string>> {
    if (playerIds.length === 0) {
      return {};
    }

    const playerNames: Record<string, string> = {};
    
    // Firestore 'in' queries are limited to 10 items, so batch if needed
    const batchSize = 10;
    for (let i = 0; i < playerIds.length; i += batchSize) {
      const batch = playerIds.slice(i, i + batchSize);
      const playersSnapshot = await this.db.collection('players')
        .where('id', 'in', batch)
        .get();

      playersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        playerNames[data.id] = data.username || 'Unknown Player';
      });
    }

    return playerNames;
  }

  /**
   * Get total count of galleries (for pagination)
   */
  private async getTotalCount(): Promise<number> {
    const snapshot = await this.galleriesCollection.count().get();
    return snapshot.data().count;
  }
}
