import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { FilmsTab } from './FilmsTab';
import { SeriesTab } from './SeriesTab';

const TABS = [
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
] as const;

/**
 * Ma liste (specs/docs/06) : Films, Séries, Animés. La loupe filtre la liste par nom (pas de
 * recherche dans tout le catalogue : c'est le rôle de Découvrir).
 */
export function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const tab = useUiStore((s) => s.watchlistTab);
  const setTab = useUiStore((s) => s.setWatchlistTab);
  const query = useUiStore((s) => s.watchlistQuery);
  const setQuery = useUiStore((s) => s.setWatchlistQuery);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      {query === null ? (
        <ScreenHeader title="Ma liste" onSearch={() => setQuery('')} />
      ) : (
        <View style={styles.search}>
          <TextField
            height={40}
            icon={MagnifyingGlassIcon}
            value={query}
            onChangeText={setQuery}
            placeholder="Filtrer ma liste"
            accessibilityLabel="Filtrer ma liste"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchField}
          />
          <Button variant="ghost" height={40} label="Annuler" onPress={() => setQuery(null)} />
        </View>
      )}
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
    paddingLeft: 16,
    paddingRight: 8,
  },
  searchField: {
    flex: 1,
  },
});
