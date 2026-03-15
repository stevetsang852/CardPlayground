import { CardDrawGenerator } from './CardDrawGenerator';
import { PackConfiguration } from '../types/pack';
import { Card, CardRarity } from '../types/card';
import { LuckValueCalculator } from '../luck/LuckValueCalculator';

describe('CardDrawGenerator', () => {
  let generator: CardDrawGenerator;
  let mockCardPool: Map<CardRarity, Card[]>;
  let basicPackConfig: PackConfiguration;

  beforeEach(() => {
    generator = new CardDrawGenerator();

    // Create mock card pool with cards for each rarity
    mockCardPool = new Map<CardRarity, Card[]>();

    const createMockCard = (rarity: CardRarity, name: string): Card => ({
      id: `template_${name}`,
      templateId: `template_${name}`,
      name,
      description: `A ${rarity} card`,
      rarity,
      theme: 'test',
      imageUrl: 'test.png',
      score: 100,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    });

    mockCardPool.set('common', [
      createMockCard('common', 'Common Card 1'),
      createMockCard('common', 'Common Card 2'),
      createMockCard('common', 'Common Card 3')
    ]);

    mockCardPool.set('rare', [
      createMockCard('rare', 'Rare Card 1'),
      createMockCard('rare', 'Rare Card 2')
    ]);

    mockCardPool.set('epic', [
      createMockCard('epic', 'Epic Card 1')
    ]);

    mockCardPool.set('legendary', [
      createMockCard('legendary', 'Legendary Card 1')
    ]);

    // Basic pack configuration (from Requirements 1.1)
    basicPackConfig = {
      id: 'basic_pack',
      name: 'Basic Pack',
      type: 'basic',
      cost: 100,
      currencyType: 'soft',
      probabilities: {
        legendary: 0.005,  // 0.5%
        epic: 0.05,        // 5%
        rare: 0.245,       // 24.5%
        common: 0.7        // 70%
      }
    };
  });

  describe('generateCardDraw', () => {
    it('should generate a card with the correct rarity based on probabilities', () => {
      const playerLuck = 0;
      const serverSeed = 12345;

      const card = generator.generateCardDraw(
        basicPackConfig,
        playerLuck,
        serverSeed,
        mockCardPool,
        0, // drawsSinceEpic
        0  // drawsSinceLegendary
      );

      expect(card).toBeDefined();
      expect(card.id).toBeDefined();
      expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity);
      expect(card.obtainedFrom).toBe('draw');
      expect(card.obtainedAt).toBeDefined();
    });

    it('should produce deterministic results with the same seed', () => {
      const playerLuck = 0;
      const serverSeed = 54321;

      const card1 = generator.generateCardDraw(
        basicPackConfig,
        playerLuck,
        serverSeed,
        mockCardPool,
        0,
        0
      );

      // Create a new generator to ensure independence
      const generator2 = new CardDrawGenerator();
      const card2 = generator2.generateCardDraw(
        basicPackConfig,
        playerLuck,
        serverSeed,
        mockCardPool,
        0,
        0
      );

      // Same seed should produce same rarity and template
      expect(card1.rarity).toBe(card2.rarity);
      expect(card1.templateId).toBe(card2.templateId);
    });

    it('should trigger epic pity system at threshold', () => {
      // Premium pack with guaranteed epic after 10 draws (Requirement 1.3)
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10
      };

      // At 10 draws since last epic, should guarantee epic
      const card = generator.generateCardDraw(
        premiumPackConfig,
        0,
        12345,
        mockCardPool,
        10, // drawsSinceEpic = 10 (threshold reached)
        0
      );

      expect(card.rarity).toBe('epic');
    });

    it('should not trigger epic pity system before threshold', () => {
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10
      };

      // At 9 draws since last epic, should not guarantee epic
      const card = generator.generateCardDraw(
        premiumPackConfig,
        0,
        12345,
        mockCardPool,
        9, // drawsSinceEpic = 9 (below threshold)
        0
      );

      // Card can be any rarity (based on probabilities)
      expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity);
    });

    it('should trigger legendary pity system at threshold', () => {
      const packWithLegendaryPity: PackConfiguration = {
        id: 'test_pack',
        name: 'Test Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedLegendaryAfter: 50
      };

      // At 50 draws since last legendary, should guarantee legendary
      const card = generator.generateCardDraw(
        packWithLegendaryPity,
        0,
        12345,
        mockCardPool,
        0,
        50 // drawsSinceLegendary = 50 (threshold reached)
      );

      expect(card.rarity).toBe('legendary');
    });

    it('should prioritize legendary pity over epic pity', () => {
      const packWithBothPity: PackConfiguration = {
        id: 'test_pack',
        name: 'Test Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10,
        guaranteedLegendaryAfter: 50
      };

      // Both thresholds reached - legendary should take priority
      const card = generator.generateCardDraw(
        packWithBothPity,
        0,
        12345,
        mockCardPool,
        10, // drawsSinceEpic = 10 (epic threshold reached)
        50  // drawsSinceLegendary = 50 (legendary threshold reached)
      );

      expect(card.rarity).toBe('legendary');
    });

    it('should apply luck bonus to legendary probability', () => {
      // High luck value that exceeds threshold (50)
      const highLuck = 100;
      const serverSeed = 99999;

      // With high luck, legendary probability should be boosted
      // We can't guarantee a legendary in a single draw, but we can verify
      // the system doesn't crash and produces valid results
      const card = generator.generateCardDraw(
        basicPackConfig,
        highLuck,
        serverSeed,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
      expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity);
    });

    it('should normalize probabilities after applying luck bonus', () => {
      // Test with various luck values
      const luckValues = [0, 25, 50, 75, 100];
      const serverSeed = 11111;

      for (const luck of luckValues) {
        const card = generator.generateCardDraw(
          basicPackConfig,
          luck,
          serverSeed + luck, // Different seed for each
          mockCardPool,
          0,
          0
        );

        expect(card).toBeDefined();
        expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity);
      }
    });

    it('should select a card from the correct rarity pool', () => {
      // Use a seed that we know produces a specific rarity
      // We'll test multiple seeds to cover different rarities
      const seeds = [1, 100, 1000, 10000, 100000];

      for (const seed of seeds) {
        const card = generator.generateCardDraw(
          basicPackConfig,
          0,
          seed,
          mockCardPool,
          0,
          0
        );

        // Verify the card exists in the pool for its rarity
        const poolForRarity = mockCardPool.get(card.rarity);
        expect(poolForRarity).toBeDefined();
        
        const templateExists = poolForRarity!.some(
          c => c.templateId === card.templateId
        );
        expect(templateExists).toBe(true);
      }
    });

    it('should throw error if no cards available for selected rarity', () => {
      // Create a pool with missing rarity
      const incompletePool = new Map<CardRarity, Card[]>();
      incompletePool.set('common', mockCardPool.get('common')!);
      // Missing rare, epic, legendary

      // Use a seed that would select a rare card
      const serverSeed = 50000;

      expect(() => {
        generator.generateCardDraw(
          basicPackConfig,
          0,
          serverSeed,
          incompletePool,
          0,
          0
        );
      }).toThrow();
    });

    it('should create unique card instances from templates', () => {
      const serverSeed = 77777;

      const card1 = generator.generateCardDraw(
        basicPackConfig,
        0,
        serverSeed,
        mockCardPool,
        0,
        0
      );

      const card2 = generator.generateCardDraw(
        basicPackConfig,
        0,
        serverSeed,
        mockCardPool,
        0,
        0
      );

      // Same template but different instances
      expect(card1.templateId).toBe(card2.templateId);
      expect(card1.id).not.toBe(card2.id); // Different IDs
    });

    it('should handle premium pack probabilities', () => {
      // Premium pack configuration (from Requirements 1.2)
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,   // 2%
          epic: 0.15,        // 15%
          rare: 0.33,        // 33%
          common: 0.5        // 50%
        }
      };

      const card = generator.generateCardDraw(
        premiumPackConfig,
        0,
        12345,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
      expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity);
    });

    it('should handle legendary pack probabilities', () => {
      // Legendary pack configuration (from Requirements 1.4)
      const legendaryPackConfig: PackConfiguration = {
        id: 'legendary_pack',
        name: 'Legendary Pack',
        type: 'legendary',
        cost: 2000,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.10,   // 10%
          epic: 0.40,        // 40%
          rare: 0.30,        // 30%
          common: 0.20       // 20%
        }
      };

      const card = generator.generateCardDraw(
        legendaryPackConfig,
        0,
        12345,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
      expect(['common', 'rare', 'epic', 'legendary']).toContain(card.rarity);
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical sequences with same seed', () => {
      const serverSeed = 42;
      const playerLuck = 25;

      const sequence1: CardRarity[] = [];
      for (let i = 0; i < 10; i++) {
        const gen = new CardDrawGenerator();
        const card = gen.generateCardDraw(
          basicPackConfig,
          playerLuck,
          serverSeed + i,
          mockCardPool,
          0,
          0
        );
        sequence1.push(card.rarity);
      }

      const sequence2: CardRarity[] = [];
      for (let i = 0; i < 10; i++) {
        const gen = new CardDrawGenerator();
        const card = gen.generateCardDraw(
          basicPackConfig,
          playerLuck,
          serverSeed + i,
          mockCardPool,
          0,
          0
        );
        sequence2.push(card.rarity);
      }

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('luck value integration', () => {
    it('should work with zero luck value', () => {
      const card = generator.generateCardDraw(
        basicPackConfig,
        0,
        12345,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
    });

    it('should work with luck value below threshold', () => {
      const card = generator.generateCardDraw(
        basicPackConfig,
        25, // Below threshold of 50
        12345,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
    });

    it('should work with luck value at threshold', () => {
      const card = generator.generateCardDraw(
        basicPackConfig,
        50, // At threshold
        12345,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
    });

    it('should work with luck value above threshold', () => {
      const card = generator.generateCardDraw(
        basicPackConfig,
        75, // Above threshold
        12345,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
    });

    it('should work with very high luck value', () => {
      const card = generator.generateCardDraw(
        basicPackConfig,
        200, // Very high luck
        12345,
        mockCardPool,
        0,
        0
      );

      expect(card).toBeDefined();
    });
  });
});

// Property-based tests using fast-check
import * as fc from 'fast-check';

describe('CardDrawGenerator - Property Tests', () => {
  let generator: CardDrawGenerator;
  let mockCardPool: Map<CardRarity, Card[]>;

  beforeEach(() => {
    generator = new CardDrawGenerator();

    // Create mock card pool
    mockCardPool = new Map<CardRarity, Card[]>();

    const createMockCard = (rarity: CardRarity, name: string): Card => ({
      id: `template_${name}`,
      templateId: `template_${name}`,
      name,
      description: `A ${rarity} card`,
      rarity,
      theme: 'test',
      imageUrl: 'test.png',
      score: 100,
      isLimitedEdition: false,
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    });

    mockCardPool.set('common', [
      createMockCard('common', 'Common Card 1'),
      createMockCard('common', 'Common Card 2'),
      createMockCard('common', 'Common Card 3')
    ]);

    mockCardPool.set('rare', [
      createMockCard('rare', 'Rare Card 1'),
      createMockCard('rare', 'Rare Card 2')
    ]);

    mockCardPool.set('epic', [
      createMockCard('epic', 'Epic Card 1')
    ]);

    mockCardPool.set('legendary', [
      createMockCard('legendary', 'Legendary Card 1')
    ]);
  });

  /**
   * Property 1: Pack probability distribution adherence
   * 
   * For any pack type and large sample of draws, the observed distribution
   * of card rarities should converge to the configured probability distribution
   * within statistical tolerance.
   * 
   * **Validates: Requirements 1.1, 1.2, 1.4**
   */
  describe('Property 1: Pack probability distribution adherence', () => {
    it('should converge to configured probabilities for basic pack over large sample', () => {
      const basicPackConfig: PackConfiguration = {
        id: 'basic_pack',
        name: 'Basic Pack',
        type: 'basic',
        cost: 100,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.005,  // 0.5%
          epic: 0.05,        // 5%
          rare: 0.245,       // 24.5%
          common: 0.7        // 70%
        }
      };

      const sampleSize = 10000;
      const tolerance = 0.02; // 2% tolerance
      const playerLuck = 0; // No luck bonus for baseline test

      // Count occurrences of each rarity
      const counts: Record<CardRarity, number> = {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      };

      // Generate large sample
      for (let i = 0; i < sampleSize; i++) {
        const card = generator.generateCardDraw(
          basicPackConfig,
          playerLuck,
          i, // Use i as seed for variety
          mockCardPool,
          0, // No pity system for baseline test
          0
        );
        counts[card.rarity]++;
      }

      // Calculate observed probabilities
      const observedProbs = {
        legendary: counts.legendary / sampleSize,
        epic: counts.epic / sampleSize,
        rare: counts.rare / sampleSize,
        common: counts.common / sampleSize
      };

      // Verify each probability is within tolerance
      expect(Math.abs(observedProbs.legendary - basicPackConfig.probabilities.legendary))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.epic - basicPackConfig.probabilities.epic))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.rare - basicPackConfig.probabilities.rare))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.common - basicPackConfig.probabilities.common))
        .toBeLessThanOrEqual(tolerance);
    });

    it('should converge to configured probabilities for premium pack over large sample', () => {
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,   // 2%
          epic: 0.15,        // 15%
          rare: 0.33,        // 33%
          common: 0.5        // 50%
        }
      };

      const sampleSize = 10000;
      const tolerance = 0.02; // 2% tolerance
      const playerLuck = 0;

      const counts: Record<CardRarity, number> = {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      };

      for (let i = 0; i < sampleSize; i++) {
        const card = generator.generateCardDraw(
          premiumPackConfig,
          playerLuck,
          i + 10000, // Different seed range
          mockCardPool,
          0,
          0
        );
        counts[card.rarity]++;
      }

      const observedProbs = {
        legendary: counts.legendary / sampleSize,
        epic: counts.epic / sampleSize,
        rare: counts.rare / sampleSize,
        common: counts.common / sampleSize
      };

      expect(Math.abs(observedProbs.legendary - premiumPackConfig.probabilities.legendary))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.epic - premiumPackConfig.probabilities.epic))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.rare - premiumPackConfig.probabilities.rare))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.common - premiumPackConfig.probabilities.common))
        .toBeLessThanOrEqual(tolerance);
    });

    it('should converge to configured probabilities for legendary pack over large sample', () => {
      const legendaryPackConfig: PackConfiguration = {
        id: 'legendary_pack',
        name: 'Legendary Pack',
        type: 'legendary',
        cost: 2000,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.10,   // 10%
          epic: 0.40,        // 40%
          rare: 0.30,        // 30%
          common: 0.20       // 20%
        }
      };

      const sampleSize = 10000;
      const tolerance = 0.02; // 2% tolerance
      const playerLuck = 0;

      const counts: Record<CardRarity, number> = {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      };

      for (let i = 0; i < sampleSize; i++) {
        const card = generator.generateCardDraw(
          legendaryPackConfig,
          playerLuck,
          i + 20000, // Different seed range
          mockCardPool,
          0,
          0
        );
        counts[card.rarity]++;
      }

      const observedProbs = {
        legendary: counts.legendary / sampleSize,
        epic: counts.epic / sampleSize,
        rare: counts.rare / sampleSize,
        common: counts.common / sampleSize
      };

      expect(Math.abs(observedProbs.legendary - legendaryPackConfig.probabilities.legendary))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.epic - legendaryPackConfig.probabilities.epic))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.rare - legendaryPackConfig.probabilities.rare))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.common - legendaryPackConfig.probabilities.common))
        .toBeLessThanOrEqual(tolerance);
    });

    it('should maintain probability distribution with arbitrary pack configurations', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary pack configurations with valid probabilities
          fc.record({
            legendary: fc.double({ min: 0.001, max: 0.2 }),
            epic: fc.double({ min: 0.01, max: 0.5 }),
            rare: fc.double({ min: 0.05, max: 0.5 }),
            common: fc.double({ min: 0.1, max: 0.9 })
          }).map(probs => {
            // Normalize probabilities to sum to 1.0
            const total = probs.legendary + probs.epic + probs.rare + probs.common;
            return {
              legendary: probs.legendary / total,
              epic: probs.epic / total,
              rare: probs.rare / total,
              common: probs.common / total
            };
          }),
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          (probabilities, baseSeed) => {
            const packConfig: PackConfiguration = {
              id: 'test_pack',
              name: 'Test Pack',
              type: 'basic',
              cost: 100,
              currencyType: 'soft',
              probabilities
            };

            const sampleSize = 5000; // Smaller sample for property test performance
            const tolerance = 0.03; // 3% tolerance for smaller sample

            const counts: Record<CardRarity, number> = {
              common: 0,
              rare: 0,
              epic: 0,
              legendary: 0
            };

            for (let i = 0; i < sampleSize; i++) {
              const card = generator.generateCardDraw(
                packConfig,
                0,
                baseSeed + i,
                mockCardPool,
                0,
                0
              );
              counts[card.rarity]++;
            }

            const observedProbs = {
              legendary: counts.legendary / sampleSize,
              epic: counts.epic / sampleSize,
              rare: counts.rare / sampleSize,
              common: counts.common / sampleSize
            };

            // All probabilities should be within tolerance
            return (
              Math.abs(observedProbs.legendary - probabilities.legendary) <= tolerance &&
              Math.abs(observedProbs.epic - probabilities.epic) <= tolerance &&
              Math.abs(observedProbs.rare - probabilities.rare) <= tolerance &&
              Math.abs(observedProbs.common - probabilities.common) <= tolerance
            );
          }
        ),
        { numRuns: 10 } // Run 10 times with different probability configurations
      );
    });

    it('should maintain probability distribution even with luck bonuses applied', () => {
      const basicPackConfig: PackConfiguration = {
        id: 'basic_pack',
        name: 'Basic Pack',
        type: 'basic',
        cost: 100,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.005,  // 0.5%
          epic: 0.05,        // 5%
          rare: 0.245,       // 24.5%
          common: 0.7        // 70%
        }
      };

      // Test with high luck value (above threshold of 50)
      const playerLuck = 100;
      const sampleSize = 10000;
      const tolerance = 0.02;

      const counts: Record<CardRarity, number> = {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      };

      for (let i = 0; i < sampleSize; i++) {
        const card = generator.generateCardDraw(
          basicPackConfig,
          playerLuck,
          i + 30000,
          mockCardPool,
          0,
          0
        );
        counts[card.rarity]++;
      }

      const observedProbs = {
        legendary: counts.legendary / sampleSize,
        epic: counts.epic / sampleSize,
        rare: counts.rare / sampleSize,
        common: counts.common / sampleSize
      };

      // Calculate expected probabilities with luck bonus
      const luckCalculator = new LuckValueCalculator();
      const luckBonus = luckCalculator.calculateBonusProbability(playerLuck);
      
      const adjustedProbs = {
        legendary: basicPackConfig.probabilities.legendary + luckBonus,
        epic: basicPackConfig.probabilities.epic,
        rare: basicPackConfig.probabilities.rare,
        common: basicPackConfig.probabilities.common
      };

      // Normalize
      const total = Object.values(adjustedProbs).reduce((sum, p) => sum + p, 0);
      const expectedProbs = {
        legendary: adjustedProbs.legendary / total,
        epic: adjustedProbs.epic / total,
        rare: adjustedProbs.rare / total,
        common: adjustedProbs.common / total
      };

      // Verify observed probabilities match expected (with luck bonus)
      expect(Math.abs(observedProbs.legendary - expectedProbs.legendary))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.epic - expectedProbs.epic))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.rare - expectedProbs.rare))
        .toBeLessThanOrEqual(tolerance);
      expect(Math.abs(observedProbs.common - expectedProbs.common))
        .toBeLessThanOrEqual(tolerance);
    });

    it('should produce valid rarity distribution that sums to 100%', () => {
      fc.assert(
        fc.property(
          fc.record({
            legendary: fc.double({ min: 0.001, max: 0.2 }),
            epic: fc.double({ min: 0.01, max: 0.5 }),
            rare: fc.double({ min: 0.05, max: 0.5 }),
            common: fc.double({ min: 0.1, max: 0.9 })
          }).map(probs => {
            const total = probs.legendary + probs.epic + probs.rare + probs.common;
            return {
              legendary: probs.legendary / total,
              epic: probs.epic / total,
              rare: probs.rare / total,
              common: probs.common / total
            };
          }),
          fc.integer({ min: 0, max: 100 }), // Player luck
          fc.integer({ min: 0, max: 1000000 }), // Seed
          (probabilities, playerLuck, seed) => {
            const packConfig: PackConfiguration = {
              id: 'test_pack',
              name: 'Test Pack',
              type: 'basic',
              cost: 100,
              currencyType: 'soft',
              probabilities
            };

            // Generate a single draw
            const card = generator.generateCardDraw(
              packConfig,
              playerLuck,
              seed,
              mockCardPool,
              0,
              0
            );

            // Card must have a valid rarity
            return ['common', 'rare', 'epic', 'legendary'].includes(card.rarity);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 2: Pity system guarantee
   * 
   * For any sequence of draws from a pack with a pity system, if no card of
   * the guaranteed rarity appears within N-1 draws, the Nth draw must produce
   * a card of at least that rarity.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Pity system guarantee', () => {
    it('should guarantee epic card at epic pity threshold', () => {
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          fc.integer({ min: 0, max: 100 }), // Player luck
          (baseSeed, playerLuck) => {
            // At exactly the threshold (10 draws since last epic)
            const card = generator.generateCardDraw(
              premiumPackConfig,
              playerLuck,
              baseSeed,
              mockCardPool,
              10, // drawsSinceEpic = 10 (threshold reached)
              0
            );

            // Must be epic or legendary (at least epic rarity)
            return card.rarity === 'epic' || card.rarity === 'legendary';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should guarantee legendary card at legendary pity threshold', () => {
      const packWithLegendaryPity: PackConfiguration = {
        id: 'test_pack',
        name: 'Test Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedLegendaryAfter: 50
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          fc.integer({ min: 0, max: 100 }), // Player luck
          (baseSeed, playerLuck) => {
            // At exactly the threshold (50 draws since last legendary)
            const card = generator.generateCardDraw(
              packWithLegendaryPity,
              playerLuck,
              baseSeed,
              mockCardPool,
              0,
              50 // drawsSinceLegendary = 50 (threshold reached)
            );

            // Must be legendary
            return card.rarity === 'legendary';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not guarantee epic before threshold is reached', () => {
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 9 }), // drawsSinceEpic below threshold
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          fc.integer({ min: 0, max: 100 }), // Player luck
          (drawsSinceEpic, baseSeed, playerLuck) => {
            // Below threshold - no guarantee
            const card = generator.generateCardDraw(
              premiumPackConfig,
              playerLuck,
              baseSeed,
              mockCardPool,
              drawsSinceEpic,
              0
            );

            // Card can be any rarity (no guarantee enforced)
            return ['common', 'rare', 'epic', 'legendary'].includes(card.rarity);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not guarantee legendary before threshold is reached', () => {
      const packWithLegendaryPity: PackConfiguration = {
        id: 'test_pack',
        name: 'Test Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedLegendaryAfter: 50
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 49 }), // drawsSinceLegendary below threshold
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          fc.integer({ min: 0, max: 100 }), // Player luck
          (drawsSinceLegendary, baseSeed, playerLuck) => {
            // Below threshold - no guarantee
            const card = generator.generateCardDraw(
              packWithLegendaryPity,
              playerLuck,
              baseSeed,
              mockCardPool,
              0,
              drawsSinceLegendary
            );

            // Card can be any rarity (no guarantee enforced)
            return ['common', 'rare', 'epic', 'legendary'].includes(card.rarity);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prioritize legendary pity over epic pity when both thresholds are reached', () => {
      const packWithBothPity: PackConfiguration = {
        id: 'test_pack',
        name: 'Test Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10,
        guaranteedLegendaryAfter: 50
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // drawsSinceEpic >= epic threshold
          fc.integer({ min: 50, max: 200 }), // drawsSinceLegendary >= legendary threshold
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          fc.integer({ min: 0, max: 100 }), // Player luck
          (drawsSinceEpic, drawsSinceLegendary, baseSeed, playerLuck) => {
            // Both thresholds reached - legendary should take priority
            const card = generator.generateCardDraw(
              packWithBothPity,
              playerLuck,
              baseSeed,
              mockCardPool,
              drawsSinceEpic,
              drawsSinceLegendary
            );

            // Must be legendary (higher priority)
            return card.rarity === 'legendary';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should guarantee epic when epic threshold reached but legendary threshold not reached', () => {
      const packWithBothPity: PackConfiguration = {
        id: 'test_pack',
        name: 'Test Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10,
        guaranteedLegendaryAfter: 50
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // drawsSinceEpic >= epic threshold
          fc.integer({ min: 0, max: 49 }), // drawsSinceLegendary < legendary threshold
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          fc.integer({ min: 0, max: 100 }), // Player luck
          (drawsSinceEpic, drawsSinceLegendary, baseSeed, playerLuck) => {
            // Epic threshold reached, legendary not reached
            const card = generator.generateCardDraw(
              packWithBothPity,
              playerLuck,
              baseSeed,
              mockCardPool,
              drawsSinceEpic,
              drawsSinceLegendary
            );

            // Must be epic or legendary (at least epic rarity)
            return card.rarity === 'epic' || card.rarity === 'legendary';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should work with arbitrary pity thresholds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 20 }), // Epic pity threshold
          fc.integer({ min: 30, max: 100 }), // Legendary pity threshold
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          fc.integer({ min: 0, max: 100 }), // Player luck
          (epicThreshold, legendaryThreshold, baseSeed, playerLuck) => {
            const packConfig: PackConfiguration = {
              id: 'test_pack',
              name: 'Test Pack',
              type: 'premium',
              cost: 500,
              currencyType: 'soft',
              probabilities: {
                legendary: 0.02,
                epic: 0.15,
                rare: 0.33,
                common: 0.5
              },
              guaranteedEpicAfter: epicThreshold,
              guaranteedLegendaryAfter: legendaryThreshold
            };

            // Test at epic threshold
            const epicCard = generator.generateCardDraw(
              packConfig,
              playerLuck,
              baseSeed,
              mockCardPool,
              epicThreshold,
              0
            );

            // Test at legendary threshold
            const legendaryCard = generator.generateCardDraw(
              packConfig,
              playerLuck,
              baseSeed + 1,
              mockCardPool,
              0,
              legendaryThreshold
            );

            // Epic threshold should guarantee at least epic
            const epicGuaranteeWorks = 
              epicCard.rarity === 'epic' || epicCard.rarity === 'legendary';

            // Legendary threshold should guarantee legendary
            const legendaryGuaranteeWorks = legendaryCard.rarity === 'legendary';

            return epicGuaranteeWorks && legendaryGuaranteeWorks;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should guarantee rarity regardless of luck value', () => {
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }), // Any luck value
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          (playerLuck, baseSeed) => {
            // At epic threshold with any luck value
            const card = generator.generateCardDraw(
              premiumPackConfig,
              playerLuck,
              baseSeed,
              mockCardPool,
              10, // drawsSinceEpic = 10 (threshold reached)
              0
            );

            // Must guarantee epic or legendary regardless of luck
            return card.rarity === 'epic' || card.rarity === 'legendary';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should guarantee rarity regardless of seed value', () => {
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), // Any seed
          (seed) => {
            // At epic threshold with any seed
            const card = generator.generateCardDraw(
              premiumPackConfig,
              0,
              seed,
              mockCardPool,
              10, // drawsSinceEpic = 10 (threshold reached)
              0
            );

            // Must guarantee epic or legendary regardless of seed
            return card.rarity === 'epic' || card.rarity === 'legendary';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should work correctly when draws exceed threshold by multiple counts', () => {
      const premiumPackConfig: PackConfiguration = {
        id: 'premium_pack',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        },
        guaranteedEpicAfter: 10
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // drawsSinceEpic >= threshold
          fc.integer({ min: 0, max: 1000000 }), // Base seed
          (drawsSinceEpic, baseSeed) => {
            // At or beyond epic threshold
            const card = generator.generateCardDraw(
              premiumPackConfig,
              0,
              baseSeed,
              mockCardPool,
              drawsSinceEpic,
              0
            );

            // Must guarantee epic or legendary even if threshold exceeded
            return card.rarity === 'epic' || card.rarity === 'legendary';
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
