import { CheckIcon, ClockIcon, ProhibitIcon, UserPlusIcon } from 'phosphor-react-native';
import { StyleSheet } from 'react-native';

import { pressFollow } from '@/api/socialActions';
import {
  followButtonA11y,
  followButtonState,
  type FollowButtonState,
  type Member,
} from '@/domain/social/members';

import { Button } from './Button';

const ICONS = {
  userPlus: UserPlusIcon,
  clock: ClockIcon,
  check: CheckIcon,
  prohibit: ProhibitIcon,
} satisfies Record<FollowButtonState['icon'], unknown>;

type Props = {
  member: Member;
  /**
   * `normal` : 44 de haut, pleine largeur (profils) ; `compact` : 32 (listes).
   */
  size: 'normal' | 'compact';
};

/** Bouton d'ami : 5 états (specs/social/docs/03 › FollowButton, revu pour les amis). */
export function FollowButton({ member, size }: Props) {
  const state = followButtonState(member);
  const compact = size === 'compact';
  return (
    <Button
      variant={state.variant}
      height={compact ? 32 : 44}
      label={state.label}
      icon={ICONS[state.icon]}
      iconSize={compact ? 15 : 18}
      fontSize={compact ? 13 : 14}
      accessibilityLabel={followButtonA11y(state.kind, member.username)}
      onPress={() => pressFollow(member)}
      style={compact ? styles.compact : styles.wide}
    />
  );
}

const styles = StyleSheet.create({
  compact: {
    paddingHorizontal: 12,
  },
  wide: {
    alignSelf: 'stretch',
  },
});
