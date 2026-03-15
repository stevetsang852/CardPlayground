import { Firestore } from 'firebase-admin/firestore';
import { PackConfiguration } from '../../../shared/src/types/pack';
import { Player } from '../../../shared/src/types/player';
import { CosmeticItem } from '../../../shared/src/types/cosmetic';

/**
 * Service for managing Monetization features
 *
 * Handles:
 * - Monthly Card system (Req 11.2)
 * - Limited-time hard currency packs (Req 11.3)
 * - Cosmetic items: gallery skins, card backs, visual effects (Req 11.4, 11.5)
 * - Paid battle pass (Req 11.6)
 * - Gameplay card obtainability validation (Req 11.7)
 */
export class MonetizationService {
  private playersCollection: FirebaseFirestore.CollectionReference;
  private battlePassCollection: FirebaseFirestore.CollectionReference;

  private static readonly MONTHLY_CARD_COST = 300;
  private static readonly MONTHLY_CARD_DAILY_REWARD = 30;
  private static readonly MONTHLY_CARD_DURATION_DAYS = 30;
  private static readonly BATTLE_PASS_COST = 1000;

  private static readonly COSMETIC_CATALOG: CosmeticItem[] = [
    { id: 'skin_dragon_gallery', name: 'Dragon Gallery Skin', type: 'gallery_skin', cost: 500, description: 'Transform your gallery with a fiery dragon theme.' },
    { id: 'skin_ocean_gallery', name: 'Ocean Gallery Skin', type: 'gallery_skin', cost: 500, description: 'A serene underwater gallery experience.' },
    { id: 'card_back_gold', name: 'Gold Card Back', type: 'card_back', cost: 200, description: 'A shimmering gold card back design.' },
    { id: 'card_back_shadow', name: 'Shadow Card Back', type: 'card_back', cost: 200, description: 'A mysterious shadow-themed card back.' },
    { id: 'effect_sparkle', name: 'Sparkle Effect', type: 'visual_effect', cost: 300, description: 'Add sparkle animations to your cards.' },
    { id: 'effect_flames', name: 'Flames Effect', type: 'visual_effect', cost: 300, description: 'Surround your cards with dancing flames.' },
  ];

  private static readonly HARD_CURRENCY_PACKS: (PackConfiguration & { availableFrom: string; availableUntil: string })[] = [
    {
      id: 'hc_pack_starter',
      name: 'Starter Hard Pack',
      type: 'basic',
      cost: 100,
      currencyType: 'hard',
      probabilities: { legendary: 0.02, epic: 0.10, rare: 0.28, common: 0.60 },
      availableFrom: '2024-01-01T00:00:00.000Z',
      availableUntil: '2099-12-31T23:59:59.999Z',
    },
    {
      id: 'hc_pack_premium',
      name: 'Premium Hard Pack',
      type: 'premium',
      cost: 300,
      currencyType: 'hard',
      probabilities: { legendary: 0.05, epic: 0.20, rare: 0.35, common: 0.40 },
      availableFrom: '2024-01-01T00:00:00.000Z',
      availableUntil: '2099-12-31T23:59:59.999Z',
    },
    {
      id: 'hc_pack_legendary_event',
      name: 'Legendary Event Pack',
      type: 'legendary',
      cost: 500,
      currencyType: 'hard',
      probabilities: { legendary: 0.10, epic: 0.30, rare: 0.35, common: 0.25 },
      availableFrom: '2024-06-01T00:00:00.000Z',
      availableUntil: '2024-08-31T23:59:59.999Z',
    },
  ];

  constructor(private db: Firestore) {
    this.playersCollection = db.collection('players');
    this.battlePassCollection = db.collection('battle_pass_progress');
  }

  // ---------------------------------------------------------------------------
  // Monthly Card (Req 11.2)
  // ---------------------------------------------------------------------------

  /**
   * Purchase the Monthly Card for a player.
   * Deducts 300 hard currency and grants 30 days of daily hard currency rewards.
   */
  async purchaseMonthlyCard(playerId: string): Promise<{ expiresAt: string }> {
    const playerRef = this.playersCollection.doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) throw new Error(`Player ${playerId} not found`);

    const player = playerDoc.data() as Player;
    const hardCurrency = player.hardCurrency ?? 0;

    if (hardCurrency < MonetizationService.MONTHLY_CARD_COST) {
      throw new Error('Insufficient hard currency to purchase Monthly Card');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + MonetizationService.MONTHLY_CARD_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const expiresAtStr = expiresAt.toISOString();

    await playerRef.update({
      hardCurrency: hardCurrency - MonetizationService.MONTHLY_CARD_COST,
      monthlyCardExpiresAt: expiresAtStr,
    });

    return { expiresAt: expiresAtStr };
  }

  /**
   * Claim the daily hard currency reward from the Monthly Card.
   * Grants 30 hard currency per day while the card is active.
   */
  async claimMonthlyCardReward(playerId: string): Promise<{ reward: number; alreadyClaimed: boolean }> {
    const playerRef = this.playersCollection.doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) throw new Error(`Player ${playerId} not found`);

