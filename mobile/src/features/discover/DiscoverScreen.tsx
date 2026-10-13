import { useNetInfo } from '@react-native-community/netinfo';
import { CloudSlashIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { openSearch } from '@/lib/discover';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { DiscoverTab } from './DiscoverTab';

const TABS = [
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
] as const;

/** Découvrir (specs/docs/08 §8.3) : carrousels par type et grille Par genre. */
export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const tab = useUiStore((s) => s.discoverTab);
  const setTab = useUiStore((s) => s.setDiscoverTab);
  const offline = useNetInfo().isConnected === false;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <ScreenHeader title="Découvrir" onSearch={openSearch} />
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
      {offline ? (
        <EmptyState
          icon={CloudSlashIcon}
          title="Découvrir est indisponible hors ligne"
          text="Ta liste et À venir restent accessibles depuis le cache."
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
