import { useLanguageStore } from '@/i18n';

import { pluralCategory, tPlural } from '../plural';

describe('pluralCategory', () => {
  it.each([
    ['fr', 0, 'one'],
    ['fr', 1, 'one'],
    ['fr', 2, 'other'],
    ['pt', 0, 'one'],
    ['en', 0, 'other'],
    ['en', 1, 'one'],
    ['de', 2, 'other'],
    ['ja', 1, 'other'],
  ] as const)('%s, %p → %s', (language, count, expected) => {
    expect(pluralCategory(language, count)).toBe(expected);
  });
});

describe('tPlural', () => {
  afterEach(() => {
    useLanguageStore.setState({ preference: 'auto' });
  });

  it('choisit la clé selon la langue courante', () => {
    useLanguageStore.setState({ preference: 'fr' });
    expect(tPlural('common.series.seasons', 1)).toBe('1 saison');
    expect(tPlural('common.series.seasons', 3)).toBe('3 saisons');
    useLanguageStore.setState({ preference: 'en' });
    expect(tPlural('common.series.episodes', 1)).toBe('1 episode');
    expect(tPlural('common.series.episodes', 0)).toBe('0 episodes');
  });
});
