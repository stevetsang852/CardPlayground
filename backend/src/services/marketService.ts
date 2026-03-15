import { Firestore } from 'firebase-admin/firestore';
import { Card, OwnershipRecord } from '../../../shared/src/types/card';
import { MarketListing, MarketTransaction, PriceStatistics } from '../../../shared/src/types/market';

/**
 * Service for managing the Trading Market
 *
 * Handles:
 * - Listing cards for sale
 * - Purchasing cards with atomic Firestore transactions
 * - 5% transaction fee calculation
 * - Limited edition card metadata preservation
 * - Price trend calculation and dynamic pricing suggestions
 */
export class MarketService {
  private db: Firestore;
  private listingsCollection: FirebaseFirestore.CollectionReference;
  private transactionsCollection: FirebaseFirestore.CollectionReference;
  private playersCollection: FirebaseFirestore.CollectionReference;
  private cardsCollection: FirebaseFirestore.CollectionReference;

  private readonly FEE_RATE = 0.05; // 5%

  constructor(db: Firestore) {
    this.db = db;
    this.listingsCollection = db.collection('market_listings');
    this.transactionsCollection = db.collection('market_transactions');
    this.playersCollection = db.collection('players');
    this.cardsCollection = db.collection('cards');
  }

  // ---------------------------------------------------------------------------
  // Fee helpers (14.4)
  // ---------------------------------------------------------------------------

  /**
   * Calculate the 5% transaction fee for a given price.
   * Uses Math.floor so the fee is always a whole number.
   */
  calculateFee(price: number): number {
    return Math.floor(price * this.FEE_RATE);
  }

  /**
   * Calculate the amount the seller receives (price minus fee).
   */
  calculateSellerReceived(price: number): number {
    return price - this.calculateFee(price);
  }

  // ---------------------------------------------------------------------------
  // List a card (14.2 prerequisite)
  // ---------------------------------------------------------------------------

  /**
   * List a card for sale on the market.
   *
   * @param sellerId - The player listing the card
   * @param cardId - The card to list
   * @param price - Listing price
   * @param currencyType - 'soft' or 'hard'
   * @returns The created MarketListing
   */
  async listCard(
    sellerId: string,
    cardId: string,
    price: number,
    currencyType: 'soft' | 'hard'
  ): Promise<MarketListing> {
    // Fetch seller and card
    const [sellerDoc, cardDoc] = await Promise.all([
      this.playersCollection.doc(sellerId).get(),
      this.cardsCollection.doc(cardId).get(),
    ]);

    if (!sellerDoc.exists) throw new Error(`Seller ${sellerId} not found`);
    if (!cardDoc.exists) throw new Error(`Card ${cardId} not found`);

    const seller = sellerDoc.data() as any;
    const card = cardDoc.data() as Card;

    if (card.id !== cardId) {
      // Normalise in case id is stored separately
    }

    const listingId = this.db.collection('_').doc().id;
    const now = new Date().toISOString();

    const listing: MarketListing = {
      id: listingId,
      sellerId,
      sellerName: seller.username || sellerId,
      card,
      price,
      currencyType,
      views: 0,
      listedAt: now,
    };

    await this.listingsCollection.doc(listingId).set(listing);

    return listing;
  }

  // ---------------------------------------------------------------------------
  // Purchase a card atomically (14.2)
  // ---------------------------------------------------------------------------

