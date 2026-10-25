import { DotsThreeIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { commonLabel, showsCommon, type Member } from '@/domain/social/members';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Avatar } from './Avatar';
import { Button } from './Button';
import { FollowButton } from './FollowButton';
import { Text } from './Text';

type Props = {
  member: Member;
  onPress: () => void;
  /** Ma propre ligne : jamais de bouton d'ami. */
  isMe?: boolean;
  /** Menu « … » (ma liste d'amis). */
  onMore?: () => void;
};

/** Ligne de membre (specs/social/docs/03 › MemberRow). */
export function MemberRow({ member, onPress, isMe = false, onMore }: Props) {
  const subtitle = showsCommon(member.commonCount)
    ? `@${member.username} · ${commonLabel(member.commonCount)}`
    : `@${member.username}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${member.displayName}, @${member.username}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar size={44} name={member.displayName} uri={member.avatarUrl} mine={isMe} />
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.name}>
          {member.displayName}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {isMe ? null : <FollowButton member={member} size="compact" />}
      {onMore ? (
        <Button
          variant="icon"
          height={40}
          icon={DotsThreeIcon}
          iconSize={20}
          color={colors.neutral400}
          accessibilityLabel={`Options pour @${member.username}`}
          onPress={onMore}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 16,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
});
