import { KADO_M6A_CARDS, KADO_PACKS } from './kadoSnapshot';
import { guessRarity } from './rarityGuess';

describe('kadoSnapshot', () => {
  it('ships latest public M6a cards with source URLs', () => {
    expect(KADO_PACKS.length).toBeGreaterThanOrEqual(3);
    expect(KADO_M6A_CARDS.length).toBeGreaterThanOrEqual(20);
    expect(KADO_M6A_CARDS.every(c => c.sourceUrl.includes('kado.hk/card'))).toBe(true);
    expect(KADO_M6A_CARDS.some(c => c.name.includes('噴火龍'))).toBe(true);
  });

  it('guesses chase rarities', () => {
    expect(guessRarity('夢幻VMAX', '163')).toBe('legendary');
    expect(guessRarity('皮卡丘ex', '126')).toBe('epic');
    expect(guessRarity('蛋蛋', '001')).toBe('common');
  });
});
