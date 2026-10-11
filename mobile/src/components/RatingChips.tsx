import { SmileyIcon, SmileySadIcon } from 'phosphor-react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatPercent, formatRating, formatVotes } from '@/domain/format';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  imdbRating?: number;
  imdbVotes?: number;
  rtScore?: number;
  style?: StyleProp<ViewStyle>;
};

/** Notes IMDb et Rotten Tomatoes. Une chip est masquée si sa note manque. */
export function RatingChips({ imdbRating, imdbVotes, rtScore, style }: Props) {
  if (imdbRating === undefined && rtScore === undefined) return null;

  return (
    <View style={[styles.row, style]}>
      {imdbRating !== undefined ? (
        <View style={[styles.chip, styles.imdb]}>
          <ImdbBadge />
          <Text style={styles.value}>{formatRating(imdbRating)}</Text>
          {imdbVotes ? <Text style={styles.votes}>{formatVotes(imdbVotes)}</Text> : null}
        </View>
      ) : null}
      {rtScore !== undefined ? (
        <View style={[styles.chip, styles.rt]}>
          {rtScore >= 60 ? (
            <SmileyIcon size={18} color={colors.accent300} weight="fill" />
          ) : (
            <SmileySadIcon size={18} color={colors.accent300} weight="fill" />
          )}
          <Text style={styles.rtLabel}>Rotten Tomatoes</Text>
          <Text style={styles.value}>{formatPercent(rtScore)}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Badge « IMDb » (aussi utilisé dans la fiche épisode). */
export function ImdbBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>IMDb</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.rPill,
    backgroundColor: colors.surface,
  },
  imdb: {
    gap: 8,
    paddingLeft: 5,
    paddingRight: 12,
  },
  rt: {
    gap: 6,
    paddingLeft: 8,
    paddingRight: 12,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: radii.rXs,
    backgroundColor: colors.neutral200,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 11 * 1.3,
    color: colors.bg,
  },
  value: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.text,
  },
  votes: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
  rtLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 11 * 1.3,
    color: colors.neutral400,
  },
});
