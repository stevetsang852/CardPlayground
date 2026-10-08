import { shouldRedrawCard } from './cardPaint';

describe('shouldRedrawCard', () => {
  it('paints a scanned card only once', () => {
    expect(shouldRedrawCard(true, false)).toBe(true);
    expect(shouldRedrawCard(true, true)).toBe(false);
  });

  it('keeps redrawing a card that has no scan', () => {
    expect(shouldRedrawCard(false, false)).toBe(true);
    expect(shouldRedrawCard(false, true)).toBe(true);
  });
});
