import type { MediaType, UserTitle } from '@/domain/types';

import { api } from './http';
import { queryClient } from './queryClient';

/** Ajoute un titre à la liste (`POST /me/titles`). */
export async function addTitle(tmdbId: number, type: MediaType, status: UserTitle['status']) {
  await api('/me/titles', { method: 'POST', body: { tmdbId, type, status } });
  void queryClient.invalidateQueries({ queryKey: ['watchlist', type] });
}

/** Retire un titre de la liste (`DELETE /me/titles/{type}-{tmdbId}`). */
export async function removeTitle(titleId: string, type: MediaType) {
  await api(`/me/titles/${encodeURIComponent(titleId)}`, { method: 'DELETE' });
  void queryClient.invalidateQueries({ queryKey: ['watchlist', type] });
}
