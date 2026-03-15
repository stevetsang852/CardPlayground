import * as fc from 'fast-check';
import { EventConfigParser } from './EventConfigParser';
import { EventConfiguration, EventType } from '../types/event';

const parser = new EventConfigParser();

const EVENT_TYPES: EventType[] = ['merchant', 'storm', 'lucky', 'copy'];

// Generator for valid EventConfiguration objects
const validEventConfigArb = fc.record({
  eventType: fc.constantFrom<EventType>(...EVENT_TYPES),
  probability: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true })
}) as fc.Arbitrary<EventConfiguration>;

// Generator for valid EventConfiguration with optional duration
const validEventConfigWithDurationArb = fc.oneof(
  validEventConfigArb,
  fc.record({
    eventType: fc.constantFrom<EventType>(...EVENT_TYPES),
    probability: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
    duration: fc.integer({ min: 1, max: 10000 })
  }) as fc.Arbitrary<EventConfiguration>
);

/**
 * Property 47: Event configuration round-trip
 * Validates: Requirements 14.4
 */
describe('Property 47: Event configuration round-trip', () => {
  test('format then parse produces equivalent config', () => {
    fc.assert(
      fc.property(validEventConfigWithDurationArb, (config) => {
        const serialized = parser.format(config);
        const result = parser.parse(serialized);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(parser.format(result.data!)).toEqual(serialized);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 48: Event configuration validation
 * Validates: Requirements 14.5, 14.6
 */
describe('Property 48: Event configuration validation', () => {
  test('configs with probability outside 0-100 are rejected', () => {
    const outOfRangeProbArb = fc.record({
      eventType: fc.constantFrom<EventType>(...EVENT_TYPES),
      probability: fc.oneof(
        fc.float({ min: Math.fround(-1000), max: Math.fround(-0.001), noNaN: true }),
        fc.float({ min: Math.fround(100.001), max: Math.fround(1000), noNaN: true })
      )
    });

    fc.assert(
      fc.property(outOfRangeProbArb, (config) => {
        const json = JSON.stringify(config);
        const result = parser.parse(json);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  test('configs with non-positive integer duration are rejected', () => {
    const invalidDurationArb = fc.record({
      eventType: fc.constantFrom<EventType>(...EVENT_TYPES),
      probability: fc.float({ min: 0, max: 100, noNaN: true }),
      duration: fc.oneof(
        fc.integer({ min: -1000, max: 0 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }).filter(n => !Number.isInteger(n))
      )
    });

    fc.assert(
      fc.property(invalidDurationArb, (config) => {
        const json = JSON.stringify(config);
        const result = parser.parse(json);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  test('valid configs are accepted', () => {
    fc.assert(
      fc.property(validEventConfigWithDurationArb, (config) => {
        const json = JSON.stringify(config);
        const result = parser.parse(json);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 49: Event configuration error reporting
 * Validates: Requirements 14.2
 */
describe('Property 49: Event configuration error reporting', () => {
  test('invalid JSON strings produce descriptive error messages', () => {
    const invalidJsonArb = fc.oneof(
      fc.string().filter(s => {
        try { JSON.parse(s); return false; } catch { return true; }
      }),
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

  test('configs with invalid eventType produce descriptive errors', () => {
    const invalidEventType = JSON.stringify({ eventType: 'unknown', probability: 50 });
    const result = parser.parse(invalidEventType);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('eventType'))).toBe(true);
  });

  test('configs with missing probability produce descriptive errors', () => {
    const missingProb = JSON.stringify({ eventType: 'lucky' });
    const result = parser.parse(missingProb);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('probability'))).toBe(true);
  });
});
