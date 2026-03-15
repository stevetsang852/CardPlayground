import { cryptoRandom } from './CryptoRandom';
import type { PlayerState, ActiveEvent } from '../store/gameStore';

export type ActionType = 'draw' | 'synthesize' | 'login' | 'purchase';

interface EventDefinition {
  type: ActiveEvent['type'];
  triggerChance: number; // probability per action
  duration: number;      // in action counts
  multiplier: number;
}

const EVENT_DEFINITIONS: EventDefinition[] = [
  { type: 'lucky',           triggerChance: 0.05, duration: 10, multiplier: 1.5 },
  { type: 'double_drop',     triggerChance: 0.03, duration: 5,  multiplier: 2.0 },
  { type: 'synthesis_boost', triggerChance: 0.04, duration: 8,  multiplier: 1.2 },
];

/**
 * Check if a new event should trigger after an action.
 * Returns the new event if triggered, null otherwise.
 * Same event type won't stack if already active.
 */
export function checkEventTrigger(
  actionType: ActionType,
  player: PlayerState,
  activeEvents: ActiveEvent[]
): ActiveEvent | null {
  for (const def of EVENT_DEFINITIONS) {
    // Don't stack same event type
    if (activeEvents.some(e => e.type === def.type && e.remainingActions > 0)) continue;

    if (cryptoRandom.nextFloat() < def.triggerChance) {
      return {
        id: `${def.type}_${Date.now()}_${cryptoRandom.nextInt(0, 9999)}`,
        type: def.type,
        remainingActions: def.duration,
        multiplier: def.multiplier,
      };
    }
  }
  return null;
}

/**
 * Decrement remaining actions for all active events after an action.
 * Returns updated events list with expired events removed.
 */
export function tickEvents(activeEvents: ActiveEvent[]): ActiveEvent[] {
  return activeEvents
    .map(e => ({ ...e, remainingActions: e.remainingActions - 1 }))
    .filter(e => e.remainingActions > 0);
}

/**
 * Process an action: tick existing events, check for new trigger.
 * Returns updated events list.
 */
export function processAction(
  actionType: ActionType,
  player: PlayerState,
  activeEvents: ActiveEvent[]
): ActiveEvent[] {
  const ticked = tickEvents(activeEvents);
  const newEvent = checkEventTrigger(actionType, player, ticked);
  if (newEvent) return [...ticked, newEvent];
  return ticked;
}
