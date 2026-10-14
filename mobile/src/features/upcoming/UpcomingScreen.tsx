import { useScrollToTop } from 'expo-router';
import { CalendarBlankIcon, CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { useRef, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpcoming, type UpcomingData, type UpcomingFilter } from '@/api/upcoming';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonBox } from '@/components/Skeleton';
import {
  groupUpcoming,
  jumpTarget,
  noDateLine,
  weekDays,
  type UpcomingGroup,
  type WeekDay,
} from '@/domain/upcoming';
import { openDiscover } from '@/lib/discover';
import { showToast, useUiStore } from '@/store/ui';
import { colors, radii, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { UpcomingRow } from './UpcomingRow';
import { WeekStrip } from './WeekStrip';

const FILTERS: readonly { key: UpcomingFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
];

/** Le groupe touché s'arrête sous la bande collante. */
const JUMP_OFFSET = 72;
const SKELETONS = 4;

/** À venir (specs/docs/09 §9.1) : bande de la semaine, groupes par jour, Sans date. */
export function UpcomingScreen() {
  const insets = useSafeAreaInsets();
  const filter = useUiStore((s) => s.upcomingFilter);
  const setFilter = useUiStore((s) => s.setUpcomingFilter);
  const query = useUpcoming(filter);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  // Position de chaque groupe dans le défilement (saut au jour) : lue et écrite hors rendu.
  const [offsets] = useState(() => new Map<string, number>());

  const now = new Date();
  const groups = query.data ? groupUpcoming(query.data.events, now) : [];
  const days = weekDays(groups, now);

  // Gestionnaire onLayout : appelé après le rendu, jamais pendant.
  function recordOffset(key: string, y: number) {
    offsets.set(key, y);
  }

  const jump = (day: WeekDay) => {
    const target = jumpTarget(groups, day.date);
    const y = target ? offsets.get(target.key) : undefined;
    if (!target || y === undefined) {
      showToast('Rien de prévu à partir de ce jour');
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - JUMP_OFFSET), animated: true });
  };

  // Enfants directs du ScrollView : la bande (index 2) reste collée en haut.
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
    <WeekStrip key="week" days={days} onSelect={jump} />,
  ];

  if (query.data) {
    children.push(...content(query.data, groups, recordOffset));
  } else if (query.isError) {
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
      <ScrollView ref={scrollRef} stickyHeaderIndices={[2]} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    </View>
  );
}

function content(
  data: UpcomingData,
  groups: UpcomingGroup[],
  onGroupLayout: (key: string, y: number) => void,
): ReactElement[] {
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
    <View
      key={group.key}
      onLayout={(e) => onGroupLayout(group.key, e.nativeEvent.layout.y)}
      style={styles.group}
    >
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

/** « Sans date » : séries en production sans épisode daté, repliée par défaut. */
function NoDateSection({ data }: { data: UpcomingData }) {
  const open = useUiStore((s) => s.noDateOpen);
  const toggle = useUiStore((s) => s.toggleNoDate);
  const Caret = open ? CaretUpIcon : CaretDownIcon;
  return (
    <View style={styles.noDate}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={styles.noDateHeader}
      >
        <Text style={styles.noDateTitle}>Sans date</Text>
        <Caret size={16} color={colors.neutral500} />
      </Pressable>
      {open ? (
        <View style={styles.items}>
          {data.noDate.map((item) => (
            <UpcomingRow
              key={item.title.id}
              title={item.title}
              line={noDateLine(item.nextSeason)}
            />
          ))}
        </View>
      ) : null}
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
  noDateHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noDateTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
});
