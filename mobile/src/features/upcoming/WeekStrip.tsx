import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeekDay } from '@/domain/upcoming';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  days: readonly WeekDay[];
  onSelect: (day: WeekDay) => void;
};

/** Bande de la semaine (collante) : 7 jours, point s'il y a un événement. */
export function WeekStrip({ days, onSelect }: Props) {
  return (
    <View style={styles.strip}>
      {days.map((day) => (
        <Pressable
          key={day.key}
          accessibilityRole="button"
          accessibilityLabel={`${day.weekday} ${day.day}${day.hasEvents ? ', événements' : ''}`}
          onPress={() => onSelect(day)}
          style={[styles.day, day.isToday && styles.today]}
        >
          <Text style={styles.weekday}>{day.weekday}</Text>
          <Text style={[styles.number, day.isToday && styles.todayNumber]}>{day.day}</Text>
          <View style={[styles.dot, day.hasEvents && styles.dotOn]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    // Rayon 10 du prototype (bouton jour).
    borderRadius: 10,
  },
  today: {
    backgroundColor: colors.accent900,
  },
  weekday: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 11 * 1.3,
    color: colors.neutral500,
  },
  number: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
  todayNumber: {
    color: colors.accent200,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.transparent,
  },
  dotOn: {
    backgroundColor: colors.accent,
  },
});
