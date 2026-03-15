/**
 * Server-side input validation middleware.
 *
 * Validates Requirements: 12.1, 12.2
 */

import { Request, Response, NextFunction } from 'express';

type FieldValidator = (val: any) => string | null;
type Middleware = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Middleware factory that validates request body fields.
 * Returns 400 with detailed errors if any field fails validation.
 */
export function validateBody(schema: Record<string, FieldValidator>): Middleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};

    for (const [field, validate] of Object.entries(schema)) {
      const error = validate(req.body[field]);
      if (error) {
        errors[field] = error;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
          retryable: false,
        },
        requestId: (req.headers['x-request-id'] as string) || 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Reusable field validators
// ---------------------------------------------------------------------------

function requiredString(field: string) {
  return (val: any): string | null => {
    if (val === undefined || val === null) return `${field} is required`;
    if (typeof val !== 'string' || val.trim() === '') return `${field} must be a non-empty string`;
    return null;
  };
}

function oneOf(field: string, allowed: string[]) {
  return (val: any): string | null => {
    if (!allowed.includes(val)) return `${field} must be one of: ${allowed.join(', ')}`;
    return null;
  };
}

function positiveInteger(field: string, min = 1, max?: number) {
  return (val: any): string | null => {
    if (typeof val !== 'number' || !Number.isInteger(val)) return `${field} must be a whole number`;
    if (val < min) return `${field} must be at least ${min}`;
    if (max !== undefined && val > max) return `${field} cannot exceed ${max}`;
    return null;
  };
}

function nonEmptyArray(field: string) {
  return (val: any): string | null => {
    if (!Array.isArray(val) || val.length === 0) return `${field} must be a non-empty array`;
    return null;
  };
}

// ---------------------------------------------------------------------------
// Specific request validators
// ---------------------------------------------------------------------------

export const validateDrawRequest = validateBody({
  packType: oneOf('packType', ['basic', 'premium', 'legendary']),
  quantity: (val: any): string | null => {
    // quantity is optional (defaults to 1), so only validate if provided
    if (val === undefined || val === null) return null;
    return positiveInteger('quantity', 1, 10)(val);
  },
  currencyType: (val: any): string | null => {
    if (val === undefined || val === null) return null;
    return oneOf('currencyType', ['soft', 'hard'])(val);
  },
});

export const validateSynthesisRequest = validateBody({
  synthesisType: oneOf('synthesisType', ['normal', 'advanced', 'gambler', 'legendary']),
  inputCardIds: nonEmptyArray('inputCardIds'),
});

export const validateMarketListRequest = validateBody({
  cardId: requiredString('cardId'),
  price: (val: any): string | null => {
    if (typeof val !== 'number') return 'price must be a number';
    if (!Number.isFinite(val) || isNaN(val)) return 'price must be a finite number';
    if (val <= 0) return 'price must be greater than 0';
    return null;
  },
  currencyType: oneOf('currencyType', ['soft', 'hard']),
});

export const validateMarketPurchaseRequest = validateBody({
  listingId: requiredString('listingId'),
});
