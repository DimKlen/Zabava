import { ScrollView, StyleSheet, View } from 'react-native';

import { removeFromList } from '@/api/libraryActions';
import { useProfile } from '@/api/profile';
import { Button } from '@/components/Button';
import { Poster } from '@/components/Poster';
import { posterBadge } from '@/domain/badge';
import type { SeriesEntry } from '@/domain/seriesList';

import { openSeries } from './openSeries';

const POSTER_WIDTH = 112;

/** « Pas encore commencées » : affiches 112 avec « Commencer » (fiche, saison 1). */
export function NotStartedCarousel({ entries }: { entries: SeriesEntry[] }) {
  const myProviderIds = useProfile().data?.providerIds ?? [];
  const now = new Date();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {entries.map(({ series }) => (
        <View key={series.id} style={styles.item}>
          <Poster
            title={series}
            badge={posterBadge(series, myProviderIds, now)}
            showAdd
            inList
            onPress={() => openSeries(series)}
            onToggle={() => removeFromList(series)}
            style={styles.poster}
          />
          <Button
            variant="secondary"
            height={34}
            fontSize={13}
            label="Commencer"
            onPress={() => openSeries(series, 1)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  item: {
    width: POSTER_WIDTH,
    gap: 6,
  },
  poster: {
    width: POSTER_WIDTH,
  },
});
