import { PackConfiguration, validatePackConfiguration } from '../types/pack';

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

export class PackConfigParser {
  /**
   * Parse a JSON string into a PackConfiguration.
   * Returns descriptive errors for invalid configs.
   */
  parse(jsonString: string): ParseResult<PackConfiguration> {
    // Attempt JSON parse
    let raw: unknown;
    try {
      raw = JSON.parse(jsonString);
    } catch (e) {
      return {
        success: false,
        errors: [`Invalid JSON: ${(e as Error).message}`]
      };
    }

    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return {
        success: false,
        errors: ['Configuration must be a JSON object']
      };
    }

    const obj = raw as Record<string, unknown>;
    const errors: string[] = [];

    // Required field checks
    if (typeof obj['id'] !== 'string' || obj['id'].length === 0) {
      errors.push('Field "id" must be a non-empty string');
    }
    if (typeof obj['name'] !== 'string' || obj['name'].length === 0) {
      errors.push('Field "name" must be a non-empty string');
    }
    if (!['basic', 'premium', 'legendary'].includes(obj['type'] as string)) {
      errors.push('Field "type" must be one of: basic, premium, legendary');
    }
    if (typeof obj['cost'] !== 'number' || obj['cost'] <= 0) {
      errors.push('Field "cost" must be a positive number');
    }
    if (!['soft', 'hard'].includes(obj['currencyType'] as string)) {
      errors.push('Field "currencyType" must be one of: soft, hard');
    }

    // Probabilities
    if (typeof obj['probabilities'] !== 'object' || obj['probabilities'] === null) {
      errors.push('Field "probabilities" must be an object');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const config = raw as PackConfiguration;
    const validationResult = validatePackConfiguration(config);
    if (!validationResult.valid) {
      return {
        success: false,
        errors: validationResult.errors.map(e => `${e.field}: ${e.message}`)
      };
    }

    return { success: true, data: config, errors: [] };
  }

  /**
   * Serialize a PackConfiguration to a JSON string.
   */
  format(config: PackConfiguration): string {
    return JSON.stringify(config);
  }
}
