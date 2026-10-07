import { parsePackIndex, parseSetCards, parseTwSetList, extractCardImageUrl } from './kadoParser';

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
      - [蛋蛋](/card/tw/68d517a2-ae26-4965-a47a-c6ec5262a8cd) · 001
    `;
    const cards = parseSetCards(html, 'set_m6a', 'https://www.kado.hk/set/m6a');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.some(c => c.name === '蛋蛋' && c.number === '001')).toBe(true);
  });

  it('parses live TW set markup and card-scan og:image', () => {
    const html = `
      <a href="/card/tw/9683982f-bbbf-4fa4-8310-7ad900126365">137 <!-- -->噴火龍</a>
      <meta property="og:image" content="https://nyqehdzrfeoutdzpwzit.supabase.co/storage/v1/object/public/card-images/tw-cards/20045.png"/>
    `;
    const cards = parseTwSetList(html);
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('噴火龍');
    expect(cards[0].number).toBe('137');
    expect(cards[0].id).toBe('tw_9683982f-bbbf-4fa4-8310-7ad900126365');
    expect(extractCardImageUrl(html)).toContain('card-images/tw-cards/20045.png');
    expect(extractCardImageUrl(html)).not.toContain('official-artwork');
  });
});
