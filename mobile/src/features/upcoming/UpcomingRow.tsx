import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GradientFill } from '@/components/GradientFill';
import { PressableScale } from '@/components/PressableScale';
import { Tag } from '@/components/Tag';
import type { UpcomingTitle } from '@/domain/upcoming';
import { tmdbImage } from '@/lib/tmdb';
import { colors, motion, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  title: UpcomingTitle;
  line: string;
  tag?: string;
};

/** Élément d'À venir : mini-affiche, titre, ligne, tag de plateforme ; tap → fiche. */
export function UpcomingRow({ title, line, tag }: Props) {
  const poster = tmdbImage(title.posterPath, 'w92');
  return (
    <PressableScale
      pressedScale={motion.pressScaleUpcoming}
      accessibilityRole="button"
      accessibilityLabel={`${title.title}, ${line}`}
      onPress={() => router.push(`/title/${title.type}/${title.tmdbId}`)}
      style={styles.row}
    >
      <View style={styles.poster}>
        <GradientFill gradientKey={title.id} />
        {poster ? (
          <Image
            source={{ uri: poster }}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
      <View style={styles.texts}>
        <Text numberOfLines={1} style={styles.title}>
          {title.title}
        </Text>
        <Text numberOfLines={1} style={styles.line}>
          {line}
        </Text>
      </View>
      {tag ? <Tag label={tag} variant="neutral" /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  poster: {
    width: 40,
    height: 60,
    borderRadius: radii.rSm,
    overflow: 'hidden',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  line: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
});
