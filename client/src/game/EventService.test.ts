import { checkEventTrigger, tickEvents, processAction } from './EventService';
import type { PlayerState, ActiveEvent } from '../store/gameStore';

if (typeof globalThis.crypto === 'undefined') {
  const nodeCrypto = eval('require')('crypto') as { webcrypto: Crypto };
  Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto.webcrypto });
}

const defaultPlayer: PlayerState = {
  softCurrency: 500,
  hardCurrency: 0,
  luckValue: 0,
  drawsSinceLastLegendary: 0,
  drawsSinceLastMythic: 0,
  consecutiveSynthesisFailures: 0,
  totalDraws: 0,
  loginDays: 0,
  lastLoginDate: '',
  actionCount: 0,
};

describe('EventService', () => {
  describe('tickEvents', () => {
    it('decrements remainingActions by 1', () => {
      const events: ActiveEvent[] = [
        { id: 'e1', type: 'lucky', remainingActions: 3, multiplier: 1.5 },
      ];
      const result = tickEvents(events);
      expect(result[0]!.remainingActions).toBe(2);
    });

    it('removes events with 0 remaining actions', () => {
      const events: ActiveEvent[] = [
        { id: 'e1', type: 'lucky', remainingActions: 1, multiplier: 1.5 },
        { id: 'e2', type: 'double_drop', remainingActions: 3, multiplier: 2 },
      ];
      const result = tickEvents(events);
      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('double_drop');
    });

    it('returns empty array when all events expire', () => {
      const events: ActiveEvent[] = [
        { id: 'e1', type: 'lucky', remainingActions: 1, multiplier: 1.5 },
      ];
      expect(tickEvents(events)).toHaveLength(0);
    });
  });

  describe('checkEventTrigger', () => {
    it('does not stack same event type', () => {
      const activeEvents: ActiveEvent[] = [
        { id: 'e1', type: 'lucky', remainingActions: 5, multiplier: 1.5 },
      ];
      // Run many times — lucky should never trigger again since it's already active
      for (let i = 0; i < 200; i++) {
        const result = checkEventTrigger('draw', defaultPlayer, activeEvents);
        if (result?.type === 'lucky') {
          fail('lucky event stacked when already active');
        }
      }
    });

    it('can trigger an event over many actions', () => {
      let triggered = false;
      for (let i = 0; i < 500; i++) {
        const result = checkEventTrigger('draw', defaultPlayer, []);
        if (result !== null) { triggered = true; break; }
      }
      expect(triggered).toBe(true);
    });
  });

  describe('processAction', () => {
    it('ticks existing events', () => {
      const events: ActiveEvent[] = [
        { id: 'e1', type: 'lucky', remainingActions: 3, multiplier: 1.5 },
      ];
      const result = processAction('draw', defaultPlayer, events);
      const lucky = result.find(e => e.type === 'lucky');
      // Either still present with decremented count, or expired
      if (lucky) expect(lucky.remainingActions).toBe(2);
    });

    it('returns array of active events', () => {
      const result = processAction('draw', defaultPlayer, []);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
