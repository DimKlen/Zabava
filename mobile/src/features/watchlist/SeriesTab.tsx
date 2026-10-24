import { useScrollToTop } from 'expo-router';
import { TelevisionSimpleIcon } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';

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
  type SeriesEntry,
  type SeriesFilter,
  type SeriesGroup,
} from '@/domain/seriesList';
import { filterByName } from '@/domain/watchlist';
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

/** Une section de la liste : ses cartes ou lignes, ou le carrousel entier (un seul élément). */
type Section = { group: SeriesGroup; data: SeriesEntry[] | [SeriesGroup] };

/**
 * Ma liste › Séries ou Animés (specs/docs/06) : six sections repliables, en liste virtualisée (une
 * longue liste de séries ne monte que les cartes proches de l'écran, avec leur geste de swipe).
 */
export function SeriesTab({ type }: { type: 'tv' | 'anime' }) {
  const scrollRef = useRef<SectionList<SeriesEntry | SeriesGroup, Section>>(null);
  useScrollToTop(scrollRef);
  const watchlist = useSeriesWatchlist(type);
  const spoilerProtection = useProfile().data?.spoilerProtection ?? false;
  const delayDone = useMinimumDelay(MIN_SKELETON_MS);
  const collapsed = useUiStore((s) => s.collapsedSections);
  const toggleSection = useUiStore((s) => s.toggleSection);
  const [filter, setFilter] = useState<SeriesFilter>('all');
  const query = useUiStore((s) => s.watchlistQuery) ?? '';
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
  const named = filterByName(watchlist.data, query);
  const groups = groupSeries(filterSeries(named, filter, myProviderIds, now), now);
  const hasCards = groups.some((group) => group.key === 'watch');

  // Section repliée : son en-tête seul. Carrousel « Pas encore commencées » : un seul élément.
  const sections: Section[] = groups.map((group) => ({
    group,
    data: collapsed[group.key] ? [] : group.kind === 'carousel' ? [group] : group.entries,
  }));

  return (
    <SectionList<SeriesEntry | SeriesGroup, Section>
      ref={scrollRef}
      sections={sections}
      keyExtractor={(item) => ('series' in item ? item.series.id : `carousel-${item.key}`)}
      stickySectionHeadersEnabled={false}
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
      ListHeaderComponent={
        <>
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
        </>
      }
      renderSectionHeader={({ section: { group } }) => (
        <View style={styles.section}>
          <SectionHeader
            title={group.title}
            open={!collapsed[group.key]}
            onToggle={() => toggleSection(group.key)}
          />
        </View>
      )}
      renderItem={({ item, index, section: { group } }) => (
        <SectionItem
          item={item}
          group={group}
          first={index === 0}
          spoilerProtection={spoilerProtection}
        />
      )}
      ListEmptyComponent={
        query.trim() ? (
          <EmptyState icon={TelevisionSimpleIcon} title="Aucun titre ne correspond" />
        ) : (
          <EmptyState
            icon={TelevisionSimpleIcon}
            title={EMPTY[type].title}
            action={{ label: EMPTY[type].cta, onPress: () => openDiscover(type) }}
          />
        )
      }
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
    />
  );
}

/** Élément d'une section : carte, ligne compacte, ou le carrousel ; 4 sous l'en-tête, puis l'écart. */
function SectionItem({
  item,
  group,
  first,
  spoilerProtection,
}: {
  item: SeriesEntry | SeriesGroup;
  group: SeriesGroup;
  first: boolean;
  spoilerProtection: boolean;
}) {
  if (!('series' in item)) return <NotStartedCarousel entries={item.entries} />;
  const cards = group.kind === 'cards';
  const gap = first ? 4 : cards ? 8 : 4;
  return (
    <View style={[styles.item, { paddingTop: gap }]}>
      {cards ? (
        <SeriesCard entry={item} spoilerProtection={spoilerProtection} />
      ) : (
        <CompactSeriesRow entry={item} section={group.key} />
      )}
    </View>
  );
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
  item: {
    paddingHorizontal: 16,
  },
});
