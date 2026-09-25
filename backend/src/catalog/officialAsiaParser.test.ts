import { parseOfficialPackIndex, parseOfficialCardList } from './officialAsiaParser';

describe('officialAsiaParser', () => {
  it('parses expansion codes from the HK card-search index', () => {
    const html = `
      * [](/hk/card-search/list/?expansionCodes=M6a)
      擴充包「30th CELEBRATION」
      * [](/hk/card-search/list/?expansionCodes=M6)
      擴充包「綠寶石風暴」
    `;
    const packs = parseOfficialPackIndex(html);
    expect(packs.map(p => p.code)).toEqual(['M6a', 'M6']);
    expect(packs[0].sourceUrl).toContain('expansionCodes=M6a');
  });

  it('parses detail links from a set list page', () => {
    const html = `+ [](/hk/card-search/detail/19615/)\n+ [](/hk/card-search/detail/19616/)`;
    const cards = parseOfficialCardList(html, 'official_M6a');
    expect(cards).toHaveLength(2);
    expect(cards[0].sourceUrl).toContain('/detail/19615/');
  });
});
