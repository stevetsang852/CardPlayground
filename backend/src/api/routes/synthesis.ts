import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { collections, getDatabase } from '../../config/database';
import { AchievementService } from '../../services/achievementService';
import { SeasonService } from '../../services/seasonService';
import { SynthesisCalculator } from '@shared/synthesis/SynthesisCalculator';
import { SeededRandom } from '@shared/random/SeededRandom';
import { Card, CardRarity } from '@shared/types/card';
import { SynthesisRecipe, SynthesisType } from '@shared/types/synthesis';
import { Player } from '@shared/types/player';
import { ActiveEvent } from '@shared/types/event';

const router = Router();

/**
 * POST /api/v1/synthesis/combine
 * 
 * Attempt card synthesis with server-side validation
 * 
 * Validates Requirements:
 * - 2.1: Normal Synthesis (3 identical cards, 100% success)
 * - 2.2: Advanced Synthesis (2 identical + 1 different, 70% success)
 * - 2.3: Gambler Synthesis (1 card + 1 material, 50% success)
 * - 2.4: Legendary Synthesis (5 epic cards, 30% success)
 * - 2.5: Failed synthesis consumes input cards
 * - 2.8: Lucky Moment event increases success rate by 20%
 * - 12.2: Server-side validation before processing
 */
