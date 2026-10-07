import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadDownloadedM6aCards } from './m6aCardsFile';

describe('m6a card download file', () => {
  it('loads card scans and rejects creature artwork', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm6a-'));
    const file = path.join(dir, 'm6a-cards.json');
    fs.writeFileSync(file, JSON.stringify({
      cards: [{
        id: 'tw_charizard',
        name: '噴火龍',
        number: '137',
        packId: 'kado-m6a',
        sourceUrl: 'https://www.kado.hk/card/tw/charizard',
        imageUrl: 'https://example.com/card-images/tw-cards/20045.png',
      }],
    }));
    const cards = loadDownloadedM6aCards(file);
    expect(cards).toHaveLength(1);
    expect(cards[0].imageUrl).toContain('card-images/tw-cards');
    expect(cards[0].imageUrl).not.toContain('official-artwork');
  });

  it('committed snapshot, when present, is real card data', () => {
    const file = path.resolve(__dirname, '../../data/m6a-cards.json');
    if (!fs.existsSync(file)) return;
    const cards = loadDownloadedM6aCards(file);
    expect(cards.length).toBeGreaterThanOrEqual(20);
    expect(cards.every(c => c.imageUrl.includes('card-images/tw-cards'))).toBe(true);
    expect(cards.some(c => c.name.includes('噴火龍') && c.imageUrl.includes('20045.png'))).toBe(true);
  });
});
