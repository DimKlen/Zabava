import { CheckIcon, PauseCircleIcon, PlusIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { toggleInList, type ListTitle } from '@/api/libraryActions';
import { Button } from '@/components/Button';
import type { UserTitle } from '@/domain/types';

type Props = { series: ListTitle; userTitle?: UserTitle; onOpenMenu: () => void };

/** « Suivre » → suit ; « Suivie » / « Abandonnée » → ActionSheet série. */
export function SeriesActions({ series, userTitle, onOpenMenu }: Props) {
  const abandoned = userTitle?.status === 'abandoned';
  const icon = !userTitle ? PlusIcon : abandoned ? PauseCircleIcon : CheckIcon;
  const label = !userTitle ? 'Suivre' : abandoned ? 'Abandonnée' : 'Suivie';
  return (
    <View style={styles.row}>
      <Button
        variant="primary"
        height={46}
        icon={icon}
        label={label}
        onPress={userTitle ? onOpenMenu : () => toggleInList(series)}
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
