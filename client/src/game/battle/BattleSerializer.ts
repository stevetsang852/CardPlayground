import type { BattleState } from './BattleTypes';

const REQUIRED_FIELDS: (keyof BattleState)[] = [
  'mode',
  'wave',
  'playerHp',
  'sp',
  'grid',
  'enemies',
  'deck',
  'activeBonuses',
  'rewards',
];

export class BattleSerializer {
  /** Serialize BattleState to JSON string (Req 12.1) */
  serialize(state: BattleState): string {
    return JSON.stringify(state);
  }

  /**
   * Deserialize JSON string to BattleState or Error (Req 12.2, 12.3, 12.4)
   * - Malformed JSON → return Error with descriptive message (do NOT throw)
   * - Missing required fields → return Error listing ALL missing fields
   */
  deserialize(json: string): BattleState | Error {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      return new Error(`Invalid JSON: ${(e as Error).message}`);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return new Error('Invalid JSON: expected an object');
    }

    const obj = parsed as Record<string, unknown>;
    const missing = REQUIRED_FIELDS.filter((field) => !(field in obj));

    if (missing.length > 0) {
      return new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    return obj as unknown as BattleState;
  }

  /** Pretty print with 2-space indent (Req 12.6) */
  prettyPrint(state: BattleState): string {
    return JSON.stringify(state, null, 2);
  }
}
