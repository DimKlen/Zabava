import { CheckIcon, EyeIcon, PlusIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { setMovieWatched, toggleInList, type ListTitle } from '@/api/libraryActions';
import { Button } from '@/components/Button';
import type { UserTitle } from '@/domain/types';

type Props = { movie: ListTitle; userTitle?: UserTitle };

/** « Ajouter à ma liste » ↔ « Dans ma liste » et « Marquer comme vu » ↔ « Vu ». */
export function MovieActions({ movie, userTitle }: Props) {
  const inList = userTitle !== undefined;
  const watched = userTitle?.status === 'watched';

  return (
    <View style={styles.row}>
      <Button
        variant="primary"
        height={46}
        icon={inList ? CheckIcon : PlusIcon}
        label={inList ? 'Dans ma liste' : 'Ajouter à ma liste'}
        onPress={() => toggleInList(movie)}
        style={styles.button}
      />
      <Button
        variant="secondary"
        height={46}
        icon={EyeIcon}
        iconWeight={watched ? 'fill' : 'regular'}
        label={watched ? 'Vu' : 'Marquer comme vu'}
        onPress={() => setMovieWatched(movie, !watched)}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
  },
});
