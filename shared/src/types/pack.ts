import { CardRarity } from './card';

export type PackType = 'basic' | 'premium' | 'legendary';
export type CurrencyType = 'soft' | 'hard';

export interface PackConfiguration {
  id: string;
  name: string;
  type: PackType;
  cost: number;
  currencyType: CurrencyType;
  
  // Probability distribution
  probabilities: {
    legendary: number;
    epic: number;
    rare: number;
    common: number;
  };
  
  // Pity system
  guaranteedEpicAfter?: number;
  guaranteedLegendaryAfter?: number;
  
  // Limits
  purchaseLimit?: number;
  limitResetPeriod?: 'daily' | 'weekly' | 'monthly';
  
  // Availability
  availableFrom?: string;
  availableUntil?: string;
  seasonExclusive?: boolean;
}

export interface PackValidationError {
  field: string;
  message: string;
}

export interface PackValidationResult {
  valid: boolean;
  errors: PackValidationError[];
}

/**
 * Valid card rarities that can be referenced in pack configurations
 */
const VALID_RARITIES: CardRarity[] = ['common', 'rare', 'epic', 'legendary'];

/**
 * Validates that probability values sum to 100% (1.0) within a small tolerance
 * Validates: Requirements 13.5
 */
export function validateProbabilities(probabilities: PackConfiguration['probabilities']): PackValidationResult {
  const errors: PackValidationError[] = [];
  
  // Check that all probabilities are non-negative
  const entries = Object.entries(probabilities) as [CardRarity, number][];
  for (const [rarity, probability] of entries) {
    if (probability < 0) {
      errors.push({
        field: `probabilities.${rarity}`,
        message: `Probability for ${rarity} must be non-negative, got ${probability}`
      });
    }
    if (probability > 1) {
      errors.push({
        field: `probabilities.${rarity}`,
        message: `Probability for ${rarity} must not exceed 1.0 (100%), got ${probability}`
      });
    }
  }
  
  // Calculate sum of probabilities
  const sum = entries.reduce((total, [_, prob]) => total + prob, 0);
  
  // Allow small floating-point tolerance (0.0001 = 0.01%)
  const tolerance = 0.0001;
  const expectedSum = 1.0;
  
  if (Math.abs(sum - expectedSum) > tolerance) {
    errors.push({
      field: 'probabilities',
      message: `Probabilities must sum to 100% (1.0), got ${(sum * 100).toFixed(2)}%`
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that all referenced card rarities exist in the CardRarity enumeration
 * Validates: Requirements 13.6
 */
export function validateRarities(probabilities: PackConfiguration['probabilities']): PackValidationResult {
  const errors: PackValidationError[] = [];
  
  const rarityKeys = Object.keys(probabilities) as string[];
  
  for (const rarity of rarityKeys) {
    if (!VALID_RARITIES.includes(rarity as CardRarity)) {
      errors.push({
        field: `probabilities.${rarity}`,
        message: `Invalid rarity '${rarity}'. Must be one of: ${VALID_RARITIES.join(', ')}`
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a complete PackConfiguration
 * Validates: Requirements 1.1, 1.2, 1.4, 13.5, 13.6
 */
export function validatePackConfiguration(config: PackConfiguration): PackValidationResult {
  const errors: PackValidationError[] = [];
  
  // Validate probabilities sum to 100%
  const probResult = validateProbabilities(config.probabilities);
  errors.push(...probResult.errors);
  
  // Validate rarity enumeration
  const rarityResult = validateRarities(config.probabilities);
  errors.push(...rarityResult.errors);
  
  return {
    valid: errors.length === 0,
    errors
  };
}
