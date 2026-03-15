/**
 * InputValidator — client-side validation before API calls.
 *
 * Validates Requirements: 12.1, 12.2
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_PACK_TYPES = ['basic', 'premium', 'legendary'];
const VALID_CURRENCY_TYPES = ['soft', 'hard'];

export class InputValidator {
  validatePackType(packType: string): ValidationResult {
    const errors: string[] = [];
    if (!packType || typeof packType !== 'string') {
      errors.push('Pack type is required.');
    } else if (!VALID_PACK_TYPES.includes(packType)) {
      errors.push(`Pack type must be one of: ${VALID_PACK_TYPES.join(', ')}.`);
    }
    return { valid: errors.length === 0, errors };
  }

  validateQuantity(quantity: number): ValidationResult {
    const errors: string[] = [];
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      errors.push('Quantity must be a whole number.');
    } else if (quantity < 1) {
      errors.push('Quantity must be at least 1.');
    } else if (quantity > 10) {
      errors.push('Quantity cannot exceed 10.');
    }
    return { valid: errors.length === 0, errors };
  }

  validateCardIds(cardIds: string[]): ValidationResult {
    const errors: string[] = [];
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      errors.push('At least one card ID is required.');
    } else {
      cardIds.forEach((id, index) => {
        if (typeof id !== 'string' || id.trim() === '') {
          errors.push(`Card ID at index ${index} is invalid.`);
        }
      });
    }
    return { valid: errors.length === 0, errors };
  }

  validatePrice(price: number): ValidationResult {
    const errors: string[] = [];
    if (typeof price !== 'number') {
      errors.push('Price must be a number.');
    } else if (!isFinite(price) || isNaN(price)) {
      errors.push('Price must be a finite number.');
    } else if (price <= 0) {
      errors.push('Price must be greater than 0.');
    } else if (!Number.isInteger(price)) {
      errors.push('Price must be a whole number.');
    }
    return { valid: errors.length === 0, errors };
  }

  validateCurrencyType(currencyType: string): ValidationResult {
    const errors: string[] = [];
    if (!currencyType || !VALID_CURRENCY_TYPES.includes(currencyType)) {
      errors.push(`Currency type must be one of: ${VALID_CURRENCY_TYPES.join(', ')}.`);
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Combine multiple validation results into one.
   */
  combine(...results: ValidationResult[]): ValidationResult {
    const errors = results.flatMap((r) => r.errors);
    return { valid: errors.length === 0, errors };
  }
}
