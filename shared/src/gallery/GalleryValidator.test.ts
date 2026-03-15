import fc from 'fast-check';
import { GalleryValidator, MAX_GALLERY_SIZE } from './GalleryValidator';

describe('GalleryValidator', () => {
  let validator: GalleryValidator;

  beforeEach(() => {
    validator = new GalleryValidator();
  });

  describe('validateGallerySize()', () => {
    it('should accept gallery with exactly 50 cards', () => {
      const cardIds = Array.from({ length: 50 }, (_, i) => `card-${i}`);
      const result = validator.validateGallerySize(cardIds);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept gallery with fewer than 50 cards', () => {
      const cardIds = Array.from({ length: 25 }, (_, i) => `card-${i}`);
      const result = validator.validateGallerySize(cardIds);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept empty gallery', () => {
      const result = validator.validateGallerySize([]);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject gallery with 51 cards', () => {
      const cardIds = Array.from({ length: 51 }, (_, i) => `card-${i}`);
      const result = validator.validateGallerySize(cardIds);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('50');
      expect(result.error).toContain('51');
    });

    it('should reject gallery with more than 50 cards', () => {
      const cardIds = Array.from({ length: 100 }, (_, i) => `card-${i}`);
      const result = validator.validateGallerySize(cardIds);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('50');
    });
  });

  describe('validateGalleryUpdate()', () => {
    it('should validate gallery size when updating', () => {
      const validCardIds = Array.from({ length: 30 }, (_, i) => `card-${i}`);
      const result = validator.validateGalleryUpdate(validCardIds);

      expect(result.valid).toBe(true);
    });

    it('should reject oversized gallery when updating', () => {
      const invalidCardIds = Array.from({ length: 60 }, (_, i) => `card-${i}`);
      const result = validator.validateGalleryUpdate(invalidCardIds);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Property-based tests', () => {
    /**
     * **Validates: Requirements 4.1**
     * 
     * Property 17: Gallery size constraint
     * 
     * For any gallery update attempt, if the number of cards exceeds 50,
     * the update should be rejected.
     * 
     * This property test validates that:
     * 1. Gallery updates with ≤50 cards are always accepted
     * 2. Gallery updates with >50 cards are always rejected
     * 3. The constraint is enforced consistently across all possible inputs
     */
    it('Property 17: should accept gallery updates with ≤50 cards and reject updates with >50 cards', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }), // Number of cards to attempt
          (cardCount) => {
            // Generate array of card IDs
            const cardIds = Array.from({ length: cardCount }, (_, i) => `card-${i}`);
            
            // Validate the gallery update
            const result = validator.validateGalleryUpdate(cardIds);
            
            // Property: Updates with ≤50 cards should be accepted
            if (cardCount <= MAX_GALLERY_SIZE) {
              return result.valid === true && result.error === undefined;
            }
            
            // Property: Updates with >50 cards should be rejected
            return result.valid === false && result.error !== undefined;
          }
        ),
        { numRuns: 100 } // Test 100 different card counts
      );
    });

    it('Property 17: should consistently reject all gallery updates exceeding 50 cards', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 51, max: 1000 }), // Only test counts > 50
          (cardCount) => {
            const cardIds = Array.from({ length: cardCount }, (_, i) => `card-${i}`);
            const result = validator.validateGalleryUpdate(cardIds);
            
            // All updates with >50 cards must be rejected
            return result.valid === false && 
                   result.error !== undefined &&
                   result.error.includes('50');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 17: should consistently accept all gallery updates with ≤50 cards', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }), // Only test counts ≤ 50
          (cardCount) => {
            const cardIds = Array.from({ length: cardCount }, (_, i) => `card-${i}`);
            const result = validator.validateGalleryUpdate(cardIds);
            
            // All updates with ≤50 cards must be accepted
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 51 } // Test all values from 0 to 50
      );
    });

    it('Property 17: should enforce exact boundary at 50 cards', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Randomly test at or above boundary
          (atBoundary) => {
            const cardCount = atBoundary ? 50 : 51;
            const cardIds = Array.from({ length: cardCount }, (_, i) => `card-${i}`);
            const result = validator.validateGalleryUpdate(cardIds);
            
            // 50 cards should be accepted, 51 should be rejected
            if (cardCount === 50) {
              return result.valid === true;
            } else {
              return result.valid === false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 17: should handle arbitrary card ID formats consistently', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.constantFrom('uuid', 'numeric', 'alphanumeric', 'special'),
          (cardCount, idFormat) => {
            // Generate card IDs in different formats
            let cardIds: string[];
            switch (idFormat) {
              case 'uuid':
                cardIds = Array.from({ length: cardCount }, (_, i) => 
                  `${i}-${Math.random().toString(36).substring(2, 15)}`
                );
                break;
              case 'numeric':
                cardIds = Array.from({ length: cardCount }, (_, i) => `${i}`);
                break;
              case 'alphanumeric':
                cardIds = Array.from({ length: cardCount }, (_, i) => `card${i}`);
                break;
              case 'special':
                cardIds = Array.from({ length: cardCount }, (_, i) => `card_${i}_special`);
                break;
              default:
                cardIds = Array.from({ length: cardCount }, (_, i) => `card-${i}`);
                break;
            }
            
            const result = validator.validateGalleryUpdate(cardIds);
            
            // Validation should depend only on count, not ID format
            if (cardCount <= MAX_GALLERY_SIZE) {
              return result.valid === true;
            } else {
              return result.valid === false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 17: should handle duplicate card IDs consistently with size constraint', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (cardCount, duplicateId) => {
            // Create array with all duplicate IDs
            const cardIds = Array.from({ length: cardCount }, () => duplicateId);
            const result = validator.validateGalleryUpdate(cardIds);
            
            // Size constraint should apply regardless of duplicates
            if (cardCount <= MAX_GALLERY_SIZE) {
              return result.valid === true;
            } else {
              return result.valid === false;
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