router.post('/combine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { synthesisType, inputCardIds, materialIds } = req.body;

    // Validate input
    if (!synthesisType || !['normal', 'advanced', 'gambler', 'legendary'].includes(synthesisType)) {
      throw new AppError(
        400,
        'INVALID_SYNTHESIS_TYPE',
        'Synthesis type must be one of: normal, advanced, gambler, legendary',
        false
      );
    }

    if (!inputCardIds || !Array.isArray(inputCardIds) || inputCardIds.length === 0) {
      throw new AppError(
        400,
        'INVALID_INPUT_CARDS',
        'Input card IDs must be a non-empty array',
        false
      );
    }

    // TODO: Get player ID from authentication middleware
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

    // Get synthesis recipe configuration
    // For now, using hardcoded recipes based on design document
    const recipe = getSynthesisRecipe(synthesisType as SynthesisType);

    // Validate input card count matches recipe requirements
    if (inputCardIds.length !== recipe.requiredCards.count) {
      throw new AppError(
        400,
        'INVALID_CARD_COUNT',
        `${synthesisType} synthesis requires exactly ${recipe.requiredCards.count} cards, but ${inputCardIds.length} were provided`,
        false
      );
    }

    // Validate all input cards exist in player's inventory
    const invalidCards = inputCardIds.filter(cardId => !player.cards.includes(cardId));
    if (invalidCards.length > 0) {
      throw new AppError(
        400,
        'CARDS_NOT_OWNED',
        `Player does not own the following cards: ${invalidCards.join(', ')}`,
        false
      );
    }

    // Fetch card details from database
    const cardDocs = await Promise.all(
      inputCardIds.map(cardId => collections.cards().doc(cardId).get())
    );

    const inputCards: Card[] = [];
    for (let i = 0; i < cardDocs.length; i++) {
      const doc = cardDocs[i];
      if (!doc.exists) {
        throw new AppError(
          404,
          'CARD_NOT_FOUND',
          `Card not found: ${inputCardIds[i]}`,
          false
        );
      }
      inputCards.push(doc.data() as Card);
    }

    // Validate recipe requirements
    validateRecipeRequirements(inputCards, recipe);

    // Get active events for the player
    const activeEventsSnapshot = await collections.activeEvents()
      .where('playerId', '==', playerId)
      .get();

    const activeEvents: ActiveEvent[] = [];
    const now = new Date();

    activeEventsSnapshot.docs.forEach((doc: any) => {
      const event = doc.data() as ActiveEvent;
      
      // Filter out expired events
      if (event.expiresAt) {
        const expiresAt = new Date(event.expiresAt);
        if (now > expiresAt) {
          return; // Skip expired event
        }
      }
      
      activeEvents.push(event);
    });

    // Initialize synthesis calculator
    const calculator = new SynthesisCalculator();

    // Calculate success rate with modifiers
    const successRate = calculator.calculateSuccessRate(
      recipe,
      activeEvents,
      player.consecutiveSynthesisFailures
    );

    // Generate server-side seed for deterministic synthesis (Requirement 12.2)
    const serverSeed = Date.now() + Math.random() * 1000000;
    const rng = new SeededRandom(serverSeed);

    // Perform synthesis
    const synthesisSucceeded = calculator.performSynthesis(recipe, successRate, rng);

    // Get card pool for output card generation
    const cardTemplatesSnapshot = await collections.cardTemplates().get();
    const cardPool = new Map<CardRarity, Card[]>();

    cardTemplatesSnapshot.docs.forEach((doc: any) => {
      const template = doc.data() as Card;
      const rarity = template.rarity;
      
      if (!cardPool.has(rarity)) {
        cardPool.set(rarity, []);
      }
      cardPool.get(rarity)!.push(template);
    });

    // Prepare database transaction
    const batch = collections.cards().firestore.batch();
    const playerRef = collections.players().doc(playerId);

    // Remove input cards from player inventory (Requirement 2.5)
    const updatedCards = player.cards.filter(cardId => !inputCardIds.includes(cardId));

    let outputCard: Card | undefined;
    let newFailureCount = player.consecutiveSynthesisFailures;

    if (synthesisSucceeded) {
      // Generate output card
      outputCard = generateOutputCard(recipe, playerId, cardPool, rng);
      
      // Add output card to database
      const cardRef = collections.cards().doc(outputCard.id);
      batch.set(cardRef, outputCard);
      
      // Add output card to player inventory
      updatedCards.push(outputCard.id);
      
      // Reset failure count on success
      newFailureCount = 0;
    } else {
      // Increment failure count on failure
      newFailureCount++;
    }

    // Delete consumed input cards from database
    inputCardIds.forEach(cardId => {
      const cardRef = collections.cards().doc(cardId);
      batch.delete(cardRef);
    });

    // Update player data
    batch.update(playerRef, {
      cards: updatedCards,
      consecutiveSynthesisFailures: newFailureCount,
      lastActiveAt: new Date().toISOString()
    });

    // Commit transaction
    await batch.commit();

    // Track mission progress for synthesis actions
    try {
      const seasonService = new SeasonService(getDatabase());
      await seasonService.trackMissionProgress(playerId, 'card_synthesis', {
        success: synthesisSucceeded,
      });
    } catch (missionError) {
      // Mission tracking failure must not break the synthesis response
      console.error('Failed to track mission progress for synthesis:', missionError);
    }

    // Check achievements after successful commit
    const achievementService = new AchievementService(getDatabase());
    const unlockedAchievements = await achievementService.checkAndUnlockAchievements(
      playerId,
      'card_synthesis',
      { success: synthesisSucceeded }
    );

    // Check if failure protection is now active
    const protectionActive = newFailureCount >= 3;

    // Build active modifiers list for response (Requirement 3.6)
    const activeModifiers = activeEvents.map(event => ({
      type: event.eventType,
      bonus: event.luckyMomentBonus || 0,
      expiresAt: event.expiresAt
    }));

    // Include failure protection modifier if it was active during this synthesis
    if (player.consecutiveSynthesisFailures >= 3) {
      activeModifiers.push({
        type: 'failure_protection' as any,
        bonus: 0.10,
        expiresAt: undefined
      });
    }

    // Return response
    res.json({
      success: synthesisSucceeded,
      outputCard: outputCard || undefined,
      consumedCards: inputCardIds,
      failureCount: newFailureCount,
      protectionActive,
      unlockedAchievements,
      appliedSuccessRate: successRate,
      activeModifiers
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get synthesis recipe configuration based on type
 * 
 * Based on design document specifications:
 * - Normal: 3 identical cards, 100% success
 * - Advanced: 2 identical + 1 different, 70% success
 * - Gambler: 1 card + 1 material, 50% success
 * - Legendary: 5 epic cards, 30% success
 */
function getSynthesisRecipe(type: SynthesisType): SynthesisRecipe {
  switch (type) {
    case 'normal':
      return {
        type: 'normal',
        requiredCards: { count: 3, mustBeIdentical: true },
        outputRarity: 'rare',
        baseSuccessRate: 1.0
      };
    
    case 'advanced':
      return {
        type: 'advanced',
        requiredCards: { count: 3, mustBeIdentical: false },
        outputRarity: 'epic',
        baseSuccessRate: 0.7
      };
    
    case 'gambler':
      return {
        type: 'gambler',
        requiredCards: { count: 2, mustBeIdentical: false },
        outputRarity: 'epic',
        baseSuccessRate: 0.5
      };
    
    case 'legendary':
      return {
        type: 'legendary',
        requiredCards: { count: 5, mustBeIdentical: false, rarityRequirement: 'epic' },
        outputRarity: 'legendary',
        baseSuccessRate: 0.3
      };
  }
}

/**
 * Validate that input cards meet recipe requirements
 */
function validateRecipeRequirements(cards: Card[], recipe: SynthesisRecipe): void {
  // Check if cards must be identical
  if (recipe.requiredCards.mustBeIdentical) {
    const firstTemplateId = cards[0].templateId;
    const allIdentical = cards.every(card => card.templateId === firstTemplateId);
    
    if (!allIdentical) {
      throw new AppError(
        400,
        'CARDS_NOT_IDENTICAL',
        `${recipe.type} synthesis requires all cards to be identical`,
        false
      );
    }
  }

  // Check rarity requirement
  if (recipe.requiredCards.rarityRequirement) {
    const requiredRarity = recipe.requiredCards.rarityRequirement;
    const allMeetRarity = cards.every(card => card.rarity === requiredRarity);
    
    if (!allMeetRarity) {
      throw new AppError(
        400,
        'INVALID_CARD_RARITY',
        `${recipe.type} synthesis requires all cards to be ${requiredRarity} rarity`,
        false
      );
    }
  }
}

/**
 * Generate output card from synthesis
 */
function generateOutputCard(
  recipe: SynthesisRecipe,
  playerId: string,
  cardPool: Map<CardRarity, Card[]>,
  rng: SeededRandom
): Card {
  const outputRarity = recipe.outputRarity as CardRarity;
  
  // Get available cards of output rarity
  const availableCards = cardPool.get(outputRarity);
  if (!availableCards || availableCards.length === 0) {
    throw new AppError(
      500,
      'NO_CARDS_AVAILABLE',
      `No card templates available for rarity: ${outputRarity}`,
      true
    );
  }

  // Select random card template
  const templateIndex = Math.floor(rng.next() * availableCards.length);
  const template = availableCards[templateIndex];

  // Create new card instance
  const cardId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    ...template,
    id: cardId,
    obtainedAt: new Date().toISOString(),
    obtainedFrom: 'synthesis'
  };
}

/**
 * GET /api/v1/synthesis/rates
 * 
 * Get current synthesis success rates with active modifiers
 * 
 * Validates Requirements:
 * - 2.1: Normal Synthesis (100% base success rate)
 * - 2.2: Advanced Synthesis (70% base success rate)
 * - 2.3: Gambler Synthesis (50% base success rate)
 * - 2.4: Legendary Synthesis (30% base success rate)
 * - 2.8: Lucky Moment event increases success rates by 20%
 */
router.get('/rates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Get player ID from authentication middleware
    const playerId = req.headers['x-player-id'] as string || 'test-player';

    // Get player data to check failure count
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

    // Get active events for the player
    const activeEventsSnapshot = await collections.activeEvents()
      .where('playerId', '==', playerId)
      .get();

    const activeEvents: ActiveEvent[] = [];
    const now = new Date();

    activeEventsSnapshot.docs.forEach((doc: any) => {
      const event = doc.data() as ActiveEvent;
      
      // Filter out expired events
      if (event.expiresAt) {
        const expiresAt = new Date(event.expiresAt);
        if (now > expiresAt) {
          return; // Skip expired event
        }
      }
      
      activeEvents.push(event);
    });

    // Initialize synthesis calculator
    const calculator = new SynthesisCalculator();

    // Get base recipes for all synthesis types
    const normalRecipe = getSynthesisRecipe('normal');
    const advancedRecipe = getSynthesisRecipe('advanced');
    const gamblerRecipe = getSynthesisRecipe('gambler');
    const legendaryRecipe = getSynthesisRecipe('legendary');

    // Calculate current success rates with active modifiers
    const rates = {
      normal: calculator.calculateSuccessRate(
        normalRecipe,
        activeEvents,
        player.consecutiveSynthesisFailures
      ),
      advanced: calculator.calculateSuccessRate(
        advancedRecipe,
        activeEvents,
        player.consecutiveSynthesisFailures
      ),
      gambler: calculator.calculateSuccessRate(
        gamblerRecipe,
        activeEvents,
        player.consecutiveSynthesisFailures
      ),
      legendary: calculator.calculateSuccessRate(
        legendaryRecipe,
        activeEvents,
        player.consecutiveSynthesisFailures
      )
    };

    // Extract active modifiers for response
    const activeModifiers = activeEvents.map(event => ({
      type: event.eventType,
      bonus: event.luckyMomentBonus || 0,
      expiresAt: event.expiresAt
    }));

    // Add failure protection modifier if active
    if (player.consecutiveSynthesisFailures >= 3) {
      activeModifiers.push({
        type: 'failure_protection' as any,
        bonus: 0.10,
        expiresAt: undefined
      });
    }

    // Return response
    res.json({
      rates,
      activeModifiers
    });

  } catch (error) {
    next(error);
  }
});

export default router;
