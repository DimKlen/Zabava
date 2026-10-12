import {
  BellRingingIcon,
  BellSlashIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  TrashIcon,
} from 'phosphor-react-native';

import {
  removeFromList,
  setSeriesAbandoned,
  setTitleAlerts,
  toggleInList,
  type ListTitle,
} from '@/api/libraryActions';
import type { UserTitle } from '@/domain/types';
import { openActionSheet, type ActionSheetOption } from '@/store/ui';

/** ActionSheet série (« … » ou bouton Suivie / Abandonnée) — specs/docs/07 §7.1. */
export function openSeriesMenu(
  series: ListTitle,
  userTitle: UserTitle | undefined,
  alertsOn: boolean,
): void {
  const options: ActionSheetOption[] = [];
  if (userTitle) {
    const abandoned = userTitle.status === 'abandoned';
    options.push(
      {
        label: abandoned ? 'Reprendre le suivi' : 'Abandonner',
        icon: abandoned ? PlayCircleIcon : PauseCircleIcon,
        onPress: () => setSeriesAbandoned(series, !abandoned),
      },
      {
        label: 'Ne plus suivre',
        icon: TrashIcon,
        onPress: () => removeFromList(series, 'Série retirée'),
      },
    );
  } else {
    options.push({ label: 'Suivre', icon: PlusIcon, onPress: () => toggleInList(series) });
  }
  options.push({
    label: alertsOn ? 'Couper les alertes' : 'Activer les alertes',
    icon: alertsOn ? BellSlashIcon : BellRingingIcon,
    onPress: () => setTitleAlerts(series, !alertsOn),
  });
  openActionSheet({ title: series.title, options });
}
