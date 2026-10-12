import { onlineManager } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { showToast, useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { FilmsTab } from './FilmsTab';
import { SeriesTab } from './SeriesTab';

const TABS = [
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
] as const;

function openSearch() {
  if (!onlineManager.isOnline()) {
    showToast('Recherche indisponible hors ligne');
    return;
  }
  router.push('/search');
}

/** Ma liste (specs/docs/06) : Films, Séries, Animés. */
export function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const tab = useUiStore((s) => s.watchlistTab);
  const setTab = useUiStore((s) => s.setWatchlistTab);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <ScreenHeader title="Ma liste" onSearch={openSearch} />
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
      <View style={styles.content}>
        {tab === 'movie' ? <FilmsTab /> : <SeriesTab key={tab} type={tab} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
});
