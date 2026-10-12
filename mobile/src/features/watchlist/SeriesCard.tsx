import { removeFromList, setEpisodesWatched, setSeriesAbandoned } from '@/api/libraryActions';
import { NextEpisodeCard } from '@/components/NextEpisodeCard';
import { cardEpisodeLabel, remainingLabel, type SeriesEntry } from '@/domain/seriesList';

import { openSeries } from './openSeries';

type Props = { entry: SeriesEntry; spoilerProtection: boolean };

/** Carte « prochain épisode » d'une série de Ma liste (À regarder, Pas regardé depuis un moment). */
export function SeriesCard({ entry: { series, info }, spoilerProtection }: Props) {
  const next = info.next;
  if (!next) return null;
  return (
    <NextEpisodeCard
      id={series.id}
      seriesName={series.title}
      episodeLabel={cardEpisodeLabel(next, spoilerProtection)}
      remainingLabel={remainingLabel(info.remaining)}
      progress={info.progress}
      stillPath={next.stillPath}
      stillKey={`${series.id}${next.season}-${next.number}`}
      spoilerBlur={spoilerProtection}
      animationKey={String(next.id)}
      onPress={() => openSeries(series, next.season)}
      onCheck={() => setEpisodesWatched(series, [next], true)}
      onAbandon={() => setSeriesAbandoned(series, true)}
      onRemove={() => removeFromList(series, 'Retirée de ma liste')}
    />
  );
}
