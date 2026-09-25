import { FOIL_BY_HIT, foilForCard } from './foilMap';

describe('foilMap', () => {
  it('uses a distinct foil for every hit kind', () => {
    const foils = Object.values(FOIL_BY_HIT);
    expect(new Set(foils).size).toBe(foils.length);
  });

  it('maps chase hits to cosmos or secret', () => {
    expect(foilForCard('sar')).toContain('cosmos');
    expect(foilForCard('ur')).toContain('secret');
    expect(foilForCard('rr')).toContain('v');
    expect(foilForCard('r')).toBe('rare holo');
  });
});
