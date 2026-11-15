import { Image } from 'expo-image';
import { router } from 'expo-router';

import { prefetchTitle } from '@/api/titles';
import type { MediaType } from '@/domain/types';
import { tmdbImage } from '@/lib/tmdb';

/** Taille d'affiche déjà chargée par la liste d'origine (image en cache, affichée tout de suite). */
export type PosterSize = 'w92' | 'w185' | 'w342';

/** Ce que la liste sait déjà d'un titre : montré pendant que la fiche se charge. */
export type TitlePreview = {
  type: MediaType;
  tmdbId: number;
  title: string;
  posterPath?: string;
  year?: number;
  /** Image de fond de la fiche, si la liste la connaît (Découvrir) : affichée sans attendre la fiche. */
  backdropPath?: string;
  posterSize?: PosterSize;
};

/** Aperçu d'un titre de liste ; `posterSize` : taille d'affiche que la liste a affichée. */
export function previewOf(
  title: {
    type: MediaType;
    tmdbId: number;
    title: string;
    posterPath?: string;
    year?: number;
    backdropPath?: string;
  },
  posterSize?: PosterSize,
): TitlePreview {
  const { type, tmdbId, posterPath, year, backdropPath } = title;
  return { type, tmdbId, title: title.title, posterPath, year, backdropPath, posterSize };
}

/** Taille de l'image de fond de la fiche (TitleHeader). */
export const BACKDROP_SIZE = 'w780';

/** Aperçus récents, par identifiant `${type}-${tmdbId}` ; les plus anciens partent. */
const previews = new Map<string, TitlePreview>();
const MAX_PREVIEWS = 50;

function remember(preview: TitlePreview): void {
  const id = `${preview.type}-${preview.tmdbId}`;
  previews.delete(id);
  previews.set(id, preview);
  if (previews.size > MAX_PREVIEWS) {
    const oldest = previews.keys().next().value;
    if (oldest !== undefined) previews.delete(oldest);
  }
}

export function titlePreview(id: string): TitlePreview | undefined {
  return previews.get(id);
}

/**
 * Début de l'appui sur un titre : la fiche part avant le relâchement, et l'image de fond aussi
 * (même taille que l'en-tête de la fiche), pour qu'elle soit déjà là à l'ouverture.
 */
export function pressTitle(preview: TitlePreview): void {
  remember(preview);
  prefetchTitle(preview.type, preview.tmdbId);
  const backdrop = tmdbImage(preview.backdropPath, BACKDROP_SIZE);
  if (backdrop) void Image.prefetch(backdrop, 'memory-disk').catch(() => false);
}

/** Ouvre la fiche ; une série peut s'ouvrir sur une saison (onglet Épisodes). */
export function openTitle(preview: TitlePreview, season?: number): void {
  remember(preview);
  router.push({
    pathname: '/title/[type]/[id]',
    params: {
      type: preview.type,
      id: String(preview.tmdbId),
      ...(season !== undefined ? { season: String(season) } : {}),
    },
  });
}