    const player = playerDoc.data() as Player;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check if Monthly Card is active
    const expiresAt = player.monthlyCardExpiresAt;
    if (!expiresAt || expiresAt <= now.toISOString()) {
      return { reward: 0, alreadyClaimed: true };
    }

    // Check if already claimed today
    const lastClaimed = player.monthlyCardLastClaimed;
    if (lastClaimed === todayStr) {
      return { reward: 0, alreadyClaimed: true };
    }

    const reward = MonetizationService.MONTHLY_CARD_DAILY_REWARD;
    const hardCurrency = player.hardCurrency ?? 0;

    await playerRef.update({
      hardCurrency: hardCurrency + reward,
      monthlyCardLastClaimed: todayStr,
    });

    return { reward, alreadyClaimed: false };
  }

  // ---------------------------------------------------------------------------
  // Limited-time hard currency packs (Req 11.3)
  // ---------------------------------------------------------------------------

  /**
   * Returns hard-currency-only packs that are currently available.
   * Filters by availability window.
   */
  getAvailableHardCurrencyPacks(): PackConfiguration[] {
    const now = new Date().toISOString();
    return MonetizationService.HARD_CURRENCY_PACKS.filter(
      (pack) => pack.availableFrom <= now && pack.availableUntil >= now
    );
  }

  // ---------------------------------------------------------------------------
  // Cosmetic items (Req 11.4, 11.5)
  // ---------------------------------------------------------------------------

  /**
   * Purchase a cosmetic item for a player.
   * Deducts hard currency and adds the cosmetic to the player's owned list.
   */
  async purchaseCosmetic(playerId: string, cosmeticId: string): Promise<CosmeticItem> {
    const cosmetic = MonetizationService.COSMETIC_CATALOG.find((c) => c.id === cosmeticId);
    if (!cosmetic) throw new Error(`Cosmetic ${cosmeticId} not found`);

    const playerRef = this.playersCollection.doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) throw new Error(`Player ${playerId} not found`);

    const player = playerDoc.data() as Player;
    const hardCurrency = player.hardCurrency ?? 0;

    if (hardCurrency < cosmetic.cost) {
      throw new Error('Insufficient hard currency to purchase cosmetic');
    }

    const ownedCosmetics = player.ownedCosmetics ?? [];
    if (ownedCosmetics.includes(cosmeticId)) {
      throw new Error('Cosmetic already owned');
    }

    await playerRef.update({
      hardCurrency: hardCurrency - cosmetic.cost,
      ownedCosmetics: [...ownedCosmetics, cosmeticId],
    });

    return cosmetic;
  }

  // ---------------------------------------------------------------------------
  // Paid battle pass (Req 11.6)
  // ---------------------------------------------------------------------------

  /**
   * Purchase the paid battle pass for the current season.
   * Deducts 1000 hard currency and unlocks the paid reward track.
   */
  async purchaseBattlePass(playerId: string): Promise<{ success: boolean }> {
    const playerRef = this.playersCollection.doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) throw new Error(`Player ${playerId} not found`);

    const player = playerDoc.data() as Player;
    const hardCurrency = player.hardCurrency ?? 0;

    if (hardCurrency < MonetizationService.BATTLE_PASS_COST) {
      throw new Error('Insufficient hard currency to purchase battle pass');
    }

    // Deduct cost and set flag on player
    await playerRef.update({
      hardCurrency: hardCurrency - MonetizationService.BATTLE_PASS_COST,
      hasPaidBattlePass: true,
    });

    // Update BattlePassProgress for current season (find by playerId prefix)
    const bpSnap = await this.battlePassCollection
      .where('playerId', '==', playerId)
      .orderBy('seasonId', 'desc')
      .limit(1)
      .get();

    if (!bpSnap.empty) {
      const bpDoc = bpSnap.docs[0];
      await this.battlePassCollection.doc(bpDoc.id).update({ hasPaidPass: true });
    }

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Gameplay card obtainability (Req 11.7)
  // ---------------------------------------------------------------------------

  /**
   * Validates that all gameplay-affecting cards are obtainable via soft currency or gameplay.
   * At least one pack with currencyType 'soft' must exist, and all pack types
   * (basic, premium) must have at least one soft currency option.
   */
  validateGameplayCardObtainability(packs: PackConfiguration[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    const softPacks = packs.filter((p) => p.currencyType === 'soft');

    if (softPacks.length === 0) {
      issues.push('No packs available with soft currency — gameplay cards are not freely obtainable');
      return { valid: false, issues };
    }

    const packTypes: Array<'basic' | 'premium'> = ['basic', 'premium'];
    for (const packType of packTypes) {
      const hasSoftOption = softPacks.some((p) => p.type === packType);
      if (!hasSoftOption) {
        issues.push(`No soft currency option for pack type '${packType}'`);
      }
    }

    return { valid: issues.length === 0, issues };
  }
}
