import { Card } from './card';

export type EventType = 'merchant' | 'storm' | 'lucky' | 'copy';

export interface MerchantOffer {
  id: string;
  itemType: 'pack' | 'material' | 'card';
  itemId: string;
  price: number;
  currencyType: 'soft' | 'hard';
  discount: number;
}

export interface ActiveEvent {
  id: string;
  playerId: string;
  eventType: EventType;
  
  // Timing
  triggeredAt: string;
  expiresAt?: string;
  
  // Event-specific data
  merchantOffers?: MerchantOffer[];
  stormDrawsRemaining?: number;
  luckyMomentBonus?: number;
  copiedCard?: Card;
  
  // State
  claimed: boolean;
}

export interface EventConfiguration {
  eventType: EventType;
  probability: number;  // 0-100 (percentage)
  duration?: number;    // Duration in minutes (for timed events like Lucky Moment)
}

export interface EventConfigurationValidationError {
  field: string;
  message: string;
}

/**
 * Validates an EventConfiguration object
 * @param config The event configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateEventConfiguration(
  config: EventConfiguration
): EventConfigurationValidationError[] {
  const errors: EventConfigurationValidationError[] = [];

  // Validate probability (0-100%)
  if (typeof config.probability !== 'number') {
    errors.push({
      field: 'probability',
      message: 'Probability must be a number'
    });
  } else if (!isFinite(config.probability)) {
    errors.push({
      field: 'probability',
      message: 'Probability must be a finite number'
    });
  } else if (config.probability < 0 || config.probability > 100) {
    errors.push({
      field: 'probability',
      message: 'Probability must be between 0 and 100 (inclusive)'
    });
  }

  // Validate duration (positive integer if present)
  if (config.duration !== undefined) {
    if (typeof config.duration !== 'number') {
      errors.push({
        field: 'duration',
        message: 'Duration must be a number'
      });
    } else if (!isFinite(config.duration)) {
      errors.push({
        field: 'duration',
        message: 'Duration must be a finite number'
      });
    } else if (!Number.isInteger(config.duration)) {
      errors.push({
        field: 'duration',
        message: 'Duration must be an integer'
      });
    } else if (config.duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'Duration must be a positive integer'
      });
    }
  }

  return errors;
}

/**
 * Checks if an EventConfiguration is valid
 * @param config The event configuration to check
 * @returns true if valid, false otherwise
 */
export function isValidEventConfiguration(config: EventConfiguration): boolean {
  return validateEventConfiguration(config).length === 0;
}
