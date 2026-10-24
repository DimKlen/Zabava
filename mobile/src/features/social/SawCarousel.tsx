import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { Text } from '@/components/Text';
import type { TitleHolder } from '@/domain/social/followingSummary';
import { commonLabel } from '@/domain/social/members';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { InfoSection } from '../title/InfoSection';
import { openUser } from './navigation';

const CARD_WIDTH = 120;

/** « Ils l'ont vu » : profils publics que je ne suis pas, 10 au plus (specs/social/docs/03 › SawCard). */
export function SawCarousel({ holders }: { holders: TitleHolder[] }) {
  return (
    <InfoSection title="Ils l'ont vu" fullWidth>
      <HorizontalCarousel
        data={holders}
        keyExtractor={(holder) => holder.user.username}
        renderItem={({ user }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${user.displayName}, @${user.username}`}
            onPress={() => openUser(user.username)}
            style={styles.card}
          >
            <Avatar size={56} name={user.displayName} uri={user.avatarUrl} />
            <Text numberOfLines={1} style={styles.handle}>
              @{user.username}
            </Text>
            <Text style={styles.common}>{commonLabel(user.commonCount)}</Text>
            <View style={styles.follow}>
              <FollowButton member={user} size="card" />
            </View>
          </Pressable>
        )}
      />
    </InfoSection>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: colors.text,
  },
  common: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.25,
    color: colors.neutral400,
  },
  follow: {
    alignSelf: 'stretch',
    marginTop: 2,
  },
});
