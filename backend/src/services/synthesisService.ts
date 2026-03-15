import { Card, CardRarity } from '@shared/types/card';
import { Player } from '@shared/types/player';
import { SynthesisRecipe } from '@shared/types/synthesis';
import { collections } from '../config/database';
import { AppError } from '../api/middleware/errorHandler';

/**
 * SynthesisService - Handles card consumption and synthesis operations
 * 
 * Validates Requirements:
 * - 2.5: Consume input cards on synthesis attempt
 * - 12.2: Validate synthesis attempts on server before processing results
 */
export class SynthesisService {
  /**
   * Validates that all input cards exist in player's inventory
   * 
   * @param player - The player attempting synthesis
   * @param inputCardIds - Array of card IDs to be consumed
   * @returns Array of Card objects if all cards exist
   * @throws AppError if any card is missing or not owned by player
   */
  async validateInputCards(
    player: Player,
    inputCardIds: string[]
  ): Promise<Card[]> {
    const cards: Card[] = [];
    
    for (const cardId of inputCardIds) {
      // Check if card is in player's inventory
      if (!player.cards.includes(cardId)) {
        throw new AppError(
          400,
          'CARD_NOT_OWNED',
          `Card ${cardId} not found in player inventory`,
          false
        );
      }
      
      // Fetch card from database
      const cardDoc = await collections.cards().doc(cardId).get();
      if (!cardDoc.exists) {
        throw new AppError(
          404,
          'CARD_NOT_FOUND',
          `Card ${cardId} not found in database`,
          false
        );
      }
      
      cards.push(cardDoc.data() as Card);
    }
    
    return cards;
  }

  /**
   * Validates that input cards meet recipe requirements
   * 
   * @param cards - Array of cards to validate
   * @param recipe - The synthesis recipe with requirements
   * @throws AppError if cards don't meet recipe requirements
   */
  validateRecipeRequirements(
    cards: Card[],
    recipe: SynthesisRecipe
  ): void {
    // Check card count
    if (cards.length !== recipe.requiredCards.count) {
      throw new AppError(
        400,
        'INVALID_CARD_COUNT',
        `Recipe requires ${recipe.requiredCards.count} cards, but ${cards.length} provided`,
        false
      );
    }
    
    // Check if cards must be identical
    if (recipe.requiredCards.mustBeIdentical) {
      const firstTemplateId = cards[0].templateId;
      const allIdentical = cards.every(card => card.templateId === firstTemplateId);
      
      if (!allIdentical) {
        throw new AppError(
          400,
          'CARDS_NOT_IDENTICAL',
          'Recipe requires all cards to be identical',
          false
        );
      }
    }
    
    // Check rarity requirement
    if (recipe.requiredCards.rarityRequirement) {
      const requiredRarity = recipe.requiredCards.rarityRequirement as CardRarity;
      const allMeetRarity = cards.every(card => card.rarity === requiredRarity);
      
      if (!allMeetRarity) {
        throw new AppError(
          400,
          'INVALID_CARD_RARITY',
          `Recipe requires all cards to be ${requiredRarity} rarity`,
          false
        );
      }
    }
  }

  /**
   * Atomically removes input cards from player inventory
   * This operation is part of a database transaction to ensure atomicity
   * 
   * @param player - The player whose cards will be removed
   * @param inputCardIds - Array of card IDs to remove
   * @returns Updated player card array
   */
  removeCardsFromInventory(
    player: Player,
    inputCardIds: string[]
  ): string[] {
    // Create a copy of the player's cards array
    const updatedCards = [...player.cards];
    
    // Remove each input card
    for (const cardId of inputCardIds) {
      const index = updatedCards.indexOf(cardId);
      if (index > -1) {
        updatedCards.splice(index, 1);
      }
    }
    
    return updatedCards;
  }

  /**
   * Generates an output card based on synthesis recipe
   * Only called when synthesis succeeds
   * 
   * @param recipe - The synthesis recipe
   * @param playerId - The player ID who will own the card
   * @param cardPool - Map of card templates by rarity
   * @returns The generated output card
   */
  generateOutputCard(
    recipe: SynthesisRecipe,
    playerId: string,
    cardPool: Map<CardRarity, Card[]>
  ): Card {
    const outputRarity = recipe.outputRarity as CardRarity;
    
    // Get available cards of the output rarity
    const availableCards = cardPool.get(outputRarity);
    if (!availableCards || availableCards.length === 0) {
      throw new AppError(
        500,
        'NO_CARDS_AVAILABLE',
        `No card templates available for rarity: ${outputRarity}`,
        true
      );
    }
    
    // Select a random card template
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const template = availableCards[randomIndex];
    
    // Create new card instance
    const newCard: Card = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId: template.templateId,
      name: template.name,
      description: template.description,
      rarity: template.rarity,
      theme: template.theme,
      imageUrl: template.imageUrl,
      animationUrl: template.animationUrl,
      score: template.score,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'synthesis'
    };
    
    return newCard;
  }
}
