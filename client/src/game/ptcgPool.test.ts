import { PTCG_TEMPLATES, findPtcgTemplate } from './ptcgPool';

describe('ptcgPool', () => {
  it('has official artwork urls and all draw rarities', () => {
    expect(PTCG_TEMPLATES.length).toBeGreaterThanOrEqual(20);
    expect(PTCG_TEMPLATES.every(c => c.imageUrl.includes('official-artwork'))).toBe(true);
    expect(PTCG_TEMPLATES.some(c => c.rarity === 'common')).toBe(true);
    expect(PTCG_TEMPLATES.some(c => c.rarity === 'legendary')).toBe(true);
    expect(findPtcgTemplate(1137)?.name).toContain('噴火龍');
  });
});
