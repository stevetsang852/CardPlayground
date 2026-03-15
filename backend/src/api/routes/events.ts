import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { collections, getDatabase } from '../../config/database';
import { AchievementService } from '../../services/achievementService';
import { EventTriggerSystem } from '@shared/events/EventTriggerSystem';
import { SeededRandom } from '@shared/random/SeededRandom';
import { ActiveEvent, EventConfiguration } from '@shared/types/event';
import { Player } from '@shared/types/player';
import { Card } from '@shared/types/card';

const router = Router();

/**
 * POST /api/v1/events/trigger
 * 
 * Check for event triggers based on action type
 * Creates and persists active events if triggered
 * 
 * Validates Requirements:
 * - 3.1: Mysterious Merchant event with 10% probability
 * - 3.3: Card Storm event with 5% probability
 * - 3.5: Lucky Moment event with 15% probability
 * - 3.7: Copy Miracle event with 10% probability
 */
router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { actionType, context = {} } = req.body;

    // Validate input
    if (!actionType || typeof actionType !== 'string') {
      throw new AppError(
        400,
        'INVALID_ACTION_TYPE',
        'Action type must be a non-empty string',
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

    // Get player's cards for Copy Miracle event
    const playerCards: Card[] = [];
    if (player.cards && player.cards.length > 0) {
      const cardDocs = await Promise.all(
        player.cards.map(cardId => collections.cards().doc(cardId).get())
      );
      
      cardDocs.forEach(doc => {
        if (doc.exists) {
          playerCards.push(doc.data() as Card);
        }
      });
    }

    // Initialize event configurations based on design document
    // Requirements: 3.1 (10%), 3.3 (5%), 3.5 (15%), 3.7 (10%)
    const eventConfigs: EventConfiguration[] = [
      { eventType: 'merchant', probability: 10 },
      { eventType: 'storm', probability: 5 },
      { eventType: 'lucky', probability: 15, duration: 10 },
      { eventType: 'copy', probability: 10 }
    ];

    // Generate server-side seed for deterministic event triggering
    const serverSeed = Date.now() + Math.random() * 1000000;
    const rng = new SeededRandom(serverSeed);

    // Initialize event trigger system
    const eventTriggerSystem = new EventTriggerSystem(eventConfigs);

    // Check for event trigger
    const triggeredEvent = eventTriggerSystem.checkForEvent(
      playerId,
      playerCards,
      rng
    );

    if (!triggeredEvent) {
      // No event triggered
      return res.json({
        eventTriggered: false
      });
    }

    // Persist the active event to database
    const eventRef = collections.activeEvents().doc(triggeredEvent.id);
    await eventRef.set(triggeredEvent);

    // Update player's last active timestamp
    await collections.players().doc(playerId).update({
      lastActiveAt: new Date().toISOString()
    });

    // Trigger achievement checks for merchant events (Req 6.4: merchant streak)
    let unlockedAchievements: any[] = [];
    if (triggeredEvent.eventType === 'merchant') {
      const achievementService = new AchievementService(getDatabase());
      unlockedAchievements = await achievementService.checkAndUnlockAchievements(
        playerId,
        'merchant_trigger',
        {}
      );
    }

    // Prepare response based on event type
    const eventResponse: any = {
      type: triggeredEvent.eventType
    };

    switch (triggeredEvent.eventType) {
      case 'merchant':
        eventResponse.offers = triggeredEvent.merchantOffers;
        eventResponse.unlockedAchievements = unlockedAchievements;
        break;
      
      case 'storm':
        eventResponse.rewards = {
          freeDraws: triggeredEvent.stormDrawsRemaining
        };
        break;
      
      case 'lucky':
        eventResponse.duration = 10; // 10 minutes
        eventResponse.bonus = triggeredEvent.luckyMomentBonus;
        break;
      
      case 'copy':
        eventResponse.rewards = {
          copiedCard: triggeredEvent.copiedCard
        };
        break;
    }

    // Push real-time event notification via WebSocket
    try {
      const wsManager = req.app.get('wsManager');
      if (wsManager) {
        wsManager.broadcastEventNotification(playerId, eventResponse);
      }
    } catch (_wsErr) {
      // Non-fatal: WebSocket notification failure should not block the response
    }

    // Return response
    res.json({
      eventTriggered: true,
      event: eventResponse
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/events/active
 * 
 * Get all active events for a player
 * Filters out expired events
 * 
 * Validates Requirements:
 * - 3.6: Lucky Moment event duration and expiration
 */
router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Get player ID from authentication middleware
    const playerId = req.headers['x-player-id'] as string || 'test-player';

    // Get player data to verify player exists
    const playerDoc = await collections.players().doc(playerId).get();
    if (!playerDoc.exists) {
      throw new AppError(
        404,
        'PLAYER_NOT_FOUND',
        'Player not found',
        false
      );
    }

    // Query active events for this player
    const activeEventsSnapshot = await collections.activeEvents()
      .where('playerId', '==', playerId)
      .get();

    const now = new Date();
    const activeEvents: ActiveEvent[] = [];

    // Filter out expired events
    activeEventsSnapshot.forEach(doc => {
      const event = doc.data() as ActiveEvent;
      
      // Check if event has expired
      if (event.expiresAt) {
        const expiresAt = new Date(event.expiresAt);
        if (expiresAt <= now) {
          // Event has expired, skip it
          return;
        }
      }
      
      // Event is still active
      activeEvents.push(event);
    });

    // Return active events
    res.json({
      activeEvents
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/events/accept
 * 
 * Accept event offer and distribute rewards
 * Processes merchant offers, Card Storm draws, and Copy Miracle duplications
 * Marks event as claimed
 * 
 * Validates Requirements:
 * - 3.2: Mysterious Merchant offer acceptance
 * - 3.4: Card Storm free draws distribution
 * - 3.8: Copy Miracle card duplication
 */
router.post('/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, offerId } = req.body;

    // Validate input
    if (!eventId || typeof eventId !== 'string') {
      throw new AppError(
        400,
        'INVALID_EVENT_ID',
        'Event ID must be a non-empty string',
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

    // Get the event
    const eventDoc = await collections.activeEvents().doc(eventId).get();
    if (!eventDoc.exists) {
      throw new AppError(
        404,
        'EVENT_NOT_FOUND',
        'Event not found',
        false
      );
    }

    const event = eventDoc.data() as ActiveEvent;

    // Verify event belongs to this player
    if (event.playerId !== playerId) {
      throw new AppError(
        403,
        'EVENT_NOT_OWNED',
        'This event does not belong to the current player',
        false
      );
    }

    // Check if event is already claimed
    if (event.claimed) {
      throw new AppError(
        400,
        'EVENT_ALREADY_CLAIMED',
        'This event has already been claimed',
        false
      );
    }

    // Check if event has expired
    if (event.expiresAt) {
      const expiresAt = new Date(event.expiresAt);
      const now = new Date();
      if (expiresAt <= now) {
        throw new AppError(
          400,
          'EVENT_EXPIRED',
          'This event has expired',
          false
        );
      }
    }

    // Process event based on type
    let rewards: any = {};

    switch (event.eventType) {
      case 'merchant':
        // Validate offerId is provided for merchant events
        if (!offerId || typeof offerId !== 'string') {
          throw new AppError(
            400,
            'INVALID_OFFER_ID',
            'Offer ID must be provided for merchant events',
            false
          );
        }

        // Find the offer
        const offer = event.merchantOffers?.find(o => o.id === offerId);
        if (!offer) {
          throw new AppError(
            404,
            'OFFER_NOT_FOUND',
            'Offer not found in this event',
            false
          );
        }

        // Check if player has sufficient currency
        const currencyField = offer.currencyType === 'soft' ? 'softCurrency' : 'hardCurrency';
        if (player[currencyField] < offer.price) {
          throw new AppError(
            400,
            'INSUFFICIENT_CURRENCY',
            `Insufficient ${offer.currencyType} currency`,
            false
          );
        }

        // Deduct currency
        await collections.players().doc(playerId).update({
          [currencyField]: player[currencyField] - offer.price
        });

        // Grant the item based on type
        // For now, we'll just return the offer details
        // In a full implementation, this would create the actual item
        rewards = {
          purchasedOffer: offer,
          remainingCurrency: player[currencyField] - offer.price
        };
        break;

      case 'storm':
        // Grant free draws
        if (event.stormDrawsRemaining === undefined || event.stormDrawsRemaining <= 0) {
          throw new AppError(
            400,
            'NO_DRAWS_REMAINING',
            'No free draws remaining for this event',
            false
          );
        }

        rewards = {
          freeDraws: event.stormDrawsRemaining
        };
        break;

      case 'copy':
        // Duplicate the card
        if (!event.copiedCard) {
          throw new AppError(
            400,
            'NO_CARD_TO_COPY',
            'No card specified for duplication',
            false
          );
        }

        // Create a new card instance with the same template
        const newCardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newCard: Card = {
          ...event.copiedCard,
          id: newCardId,
          obtainedAt: new Date().toISOString(),
          obtainedFrom: 'event'
        };

        // Save the new card
        await collections.cards().doc(newCardId).set(newCard);

        // Add card to player's collection
        const updatedCards = [...player.cards, newCardId];
        await collections.players().doc(playerId).update({
          cards: updatedCards
        });

        rewards = {
          duplicatedCard: newCard
        };
        break;

      case 'lucky':
        // Lucky Moment doesn't require acceptance, it's automatically active
        throw new AppError(
          400,
          'INVALID_EVENT_TYPE',
          'Lucky Moment events do not require acceptance',
          false
        );

      default:
        throw new AppError(
          400,
          'INVALID_EVENT_TYPE',
          'Unknown event type',
          false
        );
    }

    // Mark event as claimed
    await collections.activeEvents().doc(eventId).update({
      claimed: true
    });

    // Return success response
    res.json({
      success: true,
      rewards
    });

  } catch (error) {
    next(error);
  }
});

export default router;
