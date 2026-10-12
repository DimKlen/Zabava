import {
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
    expect(ids(sortFilms(towatch, sort, TODAY))).toEqual(expected);
  });

  it.each<[FilmFilter, string[]]>([
    [
      'all',
      ['dune3', 'odyssey', 'wicked2', 'obaa', 'sinners', 'avengers', 'f1', 'hailmary', 'monte'],
    ],
    ['mine', ['sinners', 'hailmary', 'monte']],
    ['cinema', ['odyssey']],
    ['upcoming', ['dune3', 'avengers']],
  ])('filtre « %s »', (filter, expected) => {
    expect(ids(filterFilms(towatch, filter, MY_PROVIDER_IDS, TODAY))).toEqual(expected);
  });

  it('segment Vus : le plus récemment vu en premier', () => {
    expect(ids(sortWatched(filmsInSegment(LIBRARY, 'watched')))).toEqual(['dune2', 'opp', 'anat']);
  });
});

describe('sortFilms', () => {
  it('met les films sans date de sortie à la fin du tri par sortie', () => {
    const [first, second] = towatch;
    if (!first || !second) throw new Error('données manquantes');
    const undated = { ...first, releaseTheatrical: undefined };
    expect(ids(sortFilms([undated, second], 'release', TODAY))).toEqual([second.id, first.id]);
  });
});

describe('filmCountLabel', () => {
  it('accorde au singulier et au pluriel', () => {
    expect(filmCountLabel(1)).toBe("1 film · appui long pour plus d'options");
    expect(filmCountLabel(9)).toBe("9 films · appui long pour plus d'options");
  });
});
