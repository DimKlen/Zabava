import { router } from 'expo-router';
import { CaretLeftIcon, UsersThreeIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flatItems, useFeed } from '@/api/social';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonMemberRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { groupByDay, type ActivityDay } from '@/domain/social/feed';
import { goBack } from '@/lib/navigation';
import { colors, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { ActivityItem } from './ActivityItem';
import { useActivitySentence } from './useActivitySentence';

const SKELETONS = 5;

/**
 * Fil d'activité (specs/social/docs/04 §4.11) : groupes par jour, par 30, tirer pour rafraîchir.
 * Hors ligne : le dernier fil en cache, en lecture seule.
 */
export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  const sentenceOf = useActivitySentence();
  const [refreshing, setRefreshing] = useState(false);
  const days = groupByDay(flatItems(feed.data?.pages), new Date());

  const refresh = async () => {
    setRefreshing(true);
    await feed.refetch();
    setRefreshing(false);
  };

  let body;
  if (!feed.data) {
    body = showsLoadError(feed) ? (
      <LoadError onRetry={() => void feed.refetch()} />
    ) : (
      <View style={styles.skeletons}>
        {Array.from({ length: SKELETONS }, (_, i) => (
          <SkeletonMemberRow key={i} />
        ))}
      </View>
    );
  } else {
    body = (
      <FlatList
        data={days}
        keyExtractor={(day) => day.key}
        renderItem={({ item }) => <Day day={item} sentenceOf={sentenceOf} />}
        ListEmptyComponent={
          <EmptyState
            icon={UsersThreeIcon}
            title="Ajoute des amis pour voir ce qu'ils regardent"
            paddingTop={48}
            action={{
              label: 'Ajouter un ami',
              onPress: () => router.push({ pathname: '/search', params: { tab: 'members' } }),
            }}
          />
        }
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <View style={styles.bar}>
        <Button
          variant="icon"
          height={44}
          icon={CaretLeftIcon}
          iconSize={22}
          color={colors.text}
          accessibilityLabel="Retour"
          onPress={goBack}
        />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          Activité de tes amis
        </Text>
      </View>
      {body}
    </View>
  );
}

function Day({
  day,
  sentenceOf,
}: {
  day: ActivityDay;
  sentenceOf: ReturnType<typeof useActivitySentence>;
}) {
  return (
    <View style={styles.day}>
      <Text accessibilityRole="header" style={styles.dayLabel}>
        {day.label}
      </Text>
      {day.items.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} sentence={sentenceOf(activity)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  content: {
    paddingBottom: 40,
  },
  skeletons: {
    paddingVertical: 6,
  },
  day: {
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
  },
  dayLabel: {
    marginBottom: 2,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.accent300,
  },
});
