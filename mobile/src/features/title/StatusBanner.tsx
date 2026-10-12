import {
  CalendarBlankIcon,
  FilmSlateIcon,
  QuestionIcon,
  TelevisionSimpleIcon,
  type Icon,
} from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { MovieState } from '@/domain/availability';
import type { MovieStatus } from '@/domain/movieDetail';
import { colors, radii } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const ICONS: Record<MovieState, Icon> = {
  upcoming: CalendarBlankIcon,
  cinema: FilmSlateIcon,
  avail: TelevisionSimpleIcon,
  unknown: QuestionIcon,
};

/** Bandeau de statut d'un film (docs/01 §5). */
export function StatusBanner({ status }: { status: MovieStatus }) {
  const StateIcon = ICONS[status.state];
  return (
    <View style={styles.banner}>
      <StateIcon size={18} color={colors.accent200} />
      <Text style={styles.text}>{status.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.rLg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accent900,
  },
  text: {
    ...typography.label,
    flex: 1,
    color: colors.accent200,
  },
});
