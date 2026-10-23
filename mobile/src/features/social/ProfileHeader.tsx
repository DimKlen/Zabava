import { CardsIcon, LockSimpleIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Tag } from '@/components/Tag';
import { Text } from '@/components/Text';
import { commonLabel, counterLabel, formatCount, showsCommon } from '@/domain/social/members';
import { colors, radii } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

export type HeaderProfile = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  /** Profil d'un autre seulement : « Te suit » et titres en commun. */
  followsMe?: boolean;
  commonCount?: number;
};

type Props = {
  profile: HeaderProfile;
  isMe: boolean;
  onFollowers: () => void;
  onFollowing: () => void;
};

/** En-tête de profil (specs/social/docs/03 › ProfileHeader, Counters, CommonChip). */
export function ProfileHeader({ profile, isMe, onFollowers, onFollowing }: Props) {
  const common = profile.commonCount ?? 0;
  return (
    <>
      <View style={styles.row}>
        <Avatar size={88} name={profile.displayName} uri={profile.avatarUrl} mine={isMe} />
        <View style={styles.column}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
            {profile.displayName}
          </Text>
          <View style={styles.handleRow}>
            <Text style={styles.handle}>@{profile.username}</Text>
            {profile.isPrivate ? (
              <View accessible accessibilityLabel="Profil privé">
                <LockSimpleIcon size={14} color={colors.neutral400} />
              </View>
            ) : null}
            {!isMe && profile.followsMe ? <Tag label="Te suit" variant="neutral" /> : null}
          </View>
          <View style={styles.counters}>
            <Counter count={profile.followersCount} kind="followers" onPress={onFollowers} />
            <Counter count={profile.followingCount} kind="following" onPress={onFollowing} />
          </View>
        </View>
      </View>
      {!isMe && showsCommon(common) ? (
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <CardsIcon size={15} color={colors.neutral100} />
            <Text style={styles.chipText}>{commonLabel(common)}</Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

function Counter({
  count,
  kind,
  onPress,
}: {
  count: number;
  kind: 'followers' | 'following';
  onPress: () => void;
}) {
  const label = counterLabel(count, kind);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      onPress={onPress}
      hitSlop={4}
      style={styles.counter}
    >
      <Text style={styles.count}>{formatCount(count)}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  column: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...typography.titleXL,
    color: colors.text,
  },
  handleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  handle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral400,
  },
  counters: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 4,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    minHeight: 36,
    paddingVertical: 6,
  },
  count: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.2,
    color: colors.text,
  },
  countLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  chipRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.rPill,
    backgroundColor: colors.neutral800,
  },
  chipText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral100,
  },
});
