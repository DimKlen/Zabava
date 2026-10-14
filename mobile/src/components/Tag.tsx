import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Text } from './Text';

type Props = {
  label: string;
  /** neutral : plateforme d'À venir ; outline : TMDB / JustWatch (À propos). */
  variant: 'neutral' | 'outline';
};

/** `.tag` du prototype : 11 pt, padding 3 × 10, rayon 6. */
export function Tag({ label, variant }: Props) {
  return (
    <View style={[styles.tag, variant === 'neutral' ? styles.neutral : styles.outline]}>
      <Text
        numberOfLines={1}
        style={[styles.label, { color: variant === 'neutral' ? colors.neutral100 : colors.accent }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexShrink: 0,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radii.rMd * 0.75,
  },
  neutral: {
    backgroundColor: colors.neutral800,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 11 * 1.3,
    letterSpacing: 0.22,
  },
});
