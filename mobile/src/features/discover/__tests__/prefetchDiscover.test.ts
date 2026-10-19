import { Image } from 'expo-image';

import { api } from '@/api/http';
import { queryClient } from '@/api/queryClient';

import { PREFETCHED_POSTERS, prefetchDiscover } from '../prefetchDiscover';

jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('expo-image', () => ({ Image: { prefetch: jest.fn(() => Promise.resolve(true)) } }));

const mockApi = api as jest.MockedFunction<typeof api>;

const lite = (id: number) => ({
  id: `movie-${id}`,
  tmdbId: id,
  type: 'movie',
  title: `Film ${id}`,
  posterPath: `/p${id}.jpg`,
});

// Cache global de l'app (minuteurs de 7 jours) : vidé après chaque test, sinon Jest ne
// se termine pas quand les tests tournent dans un seul processus (CI).
afterEach(() => queryClient.clear());

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.mockResolvedValue({ results: [1, 2, 3, 4, 5, 6].map(lite), total: 6, page: 1 });
});

it('charge les carrousels des trois onglets, puis leurs premières affiches', async () => {
  await prefetchDiscover();

  const lists = mockApi.mock.calls.map(([, options]) => options?.query);
  expect(lists).toContainEqual({ list: 'trending', type: 'movie' });
  expect(lists).toContainEqual({ list: 'new_seasons', type: 'tv' });
  expect(lists).toContainEqual({ list: 'season_anime', type: 'anime' });
  expect(queryClient.getQueryData(['discover', { list: 'trending', type: 'movie' }])).toHaveLength(
    6,
  );

  // Mêmes affiches partout ici : dédoublonnées, et seulement les premières de chaque carrousel.
  expect(Image.prefetch).toHaveBeenCalledWith(
    [1, 2, 3, 4]
      .slice(0, PREFETCHED_POSTERS)
      .map((id) => `https://image.tmdb.org/t/p/w342/p${id}.jpg`),
    'memory-disk',
  );
});

it('carrousels encore frais en cache : aucun nouvel appel', async () => {
  await prefetchDiscover();
  const calls = mockApi.mock.calls.length;
  await prefetchDiscover();
  expect(mockApi.mock.calls.length).toBe(calls);
});

it('un carrousel en échec n’empêche pas les autres', async () => {
  mockApi.mockRejectedValueOnce(new Error('réseau'));
  await expect(prefetchDiscover()).resolves.toBeUndefined();
  expect(Image.prefetch).toHaveBeenCalled();
});
