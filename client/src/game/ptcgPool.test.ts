import { PTCG_TEMPLATES, findPtcgTemplate } from './ptcgPool';

function isCardScan(url: string) {
  return url.includes('card-images/tw-cards')
    || url.includes('images.pokemontcg.io')
    || url.includes('asia.pokemon-card.com/hk/card-img/');
}

describe('ptcgPool', () => {
  it('has full TCG card image urls and all draw rarities', () => {
    expect(PTCG_TEMPLATES.length).toBeGreaterThanOrEqual(250);
    expect(PTCG_TEMPLATES.every(c => isCardScan(c.imageUrl))).toBe(true);
    expect(PTCG_TEMPLATES.every(c => !c.imageUrl.includes('official-artwork'))).toBe(true);
    expect(PTCG_TEMPLATES.some(c => c.rarity === 'common')).toBe(true);
    expect(PTCG_TEMPLATES.some(c => c.rarity === 'legendary')).toBe(true);
    expect(findPtcgTemplate(1137)?.name).toContain('噴火龍');
    expect(findPtcgTemplate(1137)?.imageUrl).toContain('20045.png');
  });

  it('includes older KADO sets and official sets KADO has not listed', () => {
    const series = new Set(PTCG_TEMPLATES.map(card => card.series));
    expect(series.has('閃色明星V')).toBe(true);
    expect(series.has('傳說交鋒')).toBe(true);
    expect(series.has('美夢成真組合篇')).toBe(true);
    expect(series.has('寶可夢卡牌151')).toBe(true);
    expect(series.has('25週年收藏款')).toBe(true);
    expect(series.has('劍&盾')).toBe(true);
    expect(series.has('眾星雲集組合篇')).toBe(true);
  });
});
