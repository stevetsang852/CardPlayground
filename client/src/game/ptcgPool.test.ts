import { PTCG_TEMPLATES, findPtcgTemplate } from './ptcgPool';

describe('ptcgPool', () => {
  it('has full TCG card image urls and all draw rarities', () => {
    expect(PTCG_TEMPLATES.length).toBeGreaterThanOrEqual(20);
    expect(PTCG_TEMPLATES.every(c => c.imageUrl.includes('card-images/tw-cards') || c.imageUrl.includes('images.pokemontcg.io'))).toBe(true);
    expect(PTCG_TEMPLATES.every(c => !c.imageUrl.includes('official-artwork'))).toBe(true);
    expect(PTCG_TEMPLATES.some(c => c.rarity === 'common')).toBe(true);
    expect(PTCG_TEMPLATES.some(c => c.rarity === 'legendary')).toBe(true);
    expect(findPtcgTemplate(1137)?.name).toContain('噴火龍');
    expect(findPtcgTemplate(1137)?.imageUrl).toContain('20045.png');
  });
});
