import { setEpisodesWatched, type ListTitle } from '@/api/libraryActions';
import { previousDialogTitle, previousUnwatched, type SeriesEpisode } from '@/domain/series';
import { hapticLight } from '@/lib/haptics';
import { openDialog } from '@/store/ui';

/**
 * Coche d'un épisode de la fiche ou de la fiche épisode (docs/01 §4) : décoche s'il est
 * vu ; sinon propose de marquer aussi les épisodes diffusés précédents non vus.
 */
export function checkEpisode(
  series: ListTitle,
  allEpisodes: readonly SeriesEpisode[],
  episode: SeriesEpisode,
): void {
  if (episode.watchedAt) {
    setEpisodesWatched(series, [episode], false);
    return;
  }
  const previous = previousUnwatched(allEpisodes, episode, new Date());
  if (previous.length === 0) {
    setEpisodesWatched(series, [episode], true);
    return;
  }
  openDialog({
    title: previousDialogTitle(previous.length),
    actions: [
      {
        label: 'Seulement celui-ci',
        variant: 'secondary',
        onPress: () => setEpisodesWatched(series, [episode], true),
      },
      {
        label: 'Oui',
        variant: 'primary',
        onPress: () => {
          hapticLight();
          setEpisodesWatched(series, [...previous, episode], true);
        },
      },
    ],
  });
}
