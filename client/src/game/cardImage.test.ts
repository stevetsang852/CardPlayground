import { cardImageAttrs } from './cardImage';

describe('cardImageAttrs', () => {
  it('defers offscreen scans', () => {
    expect(cardImageAttrs()).toEqual({
      loading: 'lazy',
      decoding: 'async',
      fetchPriority: 'low',
    });
  });

  it('loads the card the player is looking at immediately', () => {
    expect(cardImageAttrs('high').loading).toBe('eager');
    expect(cardImageAttrs('high').fetchPriority).toBe('high');
  });
});