  /**
   * Purchase a listed card using a Firestore transaction.
   *
   * The transaction atomically:
   *  1. Deducts the full price from the buyer's currency
   *  2. Credits the seller with 95% of the price
   *  3. Transfers card ownership to the buyer (preserving limited edition metadata)
   *  4. Marks the listing as sold
   *  5. Records the market transaction
   *
   * If any step fails the entire transaction is rolled back.
   *
   * @param buyerId - The player purchasing the card
   * @param listingId - The listing to purchase
   * @returns The transferred card and the fee amount
   */
  async purchaseCard(
    buyerId: string,
    listingId: string
  ): Promise<{ card: Card; transactionFee: number }> {
    const listingRef = this.listingsCollection.doc(listingId);
    const buyerRef = this.playersCollection.doc(buyerId);

    let resultCard: Card | null = null;
    let resultFee = 0;

    await this.db.runTransaction(async (transaction) => {
      // Read all documents inside the transaction
      const [listingDoc, buyerDoc] = await Promise.all([
        transaction.get(listingRef),
        transaction.get(buyerRef),
      ]);

      if (!listingDoc.exists) throw new Error(`Listing ${listingId} not found`);
      if (!buyerDoc.exists) throw new Error(`Buyer ${buyerId} not found`);

      const listing = listingDoc.data() as MarketListing;
      const buyer = buyerDoc.data() as any;

      if (listing.soldAt) throw new Error('Listing already sold');
      if (listing.sellerId === buyerId) throw new Error('Cannot purchase your own listing');

      const { price, currencyType, sellerId } = listing;
      const fee = this.calculateFee(price);
      const sellerReceived = this.calculateSellerReceived(price);

      // Check buyer has sufficient funds
      const buyerCurrency =
        currencyType === 'soft' ? (buyer.softCurrency ?? 0) : (buyer.hardCurrency ?? 0);
      if (buyerCurrency < price) {
        throw new Error('Insufficient currency');
      }

      // Read seller inside transaction
      const sellerRef = this.playersCollection.doc(sellerId);
      const sellerDoc = await transaction.get(sellerRef);
      if (!sellerDoc.exists) throw new Error(`Seller ${sellerId} not found`);
      const seller = sellerDoc.data() as any;

      const sellerCurrency =
        currencyType === 'soft' ? (seller.softCurrency ?? 0) : (seller.hardCurrency ?? 0);

      // Build updated card with preserved limited edition metadata (14.6)
      const now = new Date().toISOString();
      const buyerDoc2 = buyerDoc.data() as any;
      const newOwnerRecord: OwnershipRecord = {
        playerId: buyerId,
        playerName: buyerDoc2.username || buyerId,
        acquiredAt: now,
        acquiredFrom: 'trade',
      };

      const updatedCard: Card = {
        ...listing.card,
        // Preserve limited edition metadata
        isLimitedEdition: listing.card.isLimitedEdition,
        editionNumber: listing.card.editionNumber,
        originalOwner: listing.card.originalOwner,
        // Append new ownership record
        ownershipHistory: [...(listing.card.ownershipHistory ?? []), newOwnerRecord],
        obtainedAt: now,
        obtainedFrom: 'trade',
      };

      // Build transaction record
      const txId = this.db.collection('_').doc().id;
      const marketTx: MarketTransaction = {
        id: txId,
        listingId,
        cardId: listing.card.id,
        cardTemplateId: listing.card.templateId,
        sellerId,
        buyerId,
        price,
        currencyType,
        fee,
        sellerReceived,
        transactedAt: now,
      };

      // Apply all writes atomically
      // 1. Deduct from buyer
      if (currencyType === 'soft') {
        transaction.update(buyerRef, { softCurrency: buyerCurrency - price });
      } else {
        transaction.update(buyerRef, { hardCurrency: buyerCurrency - price });
      }

      // 2. Credit seller
      if (currencyType === 'soft') {
        transaction.update(sellerRef, { softCurrency: sellerCurrency + sellerReceived });
      } else {
        transaction.update(sellerRef, { hardCurrency: sellerCurrency + sellerReceived });
      }

      // 3. Update card ownership
      const cardRef = this.cardsCollection.doc(listing.card.id);
      transaction.set(cardRef, updatedCard);

      // 4. Mark listing as sold
      transaction.update(listingRef, {
        soldAt: now,
        buyerId,
        card: updatedCard,
      });

      // 5. Record transaction
      const txRef = this.transactionsCollection.doc(txId);
      transaction.set(txRef, marketTx);

      resultCard = updatedCard;
      resultFee = fee;
    });

    return { card: resultCard!, transactionFee: resultFee };
  }

  // ---------------------------------------------------------------------------
  // Get listings (14.8 price stats)
  // ---------------------------------------------------------------------------

