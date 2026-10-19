import { useTitle, type TitleDetail } from '@/api/titles';
import { LoadError, showsLoadError } from '@/components/LoadError';
import type { MediaType } from '@/domain/types';

import { MovieScreen } from './MovieScreen';
import { titlePreview } from './openTitle';
import { SeriesScreen } from './SeriesScreen';

type Props = { type: MediaType; tmdbId: number; season?: number; episode?: number };

const isSeries = (detail: TitleDetail): detail is TitleDetail & { type: 'tv' | 'anime' } =>
  detail.type !== 'movie';

/**
 * Fiche titre : film, série ou animé. L'écran est choisi d'après la route, pas d'après la
 * fiche reçue : il reste le même du tap à l'arrivée des données (pas de rechargement visible).
 */
export function TitleScreen({ type, tmdbId, season, episode }: Props) {
  const title = useTitle(type, tmdbId);
  const detail = title.data;
  const id = `${type}-${tmdbId}`;
  const preview = titlePreview(id);
  const failure =
    !detail && showsLoadError(title) ? (
      <LoadError onRetry={() => void title.refetch()} />
    ) : undefined;

  if (type === 'movie') {
    return <MovieScreen id={id} preview={preview} movie={detail ?? undefined} failure={failure} />;
  }
  return (
    <SeriesScreen
      id={id}
      type={type}
      tmdbId={tmdbId}
      preview={preview}
      series={detail && isSeries(detail) ? detail : undefined}
      failure={failure}
      initialSeason={season}
      initialEpisode={episode}
    />
  );
}
