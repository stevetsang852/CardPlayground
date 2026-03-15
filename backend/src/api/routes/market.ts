import { Router, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDatabase } from '../../config/database';
import { MarketService } from '../../services/marketService';

const router = Router();

/**
 * POST /api/v1/market/list
 *
 * List a card for sale on the market.
 *
 * Validates Requirements:
 * - 5.1: Players can list cards for sale with a specified price and currency type
 */
router.post('/list', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cardId, price, currencyType } = req.body;

    if (!cardId || typeof cardId !== 'string') {
      throw new AppError(400, 'INVALID_CARD_ID', 'cardId must be a non-empty string', false);
    }

    if (typeof price !== 'number' || price <= 0) {
      throw new AppError(400, 'INVALID_PRICE', 'price must be a positive number', false);
    }

    if (currencyType !== 'soft' && currencyType !== 'hard') {
      throw new AppError(400, 'INVALID_CURRENCY_TYPE', "currencyType must be 'soft' or 'hard'", false);
    }

    const sellerId = req.user!.uid;
    const marketService = new MarketService(getDatabase());
    const listing = await marketService.listCard(sellerId, cardId, price, currencyType);

    res.status(201).json({ listingId: listing.id, listing });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/market/purchase
 *
 * Purchase a card from the market.
 *
 * Validates Requirements:
 * - 5.2: Players can purchase listed cards
 * - 5.3: Purchases are atomic and deduct currency from buyer, credit seller (minus fee)
 * - 12.3: Limited edition card metadata is preserved on trade
 */
router.post('/purchase', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.body;

    if (!listingId || typeof listingId !== 'string') {
      throw new AppError(400, 'INVALID_LISTING_ID', 'listingId must be a non-empty string', false);
    }

    const buyerId = req.user!.uid;
    const marketService = new MarketService(getDatabase());

    let result: { card: any; transactionFee: number };
    try {
      result = await marketService.purchaseCard(buyerId, listingId);
    } catch (err: any) {
      if (err.message?.includes('already sold')) {
        throw new AppError(409, 'LISTING_ALREADY_SOLD', err.message, false);
      }
      if (err.message?.includes('own listing')) {
        throw new AppError(400, 'CANNOT_BUY_OWN_LISTING', err.message, false);
      }
      if (err.message?.includes('Insufficient currency')) {
        throw new AppError(402, 'INSUFFICIENT_CURRENCY', err.message, false);
      }
      if (err.message?.includes('not found')) {
        throw new AppError(404, 'NOT_FOUND', err.message, false);
      }
      throw err;
    }

    res.json({ success: true, card: result.card, transactionFee: result.transactionFee });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/market/listings
 *
 * Get market listings with optional filters and price statistics.
 *
 * Validates Requirements:
 * - 5.1: Players can view active market listings
 * - 5.4: Listings can be filtered by rarity and sorted
 */
router.get('/listings', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rarity, sortBy = 'recent', limit = '20', offset = '0' } = req.query;

    const validSortBy = ['price', 'recent', 'popular'];
    if (!validSortBy.includes(sortBy as string)) {
      throw new AppError(400, 'INVALID_SORT_BY', `sortBy must be one of: ${validSortBy.join(', ')}`, false);
    }

    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new AppError(400, 'INVALID_LIMIT', 'limit must be a number between 1 and 100', false);
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw new AppError(400, 'INVALID_OFFSET', 'offset must be a non-negative number', false);
    }

    const marketService = new MarketService(getDatabase());
    const result = await marketService.getListings({
      rarity: rarity as string | undefined,
      sortBy: sortBy as string,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/market/trends/:cardId
 *
 * Get price trends and dynamic pricing suggestion for a card template.
 *
 * Validates Requirements:
 * - 5.4: Market provides price statistics
 * - 5.5: Market provides dynamic pricing suggestions based on recent sales
 */
router.get('/trends/:cardId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;

    if (!cardId || typeof cardId !== 'string') {
      throw new AppError(400, 'INVALID_CARD_ID', 'cardId must be a non-empty string', false);
    }

    const marketService = new MarketService(getDatabase());
    const trends = await marketService.getPriceTrends(cardId);

    res.json({
      averagePrice: trends.averagePrice,
      priceHistory: [],  // priceHistory from transactions is not stored separately; supply via stats
      suggestedPrice: trends.suggestedPrice,
      supply: trends.supply,
      demand: trends.demand,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
