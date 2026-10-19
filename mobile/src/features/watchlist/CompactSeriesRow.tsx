import { CaretRightIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Poster } from '@/components/Poster';
import { Text } from '@/components/Text';
import type { SeriesSection } from '@/domain/series';
import { compactRowLabel, type SeriesEntry } from '@/domain/seriesList';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openSeries } from './openSeries';
import { pressTitle, previewOf } from '../title/openTitle';

type Props = { entry: SeriesEntry; section: SeriesSection };

/** Ligne compacte (À jour, Terminées, Abandonnées) : affiche 44, nom, libellé, chevron. */
export function CompactSeriesRow({ entry: { series, info }, section }: Props) {
  const label = compactRowLabel(section, info);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${series.title}, ${label}`}
      onPress={() => openSeries(series, undefined, 'w185')}
      onPressIn={() => pressTitle(previewOf(series, 'w185'))}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* Affiche décorative : le tap revient à la ligne. */}
      <View pointerEvents="none">
        <Poster title={series} showTitle={false} imageSize="w185" style={styles.poster} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name}>{series.title}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <CaretRightIcon size={16} color={colors.neutral600} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 6,
    marginHorizontal: -6,
    borderRadius: radii.rMd,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  poster: {
    width: 44,
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
  label: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
});
