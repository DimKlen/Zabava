import { onlineManager } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

import { queryClient, shouldPersistQuery, withFirstFeedPage } from '../queryClient';

afterEach(() => {
  onlineManager.setOnline(true);
  queryClient.clear();
});

it('hors ligne, une requête sans cache échoue au lieu de rester en pause', async () => {
  onlineManager.setOnline(false);
  const fetching = queryClient.fetchQuery({
    queryKey: ['title', 'movie', 1],
    queryFn: () => Promise.reject(new TypeError('Network request failed')),
    retry: false,
  });
  await expect(fetching).rejects.toThrow('Network request failed');
  expect(queryClient.getQueryState(['title', 'movie', 1])?.status).toBe('error');
});

describe('cache sauvegardé', () => {
  async function saved(queryKey: unknown[]) {
    await queryClient.fetchQuery({ queryKey, queryFn: () => Promise.resolve([]) });
    const query = queryClient.getQueryCache().find({ queryKey, exact: true });
    return query ? shouldPersistQuery(query) : false;
  }

  it('garde les carrousels de Découvrir', async () => {
    expect(await saved(['discover', { list: 'trending', type: 'movie' }])).toBe(true);
  });

  it('pas les listes infinies (genre, recherche avancée) ni la recherche', async () => {
    expect(await saved(['discover', { type: 'movie', genres: 'animation', sort: 'recent' }])).toBe(
      false,
    );
    expect(await saved(['search', 'dune'])).toBe(false);
  });
});

describe('fil d’activité sauvegardé', () => {
  it('gardé hors ligne', async () => {
    await queryClient.fetchQuery({ queryKey: ['feed'], queryFn: () => Promise.resolve([]) });
    const query = queryClient.getQueryCache().find({ queryKey: ['feed'], exact: true });
    expect(query && shouldPersistQuery(query)).toBe(true);
  });

  it('seulement sa 1re page ; les autres requêtes intactes', () => {
    const query = (queryKey: unknown[], data: unknown) => ({
      queryKey,
      queryHash: JSON.stringify(queryKey),
      state: { data, status: 'success' },
    });
    const watchlist = query(['watchlist', 'movie'], [{ id: 1 }]);
    const client = {
      timestamp: 0,
      buster: '',
      clientState: {
        mutations: [],
        queries: [
          query(['feed'], { pages: [{ items: [1] }, { items: [2] }], pageParams: [null, 'c1'] }),
          watchlist,
        ],
      },
    } as unknown as PersistedClient;
    const [feed, other] = withFirstFeedPage(client).clientState.queries;
    expect(feed?.state.data).toEqual({ pages: [{ items: [1] }], pageParams: [null] });
    expect(other).toBe(watchlist);
  });
});
