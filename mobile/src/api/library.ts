import type { MediaType, UserTitle } from '@/domain/types';

import { api } from './http';

/** Valeurs d'origine renvoyées par « Annuler » après un retrait. */
export type AddTitleExtras = {
  addedAt?: string;
  watchedAt?: string;
  notificationsEnabled?: boolean;
};

/** Ajoute un titre à la liste (`POST /me/titles`). */
export async function addTitle(
  tmdbId: number,
  type: MediaType,
  status: UserTitle['status'],
  extras: AddTitleExtras = {},
) {
  await api('/me/titles', { method: 'POST', body: { tmdbId, type, status, ...extras } });
}

/** Champs modifiables d'un titre de la liste. `watchedAt` : moment du tap (file hors ligne). */
export type TitlePatch = {
  status?: UserTitle['status'];
  watchedAt?: string;
  notificationsEnabled?: boolean;
};

/** Change le statut ou les alertes d'un titre de la liste (`PATCH /me/titles/{id}`). */
export async function patchTitle(titleId: string, patch: TitlePatch) {
  await api(`/me/titles/${encodeURIComponent(titleId)}`, { method: 'PATCH', body: patch });
}

/** Retire un titre de la liste (`DELETE /me/titles/{type}-{tmdbId}`), épisodes vus compris. */
export async function removeTitle(titleId: string) {
  await api(`/me/titles/${encodeURIComponent(titleId)}`, { method: 'DELETE' });
}

/**
 * Coche des épisodes (`POST /me/episodes/watched`, idempotent). `watchedAt` : date
 * d'origine renvoyée par « Annuler » ; absente, le serveur prend maintenant.
 */
export async function markEpisodes(episodeIds: number[], watchedAt?: string) {
  await api('/me/episodes/watched', { method: 'POST', body: { episodeIds, watchedAt } });
}

/** Décoche des épisodes (`DELETE /me/episodes/watched`). */
export async function unmarkEpisodes(episodeIds: number[]) {
  await api('/me/episodes/watched', { method: 'DELETE', body: { episodeIds } });
}
