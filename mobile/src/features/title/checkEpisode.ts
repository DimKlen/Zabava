import { setEpisodesWatched, type ListTitle } from '@/api/libraryActions';
import { previousDialogTitle, previousUnwatched, type SeriesEpisode } from '@/domain/series';
import { t } from '@/i18n';
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
        label: t('title.dialog.onlyThis'),
        variant: 'secondary',
        onPress: () => setEpisodesWatched(series, [episode], true),
      },
      {
        label: t('title.dialog.yes'),
        variant: 'primary',
        // Le retour haptique est déjà parti au tap sur la coche.
        onPress: () => setEpisodesWatched(series, [...previous, episode], true),
      },
    ],
  });
}
