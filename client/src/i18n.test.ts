import { translate } from './i18n';

describe('translate', () => {
  it('returns Traditional Chinese and English for the same key', () => {
    expect(translate('zh-Hant', 'nav.draw')).toBe('抽卡');
    expect(translate('en', 'nav.draw')).toBe('Draw');
  });

  it('fills placeholders', () => {
    expect(translate('zh-Hant', 'draw.one', { cost: 100 })).toBe('1 包 — 100');
    expect(translate('en', 'home.collectionCount', { n: 3 })).toBe('3 cards');
  });

  it('falls back to English, then the key', () => {
    expect(translate('zh-Hant', 'nav.home')).toBe('首頁');
    expect(translate('en', 'missing.key')).toBe('missing.key');
  });
});
