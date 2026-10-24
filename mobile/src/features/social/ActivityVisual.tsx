import { Image } from 'expo-image';
import { CheckIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GradientFill } from '@/components/GradientFill';
import type { ActivityVisual as Visual, FeedActivity } from '@/domain/social/feed';
import { tmdbImage } from '@/lib/tmdb';
import { colors, durations } from '@/theme/tokens';

import { openTitle, previewOf } from '../title/openTitle';
import { openUser } from './navigation';

const POSTER = { width: 48, height: 72 };
const STILL = { width: 64, height: 36 };
const RADIUS = 6;
const CHECK = 20;
const CHECK_BORDER = 2;

type Props = {
  activity: FeedActivity;
  visual: Visual;
  /** Couleur du fond sous la pastille : `bg` dans le fil, `surface` sur une carte. */
  background: string;
};

/** À droite d'une activité : affiche, vignette d'épisode ou avatar (specs/social/docs/03 › ActivityItem). */
export function ActivityVisual({ activity, visual, background }: Props) {
  const { title, episode, target } = activity;
  if (visual === 'avatar') {
    if (!target) return null;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={target.displayName}
        onPress={() => openUser(target.username)}
      >
        <Avatar size={48} name={target.displayName} uri={target.avatarUrl} />
      </Pressable>
    );
  }
  if (!title) return null;
  const open = () => openTitle(previewOf(title), visual === 'still' ? episode?.season : undefined);
  if (visual === 'still') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title.title}
        onPress={open}
        style={[styles.still, styles.clip]}
      >
        <GradientFill gradientKey={`${title.id}-${episode?.season}-${episode?.number}`} />
        <Image
          source={{ uri: tmdbImage(episode?.stillPath, 'w300') }}
          contentFit="cover"
          transition={durations.posterFadeIn}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title.title} onPress={open}>
      <View style={[styles.poster, styles.clip]}>
        <GradientFill gradientKey={title.id} />
        {title.posterPath ? (
          <Image
            source={{ uri: tmdbImage(title.posterPath, 'w185') }}
            contentFit="cover"
            transition={durations.posterFadeIn}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
      {activity.inMyList ? (
        <View
          accessibilityLabel="Dans ma liste"
          style={[styles.check, { borderColor: background }]}
        >
          <CheckIcon size={10} weight="bold" color={colors.bg} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    borderRadius: RADIUS,
  },
  poster: POSTER,
  still: {
    ...STILL,
    marginTop: 4,
  },
  check: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    borderWidth: CHECK_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
