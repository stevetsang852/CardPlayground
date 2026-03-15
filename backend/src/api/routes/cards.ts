import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { collections, getDatabase } from '../../config/database';
import { SeasonService } from '../../services/seasonService';
import { PersonalizationService } from '../../services/personalizationService';
import { CardDrawGenerator } from '@shared/drawing/CardDrawGenerator';
import { LuckValueCalculator } from '@shared/luck/LuckValueCalculator';
import { NearMissGenerator } from '@shared/drawing/NearMissGenerator';
import { SeededRandom } from '@shared/random/SeededRandom';
import { Card, CardRarity } from '@shared/types/card';
import { PackType, CurrencyType, PackConfiguration } from '@shared/types/pack';
import { Player } from '@shared/types/player';
import { ActiveEvent } from '@shared/types/event';

const router = Router();

/**
 * Helper function to perform card draw with retry logic
 * Implements exponential backoff: 1s, 2s, 4s
 */
async function performDrawWithRetry(
  drawOperation: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  const delays = [1000, 2000, 4000]; // Exponential backoff delays in ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await drawOperation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isNetworkError = 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('connection');
      
      // Only retry on network errors
      if (!isNetworkError || isLastAttempt) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * POST /api/v1/cards/draw
 * 
 * Purchase and draw cards from a pack
 * 
 * Validates Requirements:
 * - 1.1: Basic Pack for 100 coins with 0.5% legendary probability
 * - 1.2: Premium Pack for 500 coins with 2% legendary probability
 * - 1.4: Legendary Pack for 2000 coins with 10% legendary probability
 * - 1.5: Limit Legendary Pack purchases to 3 per week per player
 * - 12.1: Synchronize all card draws with server before displaying results
 * - 12.4: Network error recovery with retry and refund
 */
router.post('/draw', async (req: Request, res: Response, next: NextFunction) => {
  let currencyDeducted = false;
  let deductedAmount = 0;
  let deductedCurrencyType: 'soft' | 'hard' = 'soft';
  let playerId: string = '';
  
  try {
    const { packType, quantity = 1, currencyType = 'soft' } = req.body;

    // Validate input
    if (!packType || !['basic', 'premium', 'legendary'].includes(packType)) {
      throw new AppError(
        400,
        'INVALID_PACK_TYPE',
        'Pack type must be one of: basic, premium, legendary',
        false
      );
    }

    if (!['soft', 'hard'].includes(currencyType)) {
      throw new AppError(
        400,
        'INVALID_CURRENCY_TYPE',
        'Currency type must be one of: soft, hard',
        false
      );
    }

    if (quantity < 1 || quantity > 10) {
      throw new AppError(
        400,
        'INVALID_QUANTITY',
        'Quantity must be between 1 and 10',
        false
      );
    }

    // TODO: Get player ID from authentication middleware
    // For now, using a placeholder
    playerId = req.headers['x-player-id'] as string || 'test-player';

    // Get player data with retry logic
    const playerDoc = await performDrawWithRetry(async () => {
      return await collections.players().doc(playerId).get();
    });
    
    if (!playerDoc.exists) {
      throw new AppError(
        404,
        'PLAYER_NOT_FOUND',
        'Player not found',
        false
      );
    }

    const player = playerDoc.data() as Player;

    // Check for active Card Storm event (Requirement 3.4)
    const now = new Date();
    let stormDrawsUsed = 0;
    let stormEventId: string | null = null;
    let stormDrawsRemaining = 0;

    const stormEventsSnapshot = await collections.activeEvents()
      .where('playerId', '==', playerId)
      .where('eventType', '==', 'storm')
      .get();

    // Find a valid (non-expired, unclaimed) storm event with draws remaining
    for (const doc of stormEventsSnapshot.docs) {
      const event = doc.data() as ActiveEvent;
      if (event.claimed) continue;
      if (event.expiresAt && new Date(event.expiresAt) <= now) continue;
      if ((event.stormDrawsRemaining ?? 0) > 0) {
        stormEventId = doc.id;
        stormDrawsRemaining = event.stormDrawsRemaining!;
        break;
      }
    }

    // Determine how many draws are free vs paid
    stormDrawsUsed = Math.min(stormDrawsRemaining, quantity);
    const paidDraws = quantity - stormDrawsUsed;

    // Get pack configuration with retry logic
    const packConfigDoc = await performDrawWithRetry(async () => {
      return await collections.packConfigurations()
        .where('type', '==', packType)
        .limit(1)
        .get();
    });

    if (packConfigDoc.empty) {
      throw new AppError(
        404,
        'PACK_NOT_FOUND',
        `Pack configuration not found for type: ${packType}`,
        false
      );
    }

    const packConfig = packConfigDoc.docs[0].data() as PackConfiguration;

    // Validate currency type matches pack configuration
    if (packConfig.currencyType !== currencyType) {
      throw new AppError(
        400,
        'INVALID_CURRENCY_TYPE',
        `This pack requires ${packConfig.currencyType} currency`,
        false
      );
    }

    // Calculate total cost (free draws from storm event reduce the cost)
    const totalCost = packConfig.cost * paidDraws;

    // Check if player has sufficient currency (only for paid draws)
    const playerCurrency = currencyType === 'soft' ? player.softCurrency : player.hardCurrency;
    if (playerCurrency < totalCost) {
      throw new AppError(
        400,
        'INSUFFICIENT_CURRENCY',
        `Insufficient ${currencyType} currency. Required: ${totalCost}, Available: ${playerCurrency}`,
        false
      );
    }

    // Check purchase limits for legendary packs (Requirement 1.5)
    if (packType === 'legendary') {
      // Check if week has reset
      const weekResetDate = new Date(player.weekResetDate);
      const now = new Date();
      const daysSinceReset = Math.floor((now.getTime() - weekResetDate.getTime()) / (1000 * 60 * 60 * 24));

      let legendaryPacksThisWeek = player.legendaryPacksThisWeek;
      let newWeekResetDate = player.weekResetDate;

      if (daysSinceReset >= 7) {
        // Reset weekly counter
        legendaryPacksThisWeek = 0;
        newWeekResetDate = now.toISOString();
      }

      // Check if purchase would exceed limit
      if (legendaryPacksThisWeek + quantity > 3) {
        throw new AppError(
          400,
          'PURCHASE_LIMIT_EXCEEDED',
          `Legendary pack purchases limited to 3 per week. Current: ${legendaryPacksThisWeek}, Requested: ${quantity}`,
          false,
          { 
            currentPurchases: legendaryPacksThisWeek,
            limit: 3,
            resetDate: newWeekResetDate
          }
        );
      }

      // Update legendary pack counter
      player.legendaryPacksThisWeek = legendaryPacksThisWeek + quantity;
      player.weekResetDate = newWeekResetDate;
    }

    // Get card pool (templates organized by rarity) with retry logic
    const cardTemplatesSnapshot = await performDrawWithRetry(async () => {
      return await collections.cardTemplates().get();
    });
    const cardPool = new Map<CardRarity, Card[]>();

    cardTemplatesSnapshot.docs.forEach((doc: any) => {
      const template = doc.data() as Card;
      const rarity = template.rarity;
      
      if (!cardPool.has(rarity)) {
        cardPool.set(rarity, []);
      }
      cardPool.get(rarity)!.push(template);
    });

    // Validate card pool has cards for all rarities
    const requiredRarities: CardRarity[] = ['common', 'rare', 'epic', 'legendary'];
    for (const rarity of requiredRarities) {
      if (!cardPool.has(rarity) || cardPool.get(rarity)!.length === 0) {
        throw new AppError(
          500,
          'CARD_POOL_INCOMPLETE',
          `No card templates available for rarity: ${rarity}`,
          true
        );
      }
    }

    // Initialize generators
    const drawGenerator = new CardDrawGenerator();
    const luckCalculator = new LuckValueCalculator();
    const nearMissGenerator = new NearMissGenerator();

    // Perform draws
    const drawnCards: Card[] = [];
    const nearMissCards: Card[] = [];
    let currentLuckValue = player.luckValue;
    let drawsSinceLastLegendary = player.drawsSinceLastLegendary;
    let drawsSinceEpic = 0; // Track for pity system

    // Generate transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (let i = 0; i < quantity; i++) {
      // Generate server-side seed (Requirement 12.1)
      const serverSeed = Date.now() + i + Math.random() * 1000000;

      // Perform draw
      const drawnCard = drawGenerator.generateCardDraw(
        packConfig,
        currentLuckValue,
        serverSeed,
        cardPool,
        drawsSinceEpic,
        drawsSinceLastLegendary
      );

      drawnCards.push(drawnCard);

      // Check for near-miss effect (Requirement 1.9)
      const rng = new SeededRandom(serverSeed + 1); // Use different seed for near-miss
      if (nearMissGenerator.shouldShowNearMiss(drawnCard.rarity, rng)) {
        const nearMissCard = nearMissGenerator.generateNearMissCard(
          drawnCard.rarity,
          rng,
          cardPool
        );
        nearMissCards.push(nearMissCard);
      }

      // Update luck value (Requirements 1.6, 1.8)
      const drewLegendary = drawnCard.rarity === 'legendary';
      currentLuckValue = luckCalculator.updateLuckValue(currentLuckValue, drewLegendary);

      // Update pity counters
      if (drewLegendary) {
        drawsSinceLastLegendary = 0;
      } else {
        drawsSinceLastLegendary++;
      }

      if (drawnCard.rarity === 'epic' || drewLegendary) {
        drawsSinceEpic = 0;
      } else {
        drawsSinceEpic++;
      }
    }

    // Deduct currency (only for paid draws; storm free draws are already accounted for)
    if (totalCost > 0) {
      if (currencyType === 'soft') {
        player.softCurrency -= totalCost;
      } else {
        player.hardCurrency -= totalCost;
      }
    }
    
    // Track that currency was deducted for refund purposes
    currencyDeducted = totalCost > 0;
    deductedAmount = totalCost;
    deductedCurrencyType = currencyType;

    // Update player inventory
    player.cards.push(...drawnCards.map(card => card.id));
    player.luckValue = currentLuckValue;
    player.drawsSinceLastLegendary = drawsSinceLastLegendary;

    // Save cards to database
    const batch = collections.cards().firestore.batch();
    
    drawnCards.forEach(card => {
      const cardRef = collections.cards().doc(card.id);
      batch.set(cardRef, card);
    });

    // Update player data
    const playerRef = collections.players().doc(playerId);
    batch.update(playerRef, {
      cards: player.cards,
      luckValue: player.luckValue,
      drawsSinceLastLegendary: player.drawsSinceLastLegendary,
      softCurrency: player.softCurrency,
      hardCurrency: player.hardCurrency,
      legendaryPacksThisWeek: player.legendaryPacksThisWeek,
      weekResetDate: player.weekResetDate,
      lastActiveAt: new Date().toISOString()
    });

    // Update storm event if free draws were used
    if (stormDrawsUsed > 0 && stormEventId) {
      const newStormDrawsRemaining = stormDrawsRemaining - stormDrawsUsed;
      const stormEventRef = collections.activeEvents().doc(stormEventId);
      batch.update(stormEventRef, {
        stormDrawsRemaining: newStormDrawsRemaining,
        ...(newStormDrawsRemaining === 0 ? { claimed: true } : {})
      });
    }

    // Commit transaction with retry logic
    await performDrawWithRetry(async () => {
      return await batch.commit();
    });

    // Track mission progress for card draw actions
    try {
      const seasonService = new SeasonService(getDatabase());
      const drawnLegendary = drawnCards.some(c => c.rarity === 'legendary');
      await seasonService.trackMissionProgress(playerId, 'card_draw', {
        quantity,
        legendary: drawnLegendary,
      });
    } catch (missionError) {
      // Mission tracking failure must not break the draw response
      console.error('Failed to track mission progress for card draw:', missionError);
    }

    // Check if pity system was triggered
    const guaranteedDropTriggered = 
      (packConfig.guaranteedEpicAfter !== undefined && drawsSinceEpic >= packConfig.guaranteedEpicAfter) ||
      (packConfig.guaranteedLegendaryAfter !== undefined && drawsSinceLastLegendary >= packConfig.guaranteedLegendaryAfter);

    // Update personalization preferences and get emotional feedback (Req 9.2, 9.3, 9.4)
    let emotionalFeedback: string | undefined;
    try {
      const personalizationService = new PersonalizationService(getDatabase());
      await personalizationService.updateCollectionPreferences(playerId, drawnCards);
      emotionalFeedback = personalizationService.getEmotionalFeedback({
        cards: drawnCards,
        hadNearMiss: nearMissCards.length > 0
      });
    } catch (personalizationError) {
      // Personalization failure must not break the draw response
      console.error('Failed to update personalization after card draw:', personalizationError);
    }

    // Return response
    res.json({
      cards: drawnCards,
      newLuckValue: currentLuckValue,
      nearMissCards: nearMissCards.length > 0 ? nearMissCards : undefined,
      guaranteedDropTriggered,
      transactionId,
      stormDrawsUsed: stormDrawsUsed > 0 ? stormDrawsUsed : undefined,
      emotionalFeedback
    });

  } catch (error) {
    // If currency was deducted but operation failed, attempt refund
    if (currencyDeducted && playerId) {
      try {
        const playerRef = collections.players().doc(playerId);
        const currentPlayerDoc = await playerRef.get();
        const currentPlayer = currentPlayerDoc.data() as Player;
        
        const refundUpdate: any = {
          lastActiveAt: new Date().toISOString()
        };
        
        if (deductedCurrencyType === 'soft') {
          refundUpdate.softCurrency = currentPlayer.softCurrency + deductedAmount;
        } else {
          refundUpdate.hardCurrency = currentPlayer.hardCurrency + deductedAmount;
        }
        
        await playerRef.update(refundUpdate);
        
        // Add refund information to error
        if (error instanceof AppError) {
          error.details = {
            ...error.details,
            refunded: true,
            refundAmount: deductedAmount,
            refundCurrency: deductedCurrencyType
          };
        }
      } catch (refundError) {
        // Log refund failure but don't override original error
        console.error('Failed to refund currency after draw failure:', refundError);
      }
    }
    
    next(error);
  }
});

