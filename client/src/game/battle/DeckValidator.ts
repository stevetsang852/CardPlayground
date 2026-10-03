import { ValidationResult } from './BattleTypes';

export function validate(
  cardIds: string[],
  collection: Array<{ id: string; rarity: string; [key: string]: unknown }>
): ValidationResult {
  const errors: string[] = [];

  // Rule 1: deck length 5–8
  if (cardIds.length < 5) {
    errors.push('套牌至少需要 5 張');
  } else if (cardIds.length > 8) {
    errors.push('套牌上限為 8 張');
  }

  // Rule 2: mythic cards ≤ 1
  const collectionMap = new Map(collection.map(c => [c.id, c]));
  const mythicCount = cardIds.filter(id => collectionMap.get(id)?.rarity === 'mythic').length;
  if (mythicCount > 1) {
    errors.push('每場限帶 1 張神話卡');
  }

  // Rule 3: all cards must exist in collection
  for (const id of cardIds) {
    if (!collectionMap.has(id)) {
      errors.push(`卡牌 ${id} 不在收藏中`);
    }
  }

  return { valid: errors.length === 0, errors };
}