  /**
   * Get market listings with optional filters and price statistics.
   */
  async getListings(filters: {
    rarity?: string;
    sortBy: string;
    limit: number;
    offset: number;
  }): Promise<{ listings: MarketListing[]; priceStats: PriceStatistics }> {
    let query: any = this.listingsCollection.where('soldAt', '==', null);

    if (filters.rarity) {
      query = query.where('card.rarity', '==', filters.rarity);
    }

    switch (filters.sortBy) {
      case 'price':
        query = query.orderBy('price', 'asc');
        break;
      case 'recent':
        query = query.orderBy('listedAt', 'desc');
        break;
      case 'popular':
        query = query.orderBy('views', 'desc');
        break;
      default:
        query = query.orderBy('listedAt', 'desc');
    }

    const snapshot = await query.get();
    const allListings: MarketListing[] = snapshot.docs.map((d: any) => d.data() as MarketListing);

    const paginated = allListings.slice(filters.offset, filters.offset + filters.limit);

    // Compute aggregate price stats across all (unfiltered) active listings
    const prices = allListings.map((l) => l.price);
    const priceStats = this.computePriceStats('', prices, allListings.length, 0, 0);

    return { listings: paginated, priceStats };
  }

  // ---------------------------------------------------------------------------
  // Price trends (14.8) and dynamic pricing (14.9)
  // ---------------------------------------------------------------------------

  /**
   * Get price trends and a dynamic pricing suggestion for a card template.
   *
   * @param cardTemplateId - The template ID to analyse
   * @returns PriceStatistics plus suggestedPrice, supply, and demand
   */
  async getPriceTrends(
    cardTemplateId: string
  ): Promise<PriceStatistics & { suggestedPrice: number; supply: number; demand: number }> {
    // Fetch recent transactions for this template (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const txSnapshot = await this.transactionsCollection
      .where('cardTemplateId', '==', cardTemplateId)
      .where('transactedAt', '>', thirtyDaysAgo.toISOString())
      .orderBy('transactedAt', 'desc')
      .get();

    const transactions: MarketTransaction[] = txSnapshot.docs.map(
      (d: any) => d.data() as MarketTransaction
    );

    // Active listings (supply)
    const activeSnapshot = await this.listingsCollection
      .where('card.templateId', '==', cardTemplateId)
      .where('soldAt', '==', null)
      .get();
    const supply = activeSnapshot.docs.length;

    // Demand: number of transactions in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentTxCount = transactions.filter(
      (tx) => tx.transactedAt > oneDayAgo.toISOString()
    ).length;

    const prices = transactions.map((tx) => tx.price);
    const stats = this.computePriceStats(
      cardTemplateId,
      prices,
      activeSnapshot.docs.length,
      recentTxCount,
      this.calculate24hPriceChange(transactions)
    );

    // Suggested price: average of last 10 sales (14.9)
    const last10 = transactions.slice(0, 10).map((tx) => tx.price);
    const suggestedPrice =
      last10.length > 0
        ? Math.floor(last10.reduce((a, b) => a + b, 0) / last10.length)
        : 0;

    return {
      ...stats,
      suggestedPrice,
      supply,
      demand: recentTxCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private computePriceStats(
    cardTemplateId: string,
    prices: number[],
    totalListings: number,
    recentSales: number,
    priceChange24h: number
  ): PriceStatistics {
    if (prices.length === 0) {
      return {
        cardTemplateId,
        averagePrice: 0,
        medianPrice: 0,
        lowestPrice: 0,
        highestPrice: 0,
        totalListings,
        recentSales,
        priceChange24h,
      };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    return {
      cardTemplateId,
      averagePrice: average,
      medianPrice: median,
      lowestPrice: sorted[0],
      highestPrice: sorted[sorted.length - 1],
      totalListings,
      recentSales,
      priceChange24h,
    };
  }

  private calculate24hPriceChange(transactions: MarketTransaction[]): number {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const last24h = transactions.filter(
      (tx) => tx.transactedAt > oneDayAgo.toISOString()
    );
    const prev24h = transactions.filter(
      (tx) =>
        tx.transactedAt > twoDaysAgo.toISOString() &&
        tx.transactedAt <= oneDayAgo.toISOString()
    );

    if (last24h.length === 0 || prev24h.length === 0) return 0;

    const avgLast = last24h.reduce((a, b) => a + b.price, 0) / last24h.length;
    const avgPrev = prev24h.reduce((a, b) => a + b.price, 0) / prev24h.length;

    if (avgPrev === 0) return 0;
    return ((avgLast - avgPrev) / avgPrev) * 100;
  }
}
