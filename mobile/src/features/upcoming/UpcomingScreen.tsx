import { useScrollToTop } from 'expo-router';
import { CalendarBlankIcon } from 'phosphor-react-native';
import { useRef, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpcoming, type UpcomingData, type UpcomingFilter } from '@/api/upcoming';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { groupUpcoming, noDateLine, type UpcomingGroup } from '@/domain/upcoming';
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

/** À venir (specs/docs/09 §9.1) : groupes par jour, puis Sans date (toujours visible, grisée). */
export function UpcomingScreen() {
  const insets = useSafeAreaInsets();
  const filter = useUiStore((s) => s.upcomingFilter);
  const setFilter = useUiStore((s) => s.setUpcomingFilter);
  const query = useUpcoming(filter);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const now = new Date();
  const groups = query.data ? groupUpcoming(query.data.events, now) : [];

  const children: ReactElement[] = [
    <ScreenHeader key="header" title="À venir" />,
    <View key="chips" style={styles.chips}>
      {FILTERS.map((option) => (
        <Chip
          key={option.key}
          label={option.label}
          active={filter === option.key}
          onPress={() => setFilter(option.key)}
          paddingHorizontal={14}
        />
      ))}
    </View>,
  ];

  if (query.data) {
    children.push(...content(query.data, groups));
  } else if (showsLoadError(query)) {
    children.push(<LoadError key="error" onRetry={() => void query.refetch()} />);
  } else {
    children.push(
      <View key="loading" style={styles.loading}>
        {Array.from({ length: SKELETONS }, (_, i) => (
          <SkeletonBox key={i} height={76} radius={radii.rLg} />
        ))}
      </View>,
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    </View>
  );
}

function content(data: UpcomingData, groups: UpcomingGroup[]): ReactElement[] {
  if (groups.length === 0 && data.noDate.length === 0) {
    return [
      <EmptyState
        key="empty"
        icon={CalendarBlankIcon}
        title="Rien de prévu"
        paddingTop={48}
        action={{ label: 'Suivre des séries', onPress: () => openDiscover('tv') }}
      />,
    ];
  }
  const blocks: ReactElement[] = groups.map((group) => (
    <View key={group.key} testID={`group-${group.key}`} style={styles.group}>
      <Text accessibilityRole="header" style={styles.groupLabel}>
        {group.label}
      </Text>
      <View style={styles.items}>
        {group.items.map((item) => (
          <UpcomingRow key={item.key} title={item.event.title} line={item.line} tag={item.tag} />
        ))}
      </View>
    </View>
  ));
  if (data.noDate.length > 0) blocks.push(<NoDateSection key="no-date" data={data} />);
  return blocks;
}

/** « Sans date » : séries en production sans épisode daté, toujours dépliée et grisée. */
function NoDateSection({ data }: { data: UpcomingData }) {
  return (
    <View style={styles.noDate}>
      <Text accessibilityRole="header" style={styles.noDateTitle}>
        Sans date
      </Text>
      <View style={styles.items}>
        {data.noDate.map((item) => (
          <UpcomingRow
            key={item.title.id}
            title={item.title}
            line={noDateLine(item.nextSeason)}
            dimmed
          />
        ))}
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
  items: {
    gap: spacing.upcomingGap,
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
