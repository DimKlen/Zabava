import { useLanguageStore } from '@/i18n';

import { genreCountLabel, GENRES } from '../advancedSearch';
import { birthLine, generatedBiography } from '../person';
import { resultsCountLabel } from '../search';
import { noDateLine } from '../upcoming';
import { SERIES_FILTERS } from '../seriesList';

describe('textes du domaine dans les autres langues', () => {
  afterEach(() => {
    useLanguageStore.setState({ preference: 'auto' });
  });

  it('en : pluriels, libellés et phrases composées', () => {
    useLanguageStore.setState({ preference: 'en' });
    expect(resultsCountLabel(1)).toBe('1 result');
    expect(resultsCountLabel(1240)).toBe('1,240 results');
    expect(genreCountLabel(0, 'movie')).toBe('0 movies');
    expect(noDateLine(4)).toBe('Season 4 announced, date to come');
    expect(GENRES[0]?.label).toBe('Action');
    expect(SERIES_FILTERS[1]?.label).toBe('On my platforms');
    expect(birthLine(1, '1996-09-01', undefined)).toBe('Born on September 1, 1996');
    expect(generatedBiography('Zendaya', 1, [{ title: 'Dune', character: 'Chani' }])).toBe(
      'Zendaya is known for Dune (Chani)…',
    );
  });

  it('ja : pas de pluriel, libellés lus à l’affichage', () => {
    useLanguageStore.setState({ preference: 'ja' });
    expect(resultsCountLabel(1)).toBe('1件');
    expect(genreCountLabel(3, 'tv')).toBe('シリーズ3作品');
    expect(SERIES_FILTERS[0]?.label).toBe('すべて');
  });

  it('fr : 1er du mois et genre accordé', () => {
    useLanguageStore.setState({ preference: 'fr' });
    expect(birthLine(1, '1996-09-01', undefined)).toBe('Née le 1er septembre 1996');
    expect(birthLine(0, undefined, undefined)).toBe('Date et lieu de naissance non renseignés');
  });
});
