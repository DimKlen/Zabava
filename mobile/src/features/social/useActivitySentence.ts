import { useMemo } from 'react';

import { useProfile } from '@/api/profile';
import { useSeriesWatchlist } from '@/api/watchlist';
import { activitySentence, watchedEpisodeIds, type FeedActivity } from '@/domain/social/feed';

/**
 * Phrase d'une activité avec **mon** anti-spoiler : un épisode que je n'ai pas vu (d'après mes
 * séries et animés) perd son titre et sa vignette.
 */
export function useActivitySentence() {
  const spoilerProtection = useProfile().data?.spoilerProtection ?? false;
  const tv = useSeriesWatchlist('tv').data;
  const anime = useSeriesWatchlist('anime').data;
  const watched = useMemo(() => watchedEpisodeIds([...(tv ?? []), ...(anime ?? [])]), [tv, anime]);
  return (activity: FeedActivity) => activitySentence(activity, watched, spoilerProtection);
}
