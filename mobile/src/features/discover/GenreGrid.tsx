import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { GradientFill } from '@/components/GradientFill';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { GENRES } from '@/domain/advancedSearch';
import { MOODS, moodLabel, themeLabel } from '@/domain/themes';
import type { MediaType } from '@/domain/types';
import { useT } from '@/i18n';
import { colors, motion, radii, spacing } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

/**
 * Bas de Découvrir : « Par genre », 10 tuiles en 2 colonnes (tap → liste du genre), puis « Par
 * ambiance », 4 groupes de pastilles (tap → liste de l'ambiance), pour le type de l'onglet.
 */
export function GenreGrid({ type }: { type: MediaType }) {
  const { t } = useT();
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('discover.genre.title')}
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
      <Text accessibilityRole="header" style={[styles.title, styles.moodTitle]}>
        {t('discover.mood.title')}
      </Text>
      {MOODS.map((mood) => (
        <View key={mood.key} style={styles.mood}>
          <Text style={styles.moodLabel}>{moodLabel(mood.key)}</Text>
          <View style={styles.chips}>
            {mood.themes.map((theme) => (
              <Chip
                key={theme}
                label={themeLabel(theme)}
                active={false}
                onPress={() => router.push(`/theme/${type}/${theme}`)}
              />
            ))}
          </View>
        </View>
      ))}
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
  moodTitle: {
    marginTop: spacing.discoverGenreGap,
  },
  mood: {
    marginBottom: 14,
  },
  moodLabel: {
    ...typography.small,
    color: colors.neutral400,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
});
