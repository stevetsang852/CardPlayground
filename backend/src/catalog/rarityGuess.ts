export type AppRarity = 'common' | 'rare' | 'epic' | 'legendary';

export function guessRarity(name: string, number?: string): AppRarity {
  const n = Number(number);
  if (/VMAX|VSTAR|LEGEND|SAR|FUR|UR/i.test(name)) return 'legendary';
  if (/(?:^|\s)(?:ex|EX|GX|V|BREAK)\b/.test(name) || /ex$/.test(name)) return 'epic';
  if (!Number.isNaN(n) && n >= 136) return 'legendary';
  if (!Number.isNaN(n) && n >= 104) return 'epic';
  if (!Number.isNaN(n) && n >= 70) return 'rare';
  if (/能量|Energy|球|平板|交替/.test(name)) return 'rare';
  return 'common';
}
