import { parsePackIndex, parseSetCards } from './kadoParser';

describe('kadoParser', () => {
  it('parses pack links from the public database index', () => {
    const html = `
      * [30th CELEBRATION](/set/9f21c00e-4e89-42d7-b56a-1173d1974cee) · 176 張
      * [擴充包「30th CELEBRATION」](/database/tw/M6a) · 168 張
    `;
    const packs = parsePackIndex(html, 'jp-en');
    expect(packs.length).toBe(2);
    expect(packs[0].sourceUrl).toContain('/set/9f21c00e');
    expect(packs[0].cardCount).toBe(176);
    expect(packs[1].sourceUrl).toContain('/database/tw/M6a');
  });

  it('parses numbered cards from a set page', () => {
    const html = `
      1. [001 蛋蛋](/card/eac38a13-53f8-412e-ada4-2208131f2e68)
      2. [002 椰樹獸](/card/e7f5f7f1-bbae-4a55-953d-e224690350a2)
    `;
    const cards = parseSetCards(html, 'set_m6a', 'https://www.kado.hk/set/m6a');
    expect(cards).toHaveLength(2);
    expect(cards[0].number).toBe('001');
    expect(cards[0].name).toBe('蛋蛋');
    expect(cards[0].sourceUrl).toContain('/card/eac38a13');
  });
});
