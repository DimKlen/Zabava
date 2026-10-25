import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Text } from '@/components/Text';
import { cardWhen, type ActivitySentence, type FeedActivity } from '@/domain/social/feed';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openTitle, previewOf } from '../title/openTitle';
import { ActivityVisual } from './ActivityVisual';
import { openUser } from './navigation';

export const ACTIVITY_CARD_WIDTH = 256;

type Props = { activity: FeedActivity; sentence: ActivitySentence; now: Date };

/** Carte du carrousel de Découvrir (specs/social/docs/03 › ActivityCard). */
export function ActivityCard({ activity, sentence, now }: Props) {
  const { actor, title } = activity;
  // Toute la carte ouvre la fiche du titre.
  const openTarget = () => openTitle(previewOf(title));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sentence.name} ${sentence.verb} ${sentence.title}${sentence.tail}`}
      onPress={openTarget}
      style={styles.card}
    >
      <View style={styles.text}>
        <View style={styles.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actor.displayName}
            onPress={() => openUser(actor.username)}
            hitSlop={10}
          >
            <Avatar size={24} name={actor.displayName} uri={actor.avatarUrl} />
          </Pressable>
          <Text numberOfLines={1} style={styles.name}>
            {sentence.name}
          </Text>
          <Text style={styles.when}>{cardWhen(new Date(activity.createdAt), now)}</Text>
        </View>
        <Text numberOfLines={3} style={styles.sentence}>
          {`${sentence.verb} `}
          <Text style={styles.strong}>{sentence.title}</Text>
          {sentence.tail}
        </Text>
      </View>
      <ActivityVisual activity={activity} visual={sentence.visual} background={colors.surface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: ACTIVITY_CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: colors.text,
  },
  when: {
    marginLeft: 'auto',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
  sentence: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.35,
    color: colors.neutral300,
  },
  strong: {
    fontFamily: fonts.medium,
    color: colors.text,
  },
});
