import { router } from 'expo-router';

/** Ouvre la fiche d'une série sur l'onglet Épisodes, à la saison donnée. */
export function openSeries(series: { type: 'tv' | 'anime'; tmdbId: number }, season?: number) {
  router.push({
    pathname: '/title/[type]/[id]',
    params: {
      type: series.type,
      id: String(series.tmdbId),
      ...(season !== undefined ? { season: String(season) } : {}),
    },
  });
}
