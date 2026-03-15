import { Firestore } from 'firebase-admin/firestore';
import { Player } from '../../../shared/src/types/player';
import { Card } from '../../../shared/src/types/card';

const VALID_RECIPE_TYPES = ['basic', 'advanced', 'legendary', 'special'];

/**
 * DataSyncService - Handles data synchronization and integrity operations
 *
 * Validates Requirements:
 * - 12.1: Synchronize all card draws with the server before displaying results
 * - 12.2: Validate synthesis attempts on the server before processing results
 * - 12.7: Persist all player progress, missions, and Battle_Pass state to the database
 */
export class DataSyncService {
  constructor(private db: Firestore) {}

  /**
   * Creates a confirmed draw transaction record in Firestore.
   * The server confirms the draw before the client can display results (Requirement 12.1).
   *
   * @returns transactionId - non-empty string identifying the confirmed transaction
   */
  async createDrawTransaction(
    playerId: string,
    packType: string,
    cards: Card[],
    luckValue: number,
    drawsSinceLastLegendary: number,
    currencyDeducted: number,
    currencyType: 'soft' | 'hard'
  ): Promise<string> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const record = {
      transactionId,
      playerId,
      packType,
      cardIds: cards.map(c => c.id),
      luckValue,
      drawsSinceLastLegendary,
      currencyDeducted,
      currencyType,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    await this.db.collection('draw_transactions').doc(transactionId).set(record);

    return transactionId;
  }

  /**
   * Validates a synthesis request server-side before processing (Requirement 12.2).
   *
   * @returns { valid, errors } - validation result with descriptive errors
   */
  async validateSynthesisRequest(
    playerId: string,
    inputCardIds: string[],
    recipeType: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate recipe type
    if (!VALID_RECIPE_TYPES.includes(recipeType)) {
      errors.push(`Invalid recipe type: ${recipeType}. Must be one of: ${VALID_RECIPE_TYPES.join(', ')}`);
    }

    // Validate input cards are non-empty
    if (inputCardIds.length === 0) {
      errors.push('No input cards provided for synthesis');
    }

    // Validate all input cards exist in player's inventory
    if (inputCardIds.length > 0) {
      const playerDoc = await this.db.collection('players').doc(playerId).get();
      if (!playerDoc.exists) {
        errors.push(`Player ${playerId} not found`);
      } else {
        const player = playerDoc.data() as Player;
        const playerCards: string[] = player.cards || [];

        for (const cardId of inputCardIds) {
          if (!playerCards.includes(cardId)) {
            errors.push(`Card ${cardId} not found in player inventory`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Persists all player state fields atomically to Firestore (Requirement 12.7).
   */
  async persistPlayerState(playerId: string, state: Partial<Player>): Promise<void> {
    await this.db.collection('players').doc(playerId).set(
      { ...state, id: playerId },
      { merge: true }
    );
  }

  /**
   * Loads complete player state from Firestore (Requirement 12.7).
   *
   * @returns Player if found, null otherwise
   */
  async loadPlayerState(playerId: string): Promise<Player | null> {
    const doc = await this.db.collection('players').doc(playerId).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as Player;
  }
}
