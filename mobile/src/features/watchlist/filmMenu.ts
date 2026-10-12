import { EyeIcon, EyeSlashIcon, TrashIcon } from 'phosphor-react-native';

import { removeFromList, setMovieWatched } from '@/api/libraryActions';
import type { LibraryMovie } from '@/domain/watchlist';
import { openActionSheet } from '@/store/ui';

/** Appui long sur un film de Ma liste : vu / non vu, retirer (specs/docs/06). */
export function openFilmMenu(film: LibraryMovie): void {
  const title = { ...film, type: 'movie' as const };
  const watched = film.userTitle.status === 'watched';
  openActionSheet({
    title: film.title,
    options: [
      {
        label: watched ? 'Marquer comme non vu' : 'Marquer comme vu',
        icon: watched ? EyeSlashIcon : EyeIcon,
        onPress: () => setMovieWatched(title, !watched),
      },
      { label: 'Retirer de ma liste', icon: TrashIcon, onPress: () => removeFromList(title) },
    ],
  });
}
