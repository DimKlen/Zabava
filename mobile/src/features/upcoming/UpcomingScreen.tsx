import { useScrollToTop } from 'expo-router';
import { CalendarBlankIcon } from 'phosphor-react-native';
import { useRef } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpcoming, type NoDateTitle, type UpcomingFilter } from '@/api/upcoming';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { groupUpcoming, noDateLine, type UpcomingItem } from '@/domain/upcoming';
import { openDiscover } from '@/lib/discover';
import { useUiStore } from '@/store/ui';
import { colors, radii, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { UpcomingRow } from './UpcomingRow';

const FILTERS: readonly { key: UpcomingFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
];

const SKELETONS = 4;

/** Un jour (ses événements), ou « Sans date » (ses séries sans épisode daté). */
type Section =
  | { kind: 'day'; key: string; label: string; data: UpcomingItem[] }
  | { kind: 'noDate'; key: string; data: NoDateTitle[] };

/**
 * À venir (specs/docs/09 §9.1) : groupes par jour, puis Sans date (toujours visible, grisée). Liste
 * virtualisée : seuls les jours proches de l'écran sont montés.
 */
export function UpcomingScreen() {
  const insets = useSafeAreaInsets();
  const filter = useUiStore((s) => s.upcomingFilter);
  const setFilter = useUiStore((s) => s.setUpcomingFilter);
  const query = useUpcoming(filter);
  const listRef = useRef<SectionList<UpcomingItem | NoDateTitle, Section>>(null);
  useScrollToTop(listRef);

  const now = new Date();
  const sections: Section[] = [];
  if (query.data) {
    for (const group of groupUpcoming(query.data.events, now)) {
      sections.push({ kind: 'day', key: group.key, label: group.label, data: group.items });
    }
    if (query.data.noDate.length > 0) {
      sections.push({ kind: 'noDate', key: 'no-date', data: query.data.noDate });
    }
  }

  let state = null;
  if (!query.data) {
    state = showsLoadError(query) ? (
      <LoadError onRetry={() => void query.refetch()} />
    ) : (
      <View style={styles.loading}>
        {Array.from({ length: SKELETONS }, (_, i) => (
          <SkeletonBox key={i} height={76} radius={radii.rLg} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <SectionList<UpcomingItem | NoDateTitle, Section>
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => ('key' in item ? item.key : item.title.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <ScreenHeader title="À venir" />
            <View style={styles.chips}>
              {FILTERS.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  active={filter === option.key}
                  onPress={() => setFilter(option.key)}
                  paddingHorizontal={14}
                />
              ))}
            </View>
            {state}
          </>
        }
        ListEmptyComponent={
          query.data ? (
            <EmptyState
              icon={CalendarBlankIcon}
              title="Rien de prévu"
              paddingTop={48}
              action={{ label: 'Suivre des séries', onPress: () => openDiscover('tv') }}
            />
          ) : null
        }
        renderSectionHeader={({ section }) =>
          section.kind === 'day' ? (
            <Text accessibilityRole="header" style={[styles.group, styles.groupLabel]}>
              {section.label}
            </Text>
          ) : (
            <Text accessibilityRole="header" style={[styles.noDate, styles.noDateTitle]}>
              Sans date
            </Text>
          )
        }
        renderItem={({ item, index }) => (
          <View style={[styles.item, index > 0 && styles.itemGap]}>
            {'key' in item ? (
              <UpcomingRow title={item.event.title} line={item.line} tag={item.tag} />
            ) : (
              <UpcomingRow title={item.title} line={noDateLine(item.nextSeason)} dimmed />
            )}
          </View>
        )}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 24,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    paddingHorizontal: spacing.screenX,
  },
  loading: {
    gap: spacing.upcomingGap,
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
  },
  group: {
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
  },
  groupLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.accent300,
    marginBottom: 6,
  },
  item: {
    paddingHorizontal: spacing.screenX,
  },
  itemGap: {
    paddingTop: spacing.upcomingGap,
  },
  noDate: {
    paddingTop: 16,
    paddingHorizontal: spacing.screenX,
  },
  noDateTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
    marginBottom: 6,
  },
});
