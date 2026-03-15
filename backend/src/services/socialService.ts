import { Firestore } from 'firebase-admin/firestore';
import { Gallery, GalleryInteraction } from '../../../shared/src/types/gallery';
import { Card } from '../../../shared/src/types/card';
import { GalleryScoreCalculator } from '../../../shared/src/gallery/GalleryScoreCalculator';

/**
 * Service for managing social interactions with galleries
 * 
 * Handles:
 * - Like rate limiting (one like per gallery per 24 hours)
 * - Comment tracking
 * - Social interaction rewards
 */
export class SocialService {
  private db: Firestore;
  private interactionsCollection: FirebaseFirestore.CollectionReference;
  private playersCollection: FirebaseFirestore.CollectionReference;
  private galleriesCollection: FirebaseFirestore.CollectionReference;
  private cardsCollection: FirebaseFirestore.CollectionReference;
  private scoreCalculator: GalleryScoreCalculator;

  // Reward amounts
  private readonly LIKE_REWARD = 10;
  private readonly COMMENT_REWARD = 5;

  constructor(db: Firestore) {
    this.db = db;
    this.interactionsCollection = db.collection('gallery_interactions');
    this.playersCollection = db.collection('players');
    this.galleriesCollection = db.collection('galleries');
    this.cardsCollection = db.collection('cards');
    this.scoreCalculator = new GalleryScoreCalculator();
  }

  /**
   * Get a player's gallery
   *
   * @param playerId - The player whose gallery to retrieve
   * @returns The Gallery document, or null if not found
   */
  async getGallery(playerId: string): Promise<Gallery | null> {
    const galleryDoc = await this.galleriesCollection.doc(playerId).get();
    if (!galleryDoc.exists) {
      return null;
    }
    return galleryDoc.data() as Gallery;
  }

  /**
   * Update a player's gallery with new card IDs and recalculate scores
   *
   * @param playerId - The player whose gallery to update
   * @param cardIds - Array of card IDs (max 50)
   * @returns The updated Gallery document
   */
  async updateGallery(playerId: string, cardIds: string[]): Promise<Gallery> {
    // Fetch card details to calculate scores
    const cardDocs = await Promise.all(
      cardIds.map(id => this.cardsCollection.doc(id).get())
    );

    const cards: Card[] = cardDocs
      .filter(doc => doc.exists)
      .map(doc => doc.data() as Card);

    // Get current like/comment counts for creativity score
    const likeCount = await this.getLikeCount(playerId);
    const commentCount = await this.getCommentCount(playerId);

    const scores = this.scoreCalculator.calculateAllScores(cards, likeCount, commentCount);

    const now = new Date().toISOString();

    // Build the updated gallery document
    const galleryRef = this.galleriesCollection.doc(playerId);
    const existingDoc = await galleryRef.get();

    const existingData = existingDoc.exists ? (existingDoc.data() as Gallery) : {};

    const gallery: Gallery = {
      ...(existingData as Gallery),
      playerId,
      cardIds,
      totalLikes: likeCount,
      totalComments: commentCount,
      totalScore: scores.totalScore,
      rarityScore: scores.rarityScore,
      creativityScore: scores.creativityScore,
      updatedAt: now,
    };

    await galleryRef.set(gallery, { merge: true });

    // Also update the player's galleryCardIds field
    await this.playersCollection.doc(playerId).update({
      galleryCardIds: cardIds,
      lastActiveAt: now,
    });

    return gallery;
  }

  /**
   * Check if a player can like a specific gallery
   * 
   * @param playerId - Player attempting to like
   * @param galleryPlayerId - Owner of the gallery
   * @returns true if player can like (hasn't liked in last 24 hours)
   */
  async canLikeGallery(playerId: string, galleryPlayerId: string): Promise<boolean> {
    // Players cannot like their own gallery
    if (playerId === galleryPlayerId) {
      return false;
    }

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Query for likes from this player to this gallery in the last 24 hours
    const recentLikesQuery = this.interactionsCollection
      .where('galleryPlayerId', '==', galleryPlayerId)
      .where('interactingPlayerId', '==', playerId)
      .where('type', '==', 'like')
      .where('createdAt', '>', twentyFourHoursAgo.toISOString())
      .limit(1);

    const snapshot = await recentLikesQuery.get();
    
    // Can like if no recent likes found
    return snapshot.empty;
  }

  /**
   * Get the timestamp of the last like from a player to a gallery
   * 
   * @param playerId - Player who liked
   * @param galleryPlayerId - Owner of the gallery
   * @returns ISO timestamp of last like, or null if never liked
   */
  async getLastLikeTimestamp(playerId: string, galleryPlayerId: string): Promise<string | null> {
    const lastLikeQuery = this.interactionsCollection
      .where('galleryPlayerId', '==', galleryPlayerId)
      .where('interactingPlayerId', '==', playerId)
      .where('type', '==', 'like')
      .orderBy('createdAt', 'desc')
      .limit(1);

    const snapshot = await lastLikeQuery.get();
    
    if (snapshot.empty) {
      return null;
    }

    const interaction = snapshot.docs[0].data() as GalleryInteraction;
    return interaction.createdAt;
  }

