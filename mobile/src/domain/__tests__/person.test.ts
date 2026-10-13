import {
  birthLine,
  birthPlace,
  filmography,
  generatedBiography,
  longIsoDate,
  type Credit,
} from '../person';

describe('birthPlace', () => {
  it.each([
    ['New York City, New York, USA', 'New York, États-Unis'],
    ['Oakland, California, USA', 'Oakland, États-Unis'],
    ['London, England, UK', 'Londres, Royaume-Uni'],
    ['Montréal, Québec, Canada', 'Montréal, Canada'],
    ['Tokyo, Japan', 'Tokyo, Japon'],
    ['Lagos, Nowhere', 'Lagos, Nowhere'],
    ['USA', 'États-Unis'],
    ['', undefined],
  ])('%p → %p', (place, expected) => {
    expect(birthPlace(place)).toBe(expected);
  });
});

describe('longIsoDate', () => {
  it('sans décalage de fuseau', () => {
    expect(longIsoDate('1995-12-27')).toBe('27 décembre 1995');
    expect(longIsoDate('1991-02-01')).toBe('1er février 1991');
    expect(longIsoDate('pas une date')).toBeUndefined();
  });
});

describe('birthLine', () => {
  it('selon le genre TMDB', () => {
    expect(birthLine(2, '1995-12-27', 'New York City, New York, USA')).toBe(
      'Né le 27 décembre 1995 à New York, États-Unis',
    );
    expect(birthLine(1, '1996-09-01', 'Oakland, California, USA')).toBe(
      'Née le 1er septembre 1996 à Oakland, États-Unis',
    );
    expect(birthLine(0, '1990-01-15', undefined)).toBe('Né·e le 15 janvier 1990');
    expect(birthLine(undefined, undefined, 'Paris, France')).toBe('Né·e à Paris, France');
  });

  it('données absentes', () => {
    expect(birthLine(1, undefined, undefined)).toBe('Date et lieu de naissance non renseignés');
  });
});

describe('generatedBiography', () => {
  it('rôles marquants, accord selon le genre', () => {
    const roles = [
      { title: 'Dune', character: 'Chani' },
      { title: 'Euphoria', character: 'Rue Bennett' },
    ];
    expect(generatedBiography('Zendaya', 1, roles)).toBe(
      'Zendaya est connue pour Dune (Chani), Euphoria (Rue Bennett)…',
    );
    expect(generatedBiography('Jeremy Allen White', 2, [{ title: 'The Bear' }])).toBe(
      'Jeremy Allen White est connu pour The Bear…',
    );
    expect(generatedBiography('X', 3, [{ title: 'A', character: 'B' }])).toBe(
      'X est connu·e pour A (B)…',
    );
    expect(generatedBiography('X', 1, [])).toBeUndefined();
  });
});

describe('filmography', () => {
  const credits: Credit[] = [
    { id: 'movie-1', type: 'movie', popularity: 10, releaseDate: '2020-05-01' },
    { id: 'movie-2', type: 'movie', popularity: 90, releaseDate: '2015-01-01' },
    { id: 'movie-3', type: 'movie', popularity: 50 },
    { id: 'movie-4', type: 'movie', popularity: 5, releaseDate: '2027-03-01' },
    { id: 'tv-5', type: 'tv', popularity: 20, releaseDate: '2019-06-16' },
    { id: 'anime-6', type: 'anime', popularity: 40, releaseDate: '2023-09-29' },
  ];
  const ids = (list: Credit[]) => list.map((c) => c.id);

  it('Films par popularité', () => {
    expect(ids(filmography(credits, 'movie', 'pop'))).toEqual([
      'movie-2',
      'movie-3',
      'movie-1',
      'movie-4',
    ]);
  });

  it('Plus récent : date décroissante, sans date à la fin', () => {
    expect(ids(filmography(credits, 'movie', 'recent'))).toEqual([
      'movie-4',
      'movie-1',
      'movie-2',
      'movie-3',
    ]);
  });

  it('Séries réunit séries et animés', () => {
    expect(ids(filmography(credits, 'tv', 'pop'))).toEqual(['anime-6', 'tv-5']);
  });
});
