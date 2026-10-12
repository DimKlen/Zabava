export type TmdbImageSize = 'w92' | 'w185' | 'w300' | 'w342' | 'w780';

/** URL d'une image TMDB, ou undefined si le chemin manque. */
export function tmdbImage(path: string | undefined, size: TmdbImageSize): string | undefined {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;
}
