import {
  DEFAULT_GENRE_FILTERS,
  GENRE_MIN_RATING,
  addActor,
  advancedQuery,
  countButtonLabel,
  defaultFilters,
  genreCountLabel,
  genreQuery,
  removeActor,
  setYears,
  toggleValue,
  yearsLabel,
} from '../advancedSearch';

const NOW = new Date(2026, 9, 11, 12);

describe('filtres par défaut', () => {
  it('1990 → année courante, tous types', () => {
    const filters = defaultFilters(NOW);
    expect(yearsLabel(filters)).toBe('1990 – 2026');
    expect(advancedQuery(filters)).toEqual({
      type: undefined,
      genres: undefined,
      cast: undefined,
      yearFrom: 1990,
      yearTo: 2026,
      providers: undefined,
    });
  });
});

describe('années', () => {
  it('une seule plage : De ≤ À, valeurs arrondies', () => {
    const filters = defaultFilters(NOW);
    expect(setYears(filters, [2000, 2010])).toMatchObject({ yearFrom: 2000, yearTo: 2010 });
    expect(setYears(filters, [2030, 2026])).toMatchObject({ yearFrom: 2026, yearTo: 2030 });
    expect(setYears(filters, [1969.6, 2000]).yearFrom).toBe(1970);
  });
});

describe('acteurs', () => {
  it('sans doublon, retirés par id', () => {
    let filters = addActor(defaultFilters(NOW), { id: 1, name: 'Zendaya' });
    filters = addActor(filters, { id: 1, name: 'Zendaya' });
    filters = addActor(filters, { id: 2, name: 'Tom Holland' });
    expect(advancedQuery(filters).cast).toBe('1,2');
    expect(removeActor(filters, 1).actors).toEqual([{ id: 2, name: 'Tom Holland' }]);
  });
});

describe('advancedQuery', () => {
  it('traduit tous les filtres', () => {
    const filters = {
      ...defaultFilters(NOW),
      types: toggleValue(toggleValue([], 'movie' as const), 'anime' as const),
      genres: toggleValue(['action' as const], 'thriller' as const),
      availability: 'mine' as const,
    };
    expect(advancedQuery(filters)).toEqual({
      type: 'movie,anime',
      genres: 'action,thriller',
      cast: undefined,
      yearFrom: 1990,
      yearTo: 2026,
      providers: 'mine',
    });
  });

  it('toggleValue retire une valeur déjà choisie', () => {
    expect(toggleValue(['movie', 'tv'], 'movie')).toEqual(['tv']);
  });
});

describe('countButtonLabel', () => {
  it.each([
    [0, 'Aucun résultat'],
    [1, 'Voir le résultat'],
    [2, 'Voir les 2 résultats'],
    [148, 'Voir les 148 résultats'],
    [44774, `Voir les ${(44774).toLocaleString('fr-CA')} résultats`],
  ])('%p → %p', (count, label) => {
    expect(countButtonLabel(count)).toBe(label);
  });
});

describe('genreCountLabel', () => {
  it('singulier, pluriel et séparateur de milliers fr-CA', () => {
    expect(genreCountLabel(1, 'movie')).toBe('1 film');
    expect(genreCountLabel(0, 'tv')).toBe('0 série');
    expect(genreCountLabel(12, 'anime')).toBe('12 animés');
    expect(genreCountLabel(1240, 'movie')).toBe(`${(1240).toLocaleString('fr-CA')} films`);
  });
});

describe('liste par genre', () => {
  it('plus récents par défaut, sans filtre', () => {
    expect(genreQuery('movie', 'animation', DEFAULT_GENRE_FILTERS)).toEqual({
      type: 'movie',
      genres: 'animation',
      sort: 'recent',
      providers: undefined,
      minRating: undefined,
    });
  });

  it('mes plateformes et note minimale', () => {
    expect(
      genreQuery('tv', 'drame', { sort: 'rating', mine: true, minRating: GENRE_MIN_RATING }),
    ).toEqual({ type: 'tv', genres: 'drame', sort: 'rating', providers: 'mine', minRating: 7 });
  });
});
