import {
  addActor,
  advancedQuery,
  countButtonLabel,
  defaultFilters,
  genreCountLabel,
  minRatingLabel,
  removeActor,
  setMinRating,
  setYearFrom,
  setYearTo,
  toggleValue,
  yearsLabel,
} from '../advancedSearch';

const NOW = new Date(2026, 9, 11, 12);

describe('filtres par défaut', () => {
  it('1990 → année courante, tous types, popularité', () => {
    const filters = defaultFilters(NOW);
    expect(yearsLabel(filters)).toBe('1990 – 2026');
    expect(advancedQuery(filters)).toEqual({
      type: undefined,
      genres: undefined,
      cast: undefined,
      yearFrom: 1990,
      yearTo: 2026,
      minRating: undefined,
      providers: undefined,
      lang: undefined,
      maxRuntime: undefined,
      sort: 'pop',
    });
  });
});

describe('années', () => {
  it('De ne dépasse jamais À, et inversement', () => {
    const filters = defaultFilters(NOW);
    expect(setYearFrom(filters, 2030).yearFrom).toBe(2026);
    expect(setYearTo({ ...filters, yearFrom: 2000 }, 1980).yearTo).toBe(2000);
    expect(setYearFrom(filters, 1969.6).yearFrom).toBe(1970);
  });
});

describe('note minimale', () => {
  it('pas de 0,5, bornée à 0 → 10', () => {
    const filters = defaultFilters(NOW);
    expect(setMinRating(filters, 7.3).minRating).toBe(7.5);
    expect(setMinRating(filters, 12).minRating).toBe(10);
    expect(setMinRating(filters, -1).minRating).toBe(0);
  });

  it('libellé', () => {
    expect(minRatingLabel(0)).toBe('Toutes les notes');
    expect(minRatingLabel(7.5)).toBe('7,5/10 minimum');
    expect(minRatingLabel(8)).toBe('8/10 minimum');
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
      minRating: 7.5,
      availability: 'mine' as const,
      language: 'ja' as const,
      maxRuntime: '120' as const,
      sort: 'recent' as const,
    };
    expect(advancedQuery(filters)).toEqual({
      type: 'movie,anime',
      genres: 'action,thriller',
      cast: undefined,
      yearFrom: 1990,
      yearTo: 2026,
      minRating: 7.5,
      providers: 'mine',
      lang: 'ja',
      maxRuntime: 120,
      sort: 'recent',
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
