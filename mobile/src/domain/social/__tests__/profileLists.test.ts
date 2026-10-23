import type { LibrarySeries } from '../../seriesList';
import type { LibraryMovie } from '../../watchlist';
import {
  defaultSegment,
  myMovieGrid,
  mySeriesBucket,
  mySeriesGrid,
  segmentFor,
} from '../profileLists';

const NOW = new Date('2026-10-20T12:00:00Z');
const EMPTY = { sub: [], rent: [], buy: [] };

const movie = (id: number, status: 'towatch' | 'watched', addedAt: string, watchedAt?: string) =>
  ({
    id: `movie-${id}`,
    tmdbId: id,
    title: `Film ${id}`,
    availability: EMPTY,
    userTitle: { titleId: `movie-${id}`, status, addedAt, watchedAt, notificationsEnabled: true },
  }) as unknown as LibraryMovie;

const episode = (id: number, season: number, number: number, watchedAt?: string) => ({
  id,
  season,
  number,
  airDate: '2026-09-01',
  watchedAt,
});

const series = (
  id: number,
  episodes: ReturnType<typeof episode>[],
  options: { ended?: boolean; status?: 'following' | 'abandoned'; addedAt?: string } = {},
) =>
  ({
    id: `tv-${id}`,
    tmdbId: id,
    type: 'tv',
    title: `Série ${id}`,
    ended: options.ended ?? false,
    availability: EMPTY,
    userTitle: {
      titleId: `tv-${id}`,
      status: options.status ?? 'following',
      addedAt: options.addedAt ?? '2026-09-01T00:00:00Z',
      notificationsEnabled: true,
    },
    episodes,
  }) as unknown as LibrarySeries;

describe('segments', () => {
  it('Vus par défaut pour les films, En cours pour les séries', () => {
    expect(defaultSegment('movie')).toBe('watched');
    expect(defaultSegment('anime')).toBe('in_progress');
  });

  it('un segment qui n’existe pas dans l’onglet revient au défaut', () => {
    expect(segmentFor('movie', 'in_progress')).toBe('watched');
    expect(segmentFor('tv', 'towatch')).toBe('towatch');
    expect(segmentFor('tv', 'watched')).toBe('in_progress');
  });

  it('sections de Ma liste → segments', () => {
    expect(mySeriesBucket('watch')).toBe('in_progress');
    expect(mySeriesBucket('stale')).toBe('in_progress');
    expect(mySeriesBucket('uptodate')).toBe('in_progress');
    expect(mySeriesBucket('done')).toBe('finished');
    expect(mySeriesBucket('notstarted')).toBe('towatch');
    expect(mySeriesBucket('abandoned')).toBeNull();
  });
});

describe('myMovieGrid', () => {
  const movies = [
    movie(1, 'watched', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'),
    movie(2, 'watched', '2026-10-05T00:00:00Z', '2026-09-15T00:00:00Z'),
    movie(3, 'towatch', '2026-09-10T00:00:00Z'),
    movie(4, 'towatch', '2026-10-10T00:00:00Z'),
  ];

  it('Vus : date de visionnage décroissante', () => {
    expect(myMovieGrid(movies, 'watched').map((m) => m.tmdbId)).toEqual([1, 2]);
  });

  it('À voir : date d’ajout décroissante', () => {
    expect(myMovieGrid(movies, 'towatch').map((m) => m.tmdbId)).toEqual([4, 3]);
  });
});

describe('mySeriesGrid', () => {
  const inProgress = series(10, [
    episode(1, 1, 1, '2026-10-01T00:00:00Z'),
    episode(2, 1, 2, '2026-10-02T00:00:00Z'),
    episode(3, 1, 3),
    episode(4, 1, 4),
  ]);
  const done = series(11, [episode(5, 1, 1, '2026-09-20T00:00:00Z')], { ended: true });
  const notStarted = series(12, [episode(6, 1, 1)]);
  const abandoned = series(13, [episode(7, 1, 1, '2026-10-03T00:00:00Z'), episode(8, 1, 2)], {
    status: 'abandoned',
  });
  const all = [inProgress, done, notStarted, abandoned];

  it('En cours : dernier épisode vu et progression', () => {
    expect(mySeriesGrid(all, 'in_progress', NOW)).toEqual([
      expect.objectContaining({ tmdbId: 10, progress: { code: 'S01 E02', pct: 50 } }),
    ]);
  });

  it('Terminées et À voir, sans progression ; les abandonnées n’apparaissent nulle part', () => {
    expect(mySeriesGrid(all, 'finished', NOW).map((s) => s.tmdbId)).toEqual([11]);
    expect(mySeriesGrid(all, 'towatch', NOW).map((s) => s.tmdbId)).toEqual([12]);
    expect(mySeriesGrid(all, 'finished', NOW)[0]?.progress).toBeUndefined();
  });
});