/**
 * GET /api/v1/cards/packs
 * 
 * Get all available pack configurations
 * Filters by availability dates and season exclusivity
 * 
 * Validates Requirements:
 * - 1.1: Basic Pack configuration
 * - 1.2: Premium Pack configuration
 * - 1.4: Legendary Pack configuration
 */
router.get('/packs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all pack configurations
    const packConfigsSnapshot = await collections.packConfigurations().get();
    
    if (packConfigsSnapshot.empty) {
      return res.json({ packs: [] });
    }

    const now = new Date();
    const availablePacks: PackConfiguration[] = [];

    // Fetch current season once for season exclusivity checks
    const seasonService = new SeasonService(getDatabase());
    const currentSeason = await seasonService.getCurrentSeason();

    // Filter packs based on availability
    for (const doc of packConfigsSnapshot.docs) {
      const pack = (doc as any).data() as PackConfiguration;
      
      // Check availability dates
      if (pack.availableFrom) {
        const availableFrom = new Date(pack.availableFrom);
        if (now < availableFrom) {
          continue; // Pack not yet available
        }
      }

      if (pack.availableUntil) {
        const availableUntil = new Date(pack.availableUntil);
        if (now > availableUntil) {
          continue; // Pack no longer available
        }
      }

      // Filter by season exclusivity
      if (pack.seasonExclusive) {
        if (!currentSeason || !currentSeason.exclusivePacks.includes(pack.id)) {
          continue; // Pack not available in current season
        }
      }

      availablePacks.push(pack);
    }

    // Sort packs by player preference (Req 9.2)
    let sortedPacks = availablePacks;
    try {
      const playerId = req.headers['x-player-id'] as string || 'test-player';
      const personalizationService = new PersonalizationService(getDatabase());
      sortedPacks = await personalizationService.getPackRecommendations(playerId, availablePacks);
    } catch (personalizationError) {
      // Personalization failure falls back to unsorted packs
      console.error('Failed to get pack recommendations:', personalizationError);
    }

    res.json({ packs: sortedPacks });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cards/luck
 * 
 * Get player's current luck value and draw count
 * 
 * Validates Requirements:
 * - 1.6: Track luck value that increases after unsuccessful legendary pulls
 * - 1.7: Increase legendary drop probability based on luck value
 */
router.get('/luck', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Get player ID from authentication middleware
    // For now, using a placeholder
    const playerId = req.headers['x-player-id'] as string || 'test-player';

    // Get player data
    const playerDoc = await collections.players().doc(playerId).get();
    if (!playerDoc.exists) {
      throw new AppError(
        404,
        'PLAYER_NOT_FOUND',
        'Player not found',
        false
      );
    }

    const player = playerDoc.data() as Player;

    // Return luck value and draw count
    res.json({
      luckValue: player.luckValue,
      drawsSinceLastLegendary: player.drawsSinceLastLegendary
    });

  } catch (error) {
    next(error);
  }
});

export default router;
