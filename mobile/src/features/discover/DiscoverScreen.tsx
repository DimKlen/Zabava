import { useNetInfo } from '@react-native-community/netinfo';
import { CloudSlashIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { useT } from '@/i18n';
import { openSearch } from '@/lib/discover';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { DiscoverTab } from './DiscoverTab';

/** Découvrir (specs/docs/08 §8.3) : carrousels par type et grille Par genre. */
export function DiscoverScreen() {
  const { t } = useT();
  const tabs = [
    { key: 'movie', label: t('discover.tabs.movie') },
    { key: 'tv', label: t('discover.tabs.tv') },
    { key: 'anime', label: t('discover.tabs.anime') },
  ] as const;
  const insets = useSafeAreaInsets();
  const tab = useUiStore((s) => s.discoverTab);
  const setTab = useUiStore((s) => s.setDiscoverTab);
  const offline = useNetInfo().isConnected === false;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <ScreenHeader title={t('discover.title')} onSearch={openSearch} />
      <UnderlineTabs tabs={tabs} value={tab} onChange={setTab} />
      {offline ? (
        <EmptyState
          icon={CloudSlashIcon}
          title={t('discover.offline.title')}
          text={t('discover.offline.text')}
        />
      ) : (
        <DiscoverTab key={tab} type={tab} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
