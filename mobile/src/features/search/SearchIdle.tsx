import { ClockCounterClockwiseIcon, XIcon } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTrendingToday, type TitleResult } from '@/api/search';
import { Button } from '@/components/Button';
import { SkeletonSearchRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useRecentSearches } from '@/store/recentSearches';
import { colors } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import type { Membership } from '../catalog/useLibraryMembership';
import { TitleRow } from './ResultRows';
import { pressTitle, previewOf } from '../title/openTitle';

type Props = {
  onPickRecent: (query: string) => void;
  onOpenTitle: (title: TitleResult) => void;
  onToggleTitle: (title: TitleResult) => void;
  isInList: Membership;
};

const TRENDING_SKELETONS = 5;

/** Recherche sans saisie : recherches récentes, puis « Tendances du moment ». */
export function SearchIdle({ onPickRecent, onOpenTitle, onToggleTitle, isInList }: Props) {
  const recents = useRecentSearches((s) => s.recents);
  const removeRecent = useRecentSearches((s) => s.remove);
  const clearRecents = useRecentSearches((s) => s.clear);
  const trending = useTrendingToday();

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.content}
    >
      {recents.length > 0 ? (
        <>
          <View style={styles.recentsHeader}>
            <Text style={typography.overline}>Recherches récentes</Text>
            <Button
              variant="ghost"
              height={32}
              fontSize={13}
              label="Effacer"
              onPress={clearRecents}
            />
          </View>
          {recents.map((recent) => (
            <Pressable
              key={recent}
              accessibilityRole="button"
              onPress={() => onPickRecent(recent)}
              style={({ pressed }) => [styles.recent, pressed && styles.pressed]}
            >
              <ClockCounterClockwiseIcon size={16} color={colors.neutral500} />
              <Text numberOfLines={1} style={styles.recentText}>
                {recent}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retirer"
                onPress={() => removeRecent(recent)}
                style={styles.remove}
              >
                <XIcon size={16} color={colors.neutral500} />
              </Pressable>
            </Pressable>
          ))}
        </>
      ) : null}
      <Text style={[typography.overline, styles.trendingTitle]}>Tendances du moment</Text>
      {trending.isPending
        ? Array.from({ length: TRENDING_SKELETONS }, (_, i) => (
            <View key={i} style={styles.skeleton}>
              <SkeletonSearchRow />
            </View>
          ))
        : (trending.data ?? []).map((title) => (
            <TitleRow
              key={title.id}
              title={title}
              inList={isInList(title)}
              onPress={() => onOpenTitle(title)}
              onPressIn={() => pressTitle(previewOf(title, 'w92'))}
              onToggle={() => onToggleTitle(title)}
            />
          ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingRight: 8,
    paddingLeft: 16,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  recentText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 15 * 1.55,
    color: colors.text,
  },
  remove: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingTitle: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  skeleton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});
