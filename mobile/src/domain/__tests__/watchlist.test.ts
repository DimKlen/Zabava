import {
  filterByName,
  filmCountLabel,
  filmsInSegment,
  filterFilms,
  sortFilms,
  sortWatched,
  type FilmFilter,
  type FilmSort,
} from '../watchlist';

import { ids, LIBRARY, MY_PROVIDER_IDS, TODAY } from '../__fixtures__/prototypeFilms';

// Résultats calculés avec la logique de specs/reference/app.js et les données de data.js.
const towatch = filmsInSegment(LIBRARY, 'towatch');

describe('Ma liste › Films : mêmes résultats que le prototype', () => {
  it.each<[FilmSort, string[]]>([
    [
      'added',
      ['dune3', 'odyssey', 'wicked2', 'obaa', 'sinners', 'avengers', 'f1', 'hailmary', 'monte'],
    ],
    [
      'release',
      ['monte', 'sinners', 'f1', 'obaa', 'wicked2', 'hailmary', 'odyssey', 'dune3', 'avengers'],
    ],
    [
      'title',
      ['avengers', 'dune3', 'f1', 'odyssey', 'monte', 'sinners', 'hailmary', 'obaa', 'wicked2'],
    ],
    [
      'imdb',
      ['obaa', 'hailmary', 'odyssey', 'f1', 'monte', 'sinners', 'wicked2', 'dune3', 'avengers'],
    ],
  ])('tri « %s »', (sort, expected) => {
    expect(ids(sortFilms(towatch, sort))).toEqual(expected);
  });

  it.each<[FilmFilter, string[]]>([
    [
      'all',
      ['dune3', 'odyssey', 'wicked2', 'obaa', 'sinners', 'avengers', 'f1', 'hailmary', 'monte'],
    ],
    // Abonnement ou location : le prototype ne comptait que l'abonnement (retour d'usage, issue 26).
    ['mine', ['wicked2', 'obaa', 'sinners', 'hailmary', 'monte']],
    ['cinema', ['odyssey']],
    ['upcoming', ['dune3', 'avengers']],
  ])('filtre « %s »', (filter, expected) => {
    expect(ids(filterFilms(towatch, filter, MY_PROVIDER_IDS, TODAY))).toEqual(expected);
  });

  it('segment Vus : le plus récemment vu en premier', () => {
    expect(ids(sortWatched(filmsInSegment(LIBRARY, 'watched')))).toEqual(['dune2', 'opp', 'anat']);
  });
});

describe('sortFilms inversé', () => {
  it.each<FilmSort>(['added', 'title'])('« %s » : ordre inverse', (sort) => {
    expect(ids(sortFilms(towatch, sort, true))).toEqual(ids(sortFilms(towatch, sort)).reverse());
  });

  it('release : sens inverse, films sans date toujours à la fin', () => {
    const [first] = towatch;
    if (!first) throw new Error('données manquantes');
    const undated = {
      ...first,
      id: 'undated',
      releaseTheatrical: undefined,
      releaseDigital: undefined,
      year: undefined,
    };
    const result = ids(sortFilms([undated, ...towatch], 'release', true));
    expect(result[result.length - 1]).toBe('undated');
    // « monte » est le plus proche : il passe juste avant les films sans date.
    expect(result[result.length - 2]).toBe('monte');
  });
});

describe('sortFilms', () => {
  it('met les films sans date de sortie à la fin du tri par sortie', () => {
    const [first, second] = towatch;
    if (!first || !second) throw new Error('données manquantes');
    const undated = { ...first, releaseTheatrical: undefined };
    expect(ids(sortFilms([undated, second], 'release'))).toEqual([second.id, first.id]);
  });

  it("replie sur la sortie numérique puis l'année quand la sortie en salle manque", () => {
    const [base] = towatch;
    if (!base) throw new Error('données manquantes');
    const film = (id: string, extra: object) => ({
      ...base,
      id,
      releaseTheatrical: undefined,
      releaseDigital: undefined,
      year: undefined,
      ...extra,
    });
    const none = film('none', {});
    const byYear = film('year', { year: 2016 });
    const digital = film('digital', { releaseDigital: '2025-03-01' });
    const theatrical = film('theatrical', { releaseTheatrical: '2024-11-29' });
    expect(ids(sortFilms([none, digital, theatrical, byYear], 'release'))).toEqual([
      'year',
      'theatrical',
      'digital',
      'none',
    ]);
  });
});

describe('filmCountLabel', () => {
  it('accorde au singulier et au pluriel', () => {
    expect(filmCountLabel(1)).toBe("1 film · appui long pour plus d'options");
    expect(filmCountLabel(9)).toBe("9 films · appui long pour plus d'options");
  });
});

describe('filterByName', () => {
  const titles = [
    { title: 'Le Diable, tout le temps' },
    { title: 'Dune : Deuxième partie' },
    { title: "L'Odyssée" },
  ];
  const names = (query: string) => filterByName(titles, query).map((t) => t.title);

  it('début de mots, sans accents ni casse ni ponctuation', () => {
    expect(names('diable temps')).toEqual(['Le Diable, tout le temps']);
    expect(names('DEUXIEME')).toEqual(['Dune : Deuxième partie']);
    expect(names('odyss')).toEqual(["L'Odyssée"]);
  });

  it('requête vide : tout ; aucun mot commun : rien', () => {
    expect(names('  ')).toHaveLength(3);
    expect(names('zzz')).toEqual([]);
  });
});
