import * as fc from 'fast-check';
import { PackConfigParser } from './PackConfigParser';
import { PackConfiguration } from '../types/pack';

const parser = new PackConfigParser();

// Generator for valid PackConfiguration objects
const validPackConfigArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom<'basic' | 'premium' | 'legendary'>('basic', 'premium', 'legendary'),
  cost: fc.integer({ min: 1, max: 10000 }),
  currencyType: fc.constantFrom<'soft' | 'hard'>('soft', 'hard'),
  probabilities: fc.record({
    legendary: fc.float({ min: Math.fround(0), max: Math.fround(0.2), noNaN: true }),
    epic: fc.float({ min: Math.fround(0), max: Math.fround(0.5), noNaN: true }),
    rare: fc.float({ min: Math.fround(0), max: Math.fround(0.7), noNaN: true }),
    common: fc.float({ min: Math.fround(0.01), max: Math.fround(1), noNaN: true })
  }).map(probs => {
    const total = probs.legendary + probs.epic + probs.rare + probs.common;
    return {
      legendary: probs.legendary / total,
      epic: probs.epic / total,
      rare: probs.rare / total,
      common: probs.common / total
    };
  })
}) as fc.Arbitrary<PackConfiguration>;

/**
 * Property 44: Pack configuration round-trip
 * Validates: Requirements 13.4
 */
describe('Property 44: Pack configuration round-trip', () => {
  test('format then parse produces equivalent config', () => {
    fc.assert(
      fc.property(validPackConfigArb, (config) => {
        const serialized = parser.format(config);
        const result = parser.parse(serialized);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        // Round-trip: re-format the parsed data and compare
        expect(parser.format(result.data!)).toEqual(serialized);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 45: Pack configuration validation
 * Validates: Requirements 13.5, 13.6
 */
describe('Property 45: Pack configuration validation', () => {
  test('configs with probabilities not summing to 1.0 are rejected', () => {
    // Generate configs where probabilities clearly don't sum to 1.0
    const invalidProbArb = fc.record({
      id: fc.string({ minLength: 1 }),
      name: fc.string({ minLength: 1 }),
      type: fc.constantFrom<'basic' | 'premium' | 'legendary'>('basic', 'premium', 'legendary'),
      cost: fc.integer({ min: 1, max: 10000 }),
      currencyType: fc.constantFrom<'soft' | 'hard'>('soft', 'hard'),
      probabilities: fc.record({
        legendary: fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }),
        epic: fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }),
        rare: fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }),
        common: fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true })
      }).filter(probs => {
        const sum = probs.legendary + probs.epic + probs.rare + probs.common;
        return Math.abs(sum - 1.0) > 0.0001;
      })
    });

    fc.assert(
      fc.property(invalidProbArb, (config) => {
        const json = JSON.stringify(config);
        const result = parser.parse(json);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  test('valid configs with probabilities summing to 1.0 are accepted', () => {
    fc.assert(
      fc.property(validPackConfigArb, (config) => {
        const json = JSON.stringify(config);
        const result = parser.parse(json);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 46: Pack configuration error reporting
 * Validates: Requirements 13.2
 */
describe('Property 46: Pack configuration error reporting', () => {
  test('invalid JSON strings produce descriptive error messages', () => {
    // Generate strings that are not valid JSON objects
    const invalidJsonArb = fc.oneof(
      // Completely invalid JSON
      fc.string().filter(s => {
        try { JSON.parse(s); return false; } catch { return true; }
      }),
      // Valid JSON but not an object
      fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.integer()))
        .map(v => JSON.stringify(v))
    );

    fc.assert(
      fc.property(invalidJsonArb, (input) => {
        const result = parser.parse(input);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        result.errors.forEach(err => {
          expect(typeof err).toBe('string');
          expect(err.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('configs with missing required fields produce descriptive errors', () => {
    // Missing id
    const missingId = JSON.stringify({
      name: 'Test', type: 'basic', cost: 100, currencyType: 'soft',
      probabilities: { legendary: 0.005, epic: 0.05, rare: 0.245, common: 0.7 }
    });
    const r1 = parser.parse(missingId);
    expect(r1.success).toBe(false);
    expect(r1.errors.some(e => e.includes('id'))).toBe(true);

    // Invalid type
    const invalidType = JSON.stringify({
      id: 'x', name: 'Test', type: 'ultra', cost: 100, currencyType: 'soft',
      probabilities: { legendary: 0.005, epic: 0.05, rare: 0.245, common: 0.7 }
    });
    const r2 = parser.parse(invalidType);
    expect(r2.success).toBe(false);
    expect(r2.errors.some(e => e.includes('type'))).toBe(true);
  });
});
