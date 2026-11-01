import { useMemo } from 'react';

import { useProfile } from '@/api/profile';
import { useSeriesWatchlist } from '@/api/watchlist';
import { activitySentence, watchedEpisodeIds, type FeedActivity } from '@/domain/social/feed';
import { useT } from '@/i18n';

/**
 * Phrase d'une activité avec **mon** anti-spoiler : un épisode que je n'ai pas vu (d'après mes
 * séries et animés) perd son titre et sa vignette.
 */
export function useActivitySentence() {
  // Abonnement au choix de langue : la phrase est retraduite quand il change.
  useT();
  const spoilerProtection = useProfile().data?.spoilerProtection ?? false;
  const tv = useSeriesWatchlist('tv').data;
  const anime = useSeriesWatchlist('anime').data;
  const watched = useMemo(() => watchedEpisodeIds([...(tv ?? []), ...(anime ?? [])]), [tv, anime]);
  return (activity: FeedActivity) => activitySentence(activity, watched, spoilerProtection);
}
