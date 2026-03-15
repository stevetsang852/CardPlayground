import { SynthesisService } from './synthesisService';
import { Card, CardRarity } from '@shared/types/card';
import { Player } from '@shared/types/player';
import { SynthesisRecipe } from '@shared/types/synthesis';
import { AppError } from '../api/middleware/errorHandler';
import { collections } from '../config/database';

// Mock the database collections
jest.mock('../config/database', () => ({
  collections: {
    cards: jest.fn(() => ({
      doc: jest.fn(),
      get: jest.fn()
    }))
  }
}));

describe('SynthesisService', () => {
  let service: SynthesisService;
  let mockPlayer: Player;
  let mockCards: Card[];
  
  beforeEach(() => {
    service = new SynthesisService();
    
    // Create mock player
    mockPlayer = {
      id: 'player1',
      username: 'testplayer',
      email: 'test@example.com',
      softCurrency: 1000,
      hardCurrency: 100,
      cards: ['card1', 'card2', 'card3'],
      galleryCardIds: [],
      level: 1,
      experience: 0,
      battlePassLevel: 0,
      battlePassXP: 0,
      hasPaidBattlePass: false,
      luckValue: 0,
      drawsSinceLastLegendary: 0,
      consecutiveSynthesisFailures: 0,
      consecutiveLoginDays: 0,
      lastLoginDate: new Date().toISOString(),
      totalPlayTime: 0,
      preferredThemes: [],
      collectionFocus: [],
      friends: [],
      legendaryPacksThisWeek: 0,
      weekResetDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    // Create mock cards
    mockCards = [
      {
        id: 'card1',
        templateId: 'template1',
        name: 'Test Card 1',
        description: 'A test card',
        rarity: 'rare' as CardRarity,
        theme: 'test',
        imageUrl: 'http://example.com/card1.png',
        score: 100,
        isLimitedEdition: false,
        obtainedAt: new Date().toISOString(),
        obtainedFrom: 'draw'
      },
      {
        id: 'card2',
        templateId: 'template1',
        name: 'Test Card 2',
        description: 'A test card',
        rarity: 'rare' as CardRarity,
        theme: 'test',
        imageUrl: 'http://example.com/card2.png',
        score: 100,
        isLimitedEdition: false,
        obtainedAt: new Date().toISOString(),
        obtainedFrom: 'draw'
      },
      {
        id: 'card3',
        templateId: 'template1',
        name: 'Test Card 3',
        description: 'A test card',
        rarity: 'rare' as CardRarity,
        theme: 'test',
        imageUrl: 'http://example.com/card3.png',
        score: 100,
        isLimitedEdition: false,
        obtainedAt: new Date().toISOString(),
        obtainedFrom: 'draw'
      }
    ];
  });

  describe('validateInputCards', () => {
    it('should validate cards exist in player inventory', async () => {
      // Mock database responses
      const mockCardDoc = {
        exists: true,
        data: () => mockCards[0]
      };
      
      const mockDoc = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockCardDoc)
      });
      
      (collections.cards as jest.Mock).mockReturnValue({
        doc: mockDoc
      });
      
      const result = await service.validateInputCards(mockPlayer, ['card1']);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('card1');
    });
    
    it('should throw error if card not in player inventory', async () => {
      await expect(
        service.validateInputCards(mockPlayer, ['card999'])
      ).rejects.toThrow(AppError);
    });
    
    it('should throw error if card not found in database', async () => {
      const mockCardDoc = {
        exists: false
      };
      
      const mockDoc = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockCardDoc)
      });
      
      (collections.cards as jest.Mock).mockReturnValue({
        doc: mockDoc
      });
      
      await expect(
        service.validateInputCards(mockPlayer, ['card1'])
      ).rejects.toThrow(AppError);
    });
  });

  describe('validateRecipeRequirements', () => {
    const normalRecipe: SynthesisRecipe = {
      type: 'normal',
      requiredCards: { count: 3, mustBeIdentical: true },
      outputRarity: 'epic',
      baseSuccessRate: 1.0
    };
    
    it('should validate correct card count', () => {
      expect(() => {
        service.validateRecipeRequirements(mockCards, normalRecipe);
      }).not.toThrow();
    });
    
    it('should throw error for incorrect card count', () => {
      expect(() => {
        service.validateRecipeRequirements([mockCards[0]], normalRecipe);
      }).toThrow(AppError);
    });
    
    it('should validate identical cards when required', () => {
      expect(() => {
        service.validateRecipeRequirements(mockCards, normalRecipe);
      }).not.toThrow();
    });
    
    it('should throw error for non-identical cards when required', () => {
      const differentCards = [
        mockCards[0],
        { ...mockCards[1], templateId: 'template2' },
        mockCards[2]
      ];
      
      expect(() => {
        service.validateRecipeRequirements(differentCards, normalRecipe);
      }).toThrow(AppError);
    });
    
    it('should validate rarity requirement', () => {
      const legendaryRecipe: SynthesisRecipe = {
        type: 'legendary',
        requiredCards: { count: 3, mustBeIdentical: false, rarityRequirement: 'rare' },
        outputRarity: 'legendary',
        baseSuccessRate: 0.3
      };
      
      expect(() => {
        service.validateRecipeRequirements(mockCards, legendaryRecipe);
      }).not.toThrow();
    });
  });

  describe('removeCardsFromInventory', () => {
    it('should remove cards from player inventory', () => {
      const result = service.removeCardsFromInventory(mockPlayer, ['card1', 'card2']);
      
      expect(result).toHaveLength(1);
      expect(result).toContain('card3');
      expect(result).not.toContain('card1');
      expect(result).not.toContain('card2');
    });
    
    it('should handle removing all cards', () => {
      const result = service.removeCardsFromInventory(mockPlayer, ['card1', 'card2', 'card3']);
      
      expect(result).toHaveLength(0);
    });
    
    it('should not modify original player cards array', () => {
      const originalCards = [...mockPlayer.cards];
      service.removeCardsFromInventory(mockPlayer, ['card1']);
      
      expect(mockPlayer.cards).toEqual(originalCards);
    });
  });
  
  describe('generateOutputCard', () => {
    it('should generate output card with correct rarity', () => {
      const recipe: SynthesisRecipe = {
        type: 'normal',
        requiredCards: { count: 3, mustBeIdentical: true },
        outputRarity: 'epic',
        baseSuccessRate: 1.0
      };
      
      const cardPool = new Map<CardRarity, Card[]>();
      cardPool.set('epic', [
        {
          id: 'template_epic1',
          templateId: 'template_epic1',
          name: 'Epic Card',
          description: 'An epic card',
          rarity: 'epic' as CardRarity,
          theme: 'test',
          imageUrl: 'http://example.com/epic.png',
          score: 500,
          isLimitedEdition: false,
          obtainedAt: new Date().toISOString(),
          obtainedFrom: 'draw'
        }
      ]);
      
      const result = service.generateOutputCard(recipe, 'player1', cardPool);
      
      expect(result.rarity).toBe('epic');
      expect(result.obtainedFrom).toBe('synthesis');
      expect(result.id).toBeDefined();
    });
    
    it('should throw error if no cards available for output rarity', () => {
      const recipe: SynthesisRecipe = {
        type: 'normal',
        requiredCards: { count: 3, mustBeIdentical: true },
        outputRarity: 'legendary',
        baseSuccessRate: 1.0
      };
      
      const cardPool = new Map<CardRarity, Card[]>();
      
      expect(() => {
        service.generateOutputCard(recipe, 'player1', cardPool);
      }).toThrow(AppError);
    });
  });
});
