import { onlineManager } from '@tanstack/react-query';

import { queryClient } from '../queryClient';

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
