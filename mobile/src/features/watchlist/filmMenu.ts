import { EyeIcon, EyeSlashIcon, TrashIcon } from 'phosphor-react-native';

import { removeFromList, setMovieWatched } from '@/api/libraryActions';
import type { LibraryMovie } from '@/domain/watchlist';
import { t } from '@/i18n';
import { openActionSheet, openRatingSheet } from '@/store/ui';

/** Appui long sur un film de Ma liste : vu / non vu, retirer (specs/docs/06). */
export function openFilmMenu(film: LibraryMovie): void {
  const title = { ...film, type: 'movie' as const };
  const watched = film.userTitle.status === 'watched';
  openActionSheet({
    title: film.title,
    options: [
      {
        label: watched
          ? t('watchlist.films.menu.markUnwatched')
          : t('watchlist.films.menu.markWatched'),
        icon: watched ? EyeSlashIcon : EyeIcon,
        onPress: () =>
          watched
            ? setMovieWatched(title, false)
            : openRatingSheet({
                title,
                mode: 'watch',
                rating: film.userTitle.rating,
                comment: film.userTitle.comment,
              }),
      },
      {
        label: t('watchlist.films.menu.remove'),
        icon: TrashIcon,
        onPress: () => removeFromList(title),
      },
    ],
  });
}
