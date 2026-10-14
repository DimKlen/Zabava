import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { GradientFill } from '@/components/GradientFill';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { GENRES } from '@/domain/advancedSearch';
import type { MediaType } from '@/domain/types';
import { colors, motion, radii, spacing } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

/** « Par genre » : 10 tuiles en 2 colonnes, tap → liste du genre pour le type de l'onglet. */
export function GenreGrid({ type }: { type: MediaType }) {
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.title}>
        Par genre
      </Text>
      <View style={styles.grid}>
        {GENRES.map((genre, index) => (
          <PressableScale
            key={genre.key}
            pressedScale={motion.pressScaleGenre}
            accessibilityRole="button"
            accessibilityLabel={genre.label}
            onPress={() => router.push(`/genre/${type}/${genre.key}`)}
            style={styles.tile}
          >
            <GradientFill genreIndex={index} />
            <Text numberOfLines={1} style={styles.label}>
              {genre.label}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.discoverGenreGap,
    paddingHorizontal: spacing.screenX,
  },
  title: {
    ...typography.section,
    color: colors.text,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gridGap,
  },
  tile: {
    // 2 colonnes : deux tuiles de 40 % minimum se partagent la rangée, gap 8.
    flexGrow: 1,
    flexBasis: '40%',
    height: 60,
    borderRadius: radii.rLg,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
});
