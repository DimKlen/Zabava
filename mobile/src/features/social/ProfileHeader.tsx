import { CardsIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Text } from '@/components/Text';
import { commonLabel, formatCount, friendsLabel, showsCommon } from '@/domain/social/members';
import { colors, radii } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

export type HeaderProfile = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  friendsCount: number;
  /** Titres en commun avec moi (profil d'un ami). */
  commonCount?: number;
};

type Props = {
  profile: HeaderProfile;
  onFriends: () => void;
};

/** En-tête du profil d'un autre membre (specs/social/docs/03 › ProfileHeader, Counters, CommonChip). */
export function ProfileHeader({ profile, onFriends }: Props) {
  const common = profile.commonCount ?? 0;
  const label = friendsLabel(profile.friendsCount);
  return (
    <>
      <View style={styles.row}>
        <Avatar size={88} name={profile.displayName} uri={profile.avatarUrl} />
        <View style={styles.column}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
            {profile.displayName}
          </Text>
          <Text style={styles.handle}>@{profile.username}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${profile.friendsCount} ${label}`}
            onPress={onFriends}
            hitSlop={4}
            style={styles.counter}
          >
            <Text style={styles.count}>{formatCount(profile.friendsCount)}</Text>
            <Text style={styles.countLabel}>{label}</Text>
          </Pressable>
        </View>
      </View>
      {showsCommon(common) ? (
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
  handle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral400,
  },
  counter: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'baseline',
    gap: 5,
    minHeight: 36,
    marginTop: 4,
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
