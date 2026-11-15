import { onlineManager } from '@tanstack/react-query';

import { queryClient, shouldPersistQuery } from '../queryClient';

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
