import type { MediaType, UserTitle } from '@/domain/types';

import { api } from './http';

/** Ajoute un titre à la liste (`POST /me/titles`). */
export async function addTitle(tmdbId: number, type: MediaType, status: UserTitle['status']) {
  await api('/me/titles', { method: 'POST', body: { tmdbId, type, status } });
}

/** Change le statut ou les alertes d'un titre de la liste (`PATCH /me/titles/{id}`). */
export async function patchTitle(
  titleId: string,
  patch: { status?: UserTitle['status']; notificationsEnabled?: boolean },
) {
  await api(`/me/titles/${encodeURIComponent(titleId)}`, { method: 'PATCH', body: patch });
}

/** Retire un titre de la liste (`DELETE /me/titles/{type}-{tmdbId}`). */
export async function removeTitle(titleId: string) {
  await api(`/me/titles/${encodeURIComponent(titleId)}`, { method: 'DELETE' });
}
