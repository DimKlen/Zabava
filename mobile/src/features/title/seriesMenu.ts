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
import { t } from '@/i18n';
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
        label: abandoned ? t('title.menu.resume') : t('title.menu.abandon'),
        icon: abandoned ? PlayCircleIcon : PauseCircleIcon,
        onPress: () => setSeriesAbandoned(series, !abandoned),
      },
      {
        label: t('title.menu.unfollow'),
        icon: TrashIcon,
        onPress: () => removeFromList(series, t('title.menu.removed')),
      },
    );
  } else {
    options.push({
      label: t('title.menu.follow'),
      icon: PlusIcon,
      onPress: () => toggleInList(series),
    });
  }
  options.push({
    label: alertsOn ? t('title.alerts.off') : t('title.alerts.on'),
    icon: alertsOn ? BellSlashIcon : BellRingingIcon,
    onPress: () => setTitleAlerts(series, !alertsOn),
  });
  openActionSheet({ title: series.title, options });
}
