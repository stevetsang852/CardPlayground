import { 
  PackConfiguration, 
  validateProbabilities, 
  validateRarities, 
  validatePackConfiguration 
} from './pack';

describe('PackConfiguration Validation', () => {
  describe('validateProbabilities', () => {
    it('should accept probabilities that sum to 100%', () => {
      const probabilities = {
        legendary: 0.005,
        epic: 0.05,
        rare: 0.245,
        common: 0.7
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept probabilities that sum to 100% with floating point precision', () => {
      const probabilities = {
        legendary: 0.02,
        epic: 0.15,
        rare: 0.33,
        common: 0.5
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject probabilities that sum to less than 100%', () => {
      const probabilities = {
        legendary: 0.005,
        epic: 0.05,
        rare: 0.2,
        common: 0.5
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('probabilities');
      expect(result.errors[0].message).toContain('must sum to 100%');
    });

    it('should reject probabilities that sum to more than 100%', () => {
      const probabilities = {
        legendary: 0.1,
        epic: 0.4,
        rare: 0.4,
        common: 0.3
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('probabilities');
      expect(result.errors[0].message).toContain('must sum to 100%');
    });

    it('should reject negative probabilities', () => {
      const probabilities = {
        legendary: -0.1,
        epic: 0.5,
        rare: 0.3,
        common: 0.3
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('non-negative'))).toBe(true);
    });

    it('should reject probabilities exceeding 1.0', () => {
      const probabilities = {
        legendary: 1.5,
        epic: 0.05,
        rare: 0.2,
        common: 0.7
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('must not exceed 1.0'))).toBe(true);
    });

    it('should handle edge case of all probability in one rarity', () => {
      const probabilities = {
        legendary: 0,
        epic: 0,
        rare: 0,
        common: 1.0
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateRarities', () => {
    it('should accept all valid rarities', () => {
      const probabilities = {
        legendary: 0.1,
        epic: 0.2,
        rare: 0.3,
        common: 0.4
      };
      
      const result = validateRarities(probabilities);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid rarity names', () => {
      const probabilities = {
        legendary: 0.1,
        epic: 0.2,
        rare: 0.3,
        mythic: 0.4 // Invalid rarity
      } as any;
      
      const result = validateRarities(probabilities);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('probabilities.mythic');
      expect(result.errors[0].message).toContain('Invalid rarity');
    });

    it('should reject multiple invalid rarities', () => {
      const probabilities = {
        legendary: 0.1,
        mythic: 0.2,
        ultra: 0.3,
        common: 0.4
      } as any;
      
      const result = validateRarities(probabilities);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validatePackConfiguration', () => {
    const createValidConfig = (): PackConfiguration => ({
      id: 'basic-pack-1',
      name: 'Basic Pack',
      type: 'basic',
      cost: 100,
      currencyType: 'soft',
      probabilities: {
        legendary: 0.005,
        epic: 0.05,
        rare: 0.245,
        common: 0.7
      }
    });

    it('should accept valid Basic Pack configuration (Requirement 1.1)', () => {
      const config = createValidConfig();
      
      const result = validatePackConfiguration(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid Premium Pack configuration (Requirement 1.2)', () => {
      const config: PackConfiguration = {
        id: 'premium-pack-1',
        name: 'Premium Pack',
        type: 'premium',
        cost: 500,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.02,
          epic: 0.15,
          rare: 0.33,
          common: 0.5
        }
      };
      
      const result = validatePackConfiguration(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid Legendary Pack configuration (Requirement 1.4)', () => {
      const config: PackConfiguration = {
        id: 'legendary-pack-1',
        name: 'Legendary Pack',
        type: 'legendary',
        cost: 2000,
        currencyType: 'soft',
        probabilities: {
          legendary: 0.1,
          epic: 0.4,
          rare: 0.3,
          common: 0.2
        }
      };
      
      const result = validatePackConfiguration(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with invalid probabilities sum', () => {
      const config = createValidConfig();
      config.probabilities.common = 0.5; // Now sum is less than 1.0
      
      const result = validatePackConfiguration(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('must sum to 100%'))).toBe(true);
    });

    it('should reject configuration with invalid rarities', () => {
      const config = createValidConfig();
      (config.probabilities as any).mythic = 0.1;
      config.probabilities.common = 0.6; // Adjust to maintain sum
      
      const result = validatePackConfiguration(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid rarity'))).toBe(true);
    });

    it('should accumulate multiple validation errors', () => {
      const config = createValidConfig();
      config.probabilities.legendary = -0.1; // Negative
      config.probabilities.common = 0.5; // Sum won't be 1.0
      
      const result = validatePackConfiguration(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept configuration with optional fields', () => {
      const config: PackConfiguration = {
        id: 'premium-pack-2',
        name: 'Premium Pack with Pity',
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
        guaranteedLegendaryAfter: 50,
        purchaseLimit: 3,
        limitResetPeriod: 'weekly',
        availableFrom: '2024-01-01T00:00:00Z',
        availableUntil: '2024-12-31T23:59:59Z',
        seasonExclusive: true
      };
      
      const result = validatePackConfiguration(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small probabilities correctly', () => {
      const probabilities = {
        legendary: 0.0001,
        epic: 0.0099,
        rare: 0.49,
        common: 0.5
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(true);
    });

    it('should handle floating point precision issues', () => {
      // This is a known floating point issue: 0.1 + 0.2 !== 0.3
      const probabilities = {
        legendary: 0.1,
        epic: 0.2,
        rare: 0.3,
        common: 0.4
      };
      
      const result = validateProbabilities(probabilities);
      
      // Should still pass due to tolerance
      expect(result.valid).toBe(true);
    });

    it('should reject probabilities just outside tolerance', () => {
      const probabilities = {
        legendary: 0.005,
        epic: 0.05,
        rare: 0.245,
        common: 0.701 // 0.001 over (outside 0.0001 tolerance)
      };
      
      const result = validateProbabilities(probabilities);
      
      expect(result.valid).toBe(false);
    });
  });
});
