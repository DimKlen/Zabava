import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Text } from '@/components/Text';
import { formatTime } from '@/domain/format';
import type { ActivitySentence, FeedActivity } from '@/domain/social/feed';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { ActivityVisual } from './ActivityVisual';
import { openUser } from './navigation';

type Props = { activity: FeedActivity; sentence: ActivitySentence };

/** Élément du fil (specs/social/docs/03 › ActivityItem). */
export function ActivityItem({ activity, sentence }: Props) {
  const { actor } = activity;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actor.displayName}
        onPress={() => openUser(actor.username)}
        // Avatar 40 : zone tactile portée à 44.
        hitSlop={2}
      >
        <Avatar size={40} name={actor.displayName} uri={actor.avatarUrl} />
      </Pressable>
      <View style={styles.text}>
        <Text style={styles.sentence}>
          <Text style={styles.strong} onPress={() => openUser(actor.username)}>
            {sentence.name}
          </Text>
          {` ${sentence.verb} `}
          <Text style={styles.strong}>{sentence.title}</Text>
          {sentence.tail}
        </Text>
        <Text style={styles.time}>{formatTime(new Date(activity.createdAt))}</Text>
      </View>
      <ActivityVisual activity={activity} visual={sentence.visual} background={colors.bg} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral900,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  sentence: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.neutral300,
  },
  strong: {
    fontFamily: fonts.medium,
    color: colors.text,
  },
  time: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral500,
  },
});