  /**
   * Record a like interaction
   * 
   * @param playerId - Player liking the gallery
   * @param galleryPlayerId - Owner of the gallery
   * @returns The created interaction
   * @throws Error if player cannot like (rate limit or self-like)
   */
  async recordLike(playerId: string, galleryPlayerId: string): Promise<GalleryInteraction> {
    // Check if player can like
    const canLike = await this.canLikeGallery(playerId, galleryPlayerId);
    
    if (!canLike) {
      if (playerId === galleryPlayerId) {
        throw new Error('Cannot like your own gallery');
      }
      throw new Error('Like rate limit exceeded. You can only like a gallery once per 24 hours');
    }

    // Create the interaction
    const interaction: GalleryInteraction = {
      id: this.db.collection('_').doc().id, // Generate unique ID
      galleryPlayerId,
      interactingPlayerId: playerId,
      type: 'like',
      createdAt: new Date().toISOString(),
    };

    // Store in database
    await this.interactionsCollection.doc(interaction.id).set(interaction);

    // Grant reward to gallery owner
    await this.grantReward(galleryPlayerId, this.LIKE_REWARD);

    return interaction;
  }

  /**
   * Record a comment interaction
   * 
   * @param playerId - Player commenting on the gallery
   * @param galleryPlayerId - Owner of the gallery
   * @param text - Comment text
   * @returns The created interaction
   */
  async recordComment(playerId: string, galleryPlayerId: string, text: string): Promise<GalleryInteraction> {
    // Create the interaction
    const interaction: GalleryInteraction = {
      id: this.db.collection('_').doc().id, // Generate unique ID
      galleryPlayerId,
      interactingPlayerId: playerId,
      type: 'comment',
      text,
      createdAt: new Date().toISOString(),
    };

    // Store in database
    await this.interactionsCollection.doc(interaction.id).set(interaction);

    // Grant reward to gallery owner
    await this.grantReward(galleryPlayerId, this.COMMENT_REWARD);

    return interaction;
  }

  /**
   * Grant soft currency reward to a player
   * 
   * @param playerId - Player to receive the reward
   * @param amount - Amount of soft currency to grant
   */
  private async grantReward(playerId: string, amount: number): Promise<void> {
    const playerRef = this.playersCollection.doc(playerId);
    
    // Use Firestore transaction to ensure atomic update
    await this.db.runTransaction(async (transaction) => {
      const playerDoc = await transaction.get(playerRef);
      
      if (!playerDoc.exists) {
        throw new Error(`Player ${playerId} not found`);
      }

      const playerData = playerDoc.data();
      const currentCurrency = playerData?.softCurrency || 0;
      
      transaction.update(playerRef, {
        softCurrency: currentCurrency + amount,
      });
    });
  }

  /**
   * Get all interactions for a gallery
   * 
   * @param galleryPlayerId - Owner of the gallery
   * @param type - Optional filter by interaction type
   * @returns Array of interactions
   */
  async getGalleryInteractions(
    galleryPlayerId: string,
    type?: 'like' | 'comment'
  ): Promise<GalleryInteraction[]> {
    let query = this.interactionsCollection
      .where('galleryPlayerId', '==', galleryPlayerId);

    if (type) {
      query = query.where('type', '==', type);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as GalleryInteraction);
  }

  /**
   * Get the count of likes for a gallery
   * 
   * @param galleryPlayerId - Owner of the gallery
   * @returns Number of likes
   */
  async getLikeCount(galleryPlayerId: string): Promise<number> {
    const query = this.interactionsCollection
      .where('galleryPlayerId', '==', galleryPlayerId)
      .where('type', '==', 'like');

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  /**
   * Get the count of comments for a gallery
   * 
   * @param galleryPlayerId - Owner of the gallery
   * @returns Number of comments
   */
  async getCommentCount(galleryPlayerId: string): Promise<number> {
    const query = this.interactionsCollection
      .where('galleryPlayerId', '==', galleryPlayerId)
      .where('type', '==', 'comment');

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  /**
   * Calculate time remaining until a player can like a gallery again
   * 
   * @param playerId - Player who wants to like
   * @param galleryPlayerId - Owner of the gallery
   * @returns Milliseconds until next like is allowed, or 0 if can like now
   */
  async getTimeUntilNextLike(playerId: string, galleryPlayerId: string): Promise<number> {
    const lastLikeTimestamp = await this.getLastLikeTimestamp(playerId, galleryPlayerId);
    
    if (!lastLikeTimestamp) {
      return 0; // Never liked, can like now
    }

    const lastLikeDate = new Date(lastLikeTimestamp);
    const nextAllowedDate = new Date(lastLikeDate.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();

    const timeRemaining = nextAllowedDate.getTime() - now.getTime();
    return Math.max(0, timeRemaining);
  }

  /**
   * Get the reward amount for a like
   * 
   * @returns Amount of soft currency granted for a like
   */
  getLikeRewardAmount(): number {
    return this.LIKE_REWARD;
  }

  /**
   * Get the reward amount for a comment
   * 
   * @returns Amount of soft currency granted for a comment
   */
  getCommentRewardAmount(): number {
    return this.COMMENT_REWARD;
  }
}
