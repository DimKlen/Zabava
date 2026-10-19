import { openTitle, previewOf, type PosterSize } from '../title/openTitle';

type SeriesToOpen = { type: 'tv' | 'anime'; tmdbId: number; title: string; posterPath?: string };

/** Ouvre la fiche d'une série sur l'onglet Épisodes, à la saison donnée. */
export function openSeries(series: SeriesToOpen, season?: number, posterSize?: PosterSize) {
  openTitle(previewOf(series, posterSize), season);
}
