import { useScrollToTop } from 'expo-router';
import { TelevisionSimpleIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useProfile } from '@/api/profile';
import { useSeriesWatchlist } from '@/api/watchlist';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { SectionHeader } from '@/components/SectionHeader';
import { SkeletonCard } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import {
  SERIES_FILTERS,
  filterSeries,
  groupSeries,
  type SeriesFilter,
  type SeriesGroup,
} from '@/domain/seriesList';
import { openDiscover } from '@/lib/discover';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { CompactSeriesRow } from './CompactSeriesRow';
import { NotStartedCarousel } from './NotStartedCarousel';
import { SeriesCard } from './SeriesCard';
import { useMinimumDelay } from './useMinimumDelay';

const MIN_SKELETON_MS = 700;
const SKELETONS = [0, 1, 2];

const EMPTY = {
  tv: { title: 'Aucune série suivie', cta: 'Découvrir des séries' },
  anime: { title: 'Aucun animé suivi', cta: 'Découvrir des animés' },
} as const;

/** Ma liste › Séries ou Animés (specs/docs/06) : six sections repliables. */
export function SeriesTab({ type }: { type: 'tv' | 'anime' }) {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const watchlist = useSeriesWatchlist(type);
  const spoilerProtection = useProfile().data?.spoilerProtection ?? false;
  const delayDone = useMinimumDelay(MIN_SKELETON_MS);
  const collapsed = useUiStore((s) => s.collapsedSections);
  const toggleSection = useUiStore((s) => s.toggleSection);
  const [filter, setFilter] = useState<SeriesFilter>('all');
  const myProviderIds = useProfile().data?.providerIds ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await watchlist.refetch();
    setRefreshing(false);
  };

  if (!watchlist.data || !delayDone) {
    return showsLoadError(watchlist) ? (
      <LoadError onRetry={() => void watchlist.refetch()} />
    ) : (
      <View style={styles.skeletons} testID="series-skeletons">
        {SKELETONS.map((key) => (
          <SkeletonCard key={key} />
        ))}
      </View>
    );
  }

  const now = new Date();
  const groups = groupSeries(filterSeries(watchlist.data, filter, myProviderIds, now), now);
  const hasCards = groups.some((group) => group.key === 'watch');

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      testID="series-list"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {SERIES_FILTERS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={option.value === filter}
            onPress={() => setFilter(option.value)}
          />
        ))}
      </ScrollView>
      {hasCards ? (
        <Text style={styles.hint}>
          Coche pour avancer · glisse une carte vers la gauche pour plus d&apos;actions
        </Text>
      ) : null}
      {groups.map((group) => {
        const open = !collapsed[group.key];
        return (
          <View key={group.key} style={styles.section}>
            <SectionHeader
              title={group.title}
              count={group.entries.length}
              open={open}
              onToggle={() => toggleSection(group.key)}
            />
            {open ? <SectionContent group={group} spoilerProtection={spoilerProtection} /> : null}
          </View>
        );
      })}
      {groups.length === 0 ? (
        <EmptyState
          icon={TelevisionSimpleIcon}
          title={EMPTY[type].title}
          action={{ label: EMPTY[type].cta, onPress: () => openDiscover(type) }}
        />
      ) : null}
    </ScrollView>
  );
}

function SectionContent({
  group,
  spoilerProtection,
}: {
  group: SeriesGroup;
  spoilerProtection: boolean;
}) {
  switch (group.kind) {
    case 'cards':
      return (
        <View style={styles.cards}>
          {group.entries.map((entry) => (
            <SeriesCard key={entry.series.id} entry={entry} spoilerProtection={spoilerProtection} />
          ))}
        </View>
      );
    case 'carousel':
      return <NotStartedCarousel entries={group.entries} />;
    case 'rows':
      return (
        <View style={styles.rows}>
          {group.entries.map((entry) => (
            <CompactSeriesRow key={entry.series.id} entry={entry} section={group.key} />
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  skeletons: {
    gap: 8,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chips: {
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  hint: {
    ...typography.small,
    paddingTop: 12,
    paddingHorizontal: 16,
    color: colors.neutral500,
  },
  section: {
    marginTop: 14,
  },
  cards: {
    gap: 8,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  rows: {
    gap: 4,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
});
