import { CaretLeftIcon, ProhibitIcon } from 'phosphor-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBlocks } from '@/api/social';
import { unblockMember } from '@/api/socialActions';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonSearchRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { goBack } from '@/lib/navigation';
import { colors, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

const SKELETONS = 3;

/** Comptes bloqués (specs/social/docs/04 §4.14). */
export function BlockedScreen() {
  const insets = useSafeAreaInsets();
  const blocks = useBlocks();
  // Débloqué : la ligne disparaît tout de suite (mise à jour optimiste de followState).
  const members = (blocks.data ?? []).filter((member) => member.followState === 'blocked');

  let body;
  if (!blocks.data) {
    body = showsLoadError(blocks) ? (
      <LoadError onRetry={() => void blocks.refetch()} />
    ) : (
      <View style={styles.skeletons}>
        {Array.from({ length: SKELETONS }, (_, i) => (
          <SkeletonSearchRow key={i} />
        ))}
      </View>
    );
  } else {
    body = (
      <FlatList
        data={members}
        keyExtractor={(member) => member.username}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <EmptyState icon={ProhibitIcon} title="Aucun compte bloqué" paddingTop={48} />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar size={44} name={item.displayName} uri={item.avatarUrl} />
            <View style={styles.who}>
              <Text numberOfLines={1} style={styles.name}>
                {item.displayName}
              </Text>
              <Text numberOfLines={1} style={styles.handle}>
                @{item.username}
              </Text>
            </View>
            <Button
              variant="secondary"
              height={32}
              fontSize={13}
              label="Débloquer"
              accessibilityLabel={`Débloquer @${item.username}`}
              onPress={() => unblockMember(item)}
              style={styles.compact}
            />
          </View>
        )}
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
          Comptes bloqués
        </Text>
      </View>
      {body}
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
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.screenX,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  who: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  handle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  compact: {
    paddingHorizontal: 12,
  },
});
