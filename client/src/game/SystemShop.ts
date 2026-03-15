import { cryptoRandom } from './CryptoRandom';
import { CARD_TEMPLATES, type Rarity } from '../cardData';
import type { IMarketListing, ICardInstance } from '../db';
import type { PlayerState } from '../store/gameStore';

export interface PurchaseResult {
  success: boolean;
  card: ICardInstance | null;
  updatedPlayer: Partial<PlayerState>;
  error?: string;
}

// Base prices per rarity
const BASE_PRICES: Record<Rarity, number> = {
  common: 50,
  rare: 200,
  epic: 800,
  legendary: 3000,
  mythic: 15000,
};

// Rarity weights for shop generation (higher = more likely)
const SHOP_RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 4,
  mythic: 1,
};

function rollShopRarity(): Rarity {
  const total = Object.values(SHOP_RARITY_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = cryptoRandom.nextFloat() * total;
  for (const [rarity, weight] of Object.entries(SHOP_RARITY_WEIGHTS) as [Rarity, number][]) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

/**
 * Generate daily shop listings.
 * Price is dynamically adjusted based on how many cards of that rarity the player already owns.
 */
export function refreshDailyShop(
  player: PlayerState,
  cards: ICardInstance[],
  date: string // YYYY-MM-DD, used as seed for deterministic daily shop
): IMarketListing[] {
  const count = cryptoRandom.nextInt(5, 8);
  const listings: IMarketListing[] = [];
  const expiresAt = new Date(date).getTime() + 24 * 60 * 60 * 1000;

  // Count cards by rarity for price adjustment
  const rarityCount: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };
  for (const card of cards) rarityCount[card.rarity]++;

  for (let i = 0; i < count; i++) {
    const rarity = rollShopRarity();
    const pool = CARD_TEMPLATES.filter(c => c.rarity === rarity);
    const template = pool[cryptoRandom.nextInt(0, pool.length - 1)]!;

    // Price increases slightly if player already has many of this rarity
    const owned = rarityCount[rarity];
    const priceMultiplier = 1 + Math.min(owned * 0.02, 0.5); // max +50%
    const price = Math.round(BASE_PRICES[rarity] * priceMultiplier);

    listings.push({
      cardId: template.id,
      rarity: template.rarity,
      price,
      expiresAt,
      purchased: false,
    });
  }

  return listings;
}

/**
 * Purchase a shop listing.
 */
export function purchaseItem(
  listingId: number,
  listings: IMarketListing[],
  player: PlayerState
): PurchaseResult {
  const listing = listings.find(l => l.id === listingId);

  if (!listing) {
    return { success: false, card: null, updatedPlayer: {}, error: 'Item not found' };
  }
  if (listing.purchased) {
    return { success: false, card: null, updatedPlayer: {}, error: 'Already purchased' };
  }
  if (player.softCurrency < listing.price) {
    return { success: false, card: null, updatedPlayer: {}, error: 'Insufficient currency' };
  }

  const template = CARD_TEMPLATES.find(c => c.id === listing.cardId);
  if (!template) {
    return { success: false, card: null, updatedPlayer: {}, error: 'Card template not found' };
  }

  const card: ICardInstance = {
    cardId: template.id,
    rarity: template.rarity,
    level: 1,
    obtainedAt: Date.now(),
  };

  return {
    success: true,
    card,
    updatedPlayer: {
      softCurrency: player.softCurrency - listing.price,
    },
  };
}
