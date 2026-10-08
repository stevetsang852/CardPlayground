import { foilForCard, gradeForFoil, gradeForHit, GRADE_RANK } from './foilMap';

describe('foil grade map', () => {
  it('maps every Japanese hit kind to a distinct foil and grade', () => {
    const expected: Array<[string, string, string]> = [
      ['c', 'common', 'C'],
      ['u', 'uncommon reverse holo', 'U'],
      ['r', 'rare holo', 'R'],
      ['rr', 'rare holo v', 'RR'],
      ['ar', 'trainer gallery rare holo', 'AR'],
      ['sr', 'rare rainbow', 'SR'],
      ['sar', 'rare holo cosmos', 'SAR'],
      ['ur', 'rare secret', 'UR'],
    ];
    const grades = expected.map(([kind, foil, grade]) => {
      expect(foilForCard(kind)).toBe(foil);
      expect(gradeForHit(kind)).toBe(grade);
      expect(gradeForFoil(foil)).toBe(grade);
      return grade;
    });
    expect(new Set(grades).size).toBe(8);
  });

  it('ranks chase grades above the pack filler', () => {
    expect(GRADE_RANK.UR).toBeGreaterThan(GRADE_RANK.SAR);
    expect(GRADE_RANK.SAR).toBeGreaterThan(GRADE_RANK.SR);
    expect(GRADE_RANK.SR).toBeGreaterThan(GRADE_RANK.AR);
    expect(GRADE_RANK.AR).toBeGreaterThan(GRADE_RANK.RR);
    expect(GRADE_RANK.C).toBe(0);
  });

  it('falls back to the app rarity when a hit kind is missing', () => {
    expect(foilForCard(undefined, 'legendary')).toBe('rare holo cosmos');
    expect(gradeForFoil(foilForCard(undefined, 'mythic'))).toBe('UR');
    expect(gradeForFoil('not-a-foil')).toBe('C');
  });
});
