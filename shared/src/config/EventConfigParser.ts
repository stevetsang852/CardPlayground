import { EventConfiguration, validateEventConfiguration } from '../types/event';
import { ParseResult } from './PackConfigParser';

export { ParseResult };

const VALID_EVENT_TYPES = ['merchant', 'storm', 'lucky', 'copy'];

export class EventConfigParser {
  /**
   * Parse a JSON string into an EventConfiguration.
   * Returns descriptive errors for invalid configs.
   */
  parse(jsonString: string): ParseResult<EventConfiguration> {
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

    if (!VALID_EVENT_TYPES.includes(obj['eventType'] as string)) {
      errors.push(`Field "eventType" must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
    }
    if (typeof obj['probability'] !== 'number') {
      errors.push('Field "probability" must be a number');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const config = raw as EventConfiguration;
    const validationErrors = validateEventConfiguration(config);
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors.map(e => `${e.field}: ${e.message}`)
      };
    }

    return { success: true, data: config, errors: [] };
  }

  /**
   * Serialize an EventConfiguration to a JSON string.
   */
  format(config: EventConfiguration): string {
    return JSON.stringify(config);
  }
}
