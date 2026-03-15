import { Firestore } from 'firebase-admin/firestore';
import { Card } from '../../../shared/src/types/card';
import { PackConfiguration } from '../../../shared/src/types/pack';
import { Player } from '../../../shared/src/types/player';

/**
 * Service for managing the Personalization System
 *
 * Handles:
 * - Tracking card themes and types collected by player (Req 9.1)
 * - Personalized pack recommendations based on preferred themes (Req 9.2)
 * - Emotional feedback messages for draws (Req 9.3, 9.4)
 * - Friend recommendations based on similar collection themes (Req 9.5)
 */
export class PersonalizationService {
  private playersCollection: FirebaseFirestore.CollectionReference;

  /** Maximum number of preferred themes to retain */
  private readonly MAX_PREFERRED_THEMES = 5;

  constructor(private db: Firestore) {
    this.playersCollection = db.collection('players');
  }

  // ---------------------------------------------------------------------------
  // 9.1 – Collection preference tracking
  // ---------------------------------------------------------------------------

  /**
   * Update a player's collection preferences based on newly acquired cards.
   * Increments theme counts and keeps the top MAX_PREFERRED_THEMES as preferredThemes.
   *
   * @param playerId - The player whose preferences to update
   * @param newCards - Cards that were just added to the player's collection
   */
  async updateCollectionPreferences(playerId: string, newCards: Card[]): Promise<void> {
    if (newCards.length === 0) return;

    const playerRef = this.playersCollection.doc(playerId);
    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) return;

    const player = playerDoc.data() as Player;

    // Build a theme-count map from existing collectionFocus entries
    // collectionFocus stores entries like "theme:count"
    const themeCounts = this.parseThemeCounts(player.collectionFocus ?? []);

    // Increment counts for each new card's theme
    for (const card of newCards) {
      if (card.theme) {
        themeCounts.set(card.theme, (themeCounts.get(card.theme) ?? 0) + 1);
      }
    }

    // Serialize back to collectionFocus
    const collectionFocus = this.serializeThemeCounts(themeCounts);

    // Top MAX_PREFERRED_THEMES themes by count become preferredThemes
    const preferredThemes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.MAX_PREFERRED_THEMES)
      .map(([theme]) => theme);

    await playerRef.update({ preferredThemes, collectionFocus });
  }

  // ---------------------------------------------------------------------------
  // 9.2 – Personalized pack recommendations
  // ---------------------------------------------------------------------------

  /**
   * Return available packs sorted by relevance to the player's preferred themes.
   * Packs whose name/id contains a preferred theme keyword rank higher.
   *
   * @param playerId - The player requesting recommendations
   * @param availablePacks - All packs to score and sort
   * @returns Packs sorted from most to least relevant
   */
  async getPackRecommendations(
    playerId: string,
    availablePacks: PackConfiguration[]
  ): Promise<PackConfiguration[]> {
    const playerDoc = await this.playersCollection.doc(playerId).get();
    const preferredThemes: string[] = playerDoc.exists
      ? ((playerDoc.data() as Player).preferredThemes ?? [])
      : [];

    if (preferredThemes.length === 0) {
      return [...availablePacks];
    }

    const score = (pack: PackConfiguration): number => {
      const haystack = `${pack.id} ${pack.name}`.toLowerCase();
      return preferredThemes.reduce((total, theme) => {
        return total + (haystack.includes(theme.toLowerCase()) ? 1 : 0);
      }, 0);
    };

    return [...availablePacks].sort((a, b) => score(b) - score(a));
  }

  // ---------------------------------------------------------------------------
  // 9.3, 9.4 – Emotional feedback messages
  // ---------------------------------------------------------------------------

  /**
   * Return an appropriate emotional feedback message for a draw result.
   *
   * @param drawResult - The result of a card draw
   * @returns A feedback message string
   */
  getEmotionalFeedback(drawResult: { cards: Card[]; hadNearMiss: boolean }): string {
    const { cards, hadNearMiss } = drawResult;

    const hasLegendary = cards.some(c => c.rarity === 'legendary');
    const hasEpic = cards.some(c => c.rarity === 'epic');

    if (hasLegendary) {
      return "Incredible! You've drawn a Legendary card! Your collection just reached a new pinnacle!";
    }

    if (hasEpic) {
      return "Amazing! An Epic card joins your collection! Your deck grows stronger!";
    }

    if (hadNearMiss) {
      return "So close! A legendary card almost appeared — your luck is building up. Keep going!";
    }

    // No rare/epic/legendary — encouraging message (Req 9.3)
    return "Every draw brings you closer to something extraordinary. Keep collecting!";
  }

  // ---------------------------------------------------------------------------
  // 9.5 – Friend recommendations
  // ---------------------------------------------------------------------------

  /**
   * Recommend players with the most theme overlap with the given player,
   * excluding existing friends.
   *
   * @param playerId - The player requesting recommendations
   * @param allPlayerIds - All candidate player IDs to consider
   * @returns Up to 5 player IDs with the most theme overlap
   */
  async getFriendRecommendations(playerId: string, allPlayerIds: string[]): Promise<string[]> {
    const playerDoc = await this.playersCollection.doc(playerId).get();
    if (!playerDoc.exists) return [];

    const player = playerDoc.data() as Player;
    const myThemes = new Set(player.preferredThemes ?? []);
    const existingFriends = new Set(player.friends ?? []);

    const candidates = allPlayerIds.filter(
      id => id !== playerId && !existingFriends.has(id)
    );

    // Score each candidate by theme overlap
    const scored: Array<{ id: string; overlap: number }> = [];

    for (const candidateId of candidates) {
      const candidateDoc = await this.playersCollection.doc(candidateId).get();
      if (!candidateDoc.exists) continue;

      const candidate = candidateDoc.data() as Player;
      const theirThemes = candidate.preferredThemes ?? [];
      const overlap = theirThemes.filter(t => myThemes.has(t)).length;
      scored.push({ id: candidateId, overlap });
    }

    return scored
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 5)
      .map(s => s.id);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse collectionFocus array (entries like "theme:count") into a Map.
   */
  parseThemeCounts(collectionFocus: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const entry of collectionFocus) {
      const colonIdx = entry.lastIndexOf(':');
      if (colonIdx === -1) {
        map.set(entry, 1);
      } else {
        const theme = entry.slice(0, colonIdx);
        const count = parseInt(entry.slice(colonIdx + 1), 10);
        map.set(theme, isNaN(count) ? 1 : count);
      }
    }
    return map;
  }

  /**
   * Serialize a theme-count Map back to collectionFocus array format.
   */
  serializeThemeCounts(themeCounts: Map<string, number>): string[] {
    return Array.from(themeCounts.entries()).map(([theme, count]) => `${theme}:${count}`);
  }
}
