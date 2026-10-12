import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
  /** 32 par défaut ; 34 pour « Type » (recherche avancée) ; 28 pour le tri d'une personne. */
  height?: 28 | 32 | 34;
  /** 12 par défaut ; 14 pour À venir, les saisons et « Type ». */
  paddingHorizontal?: 12 | 14;
};

/** Chip de filtre (pilule). */
export function Chip({ label, active, onPress, height = 32, paddingHorizontal = 12 }: Props) {
  const fontSize = height === 28 ? 12 : 13;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={(44 - height) / 2}
      style={[styles.chip, { height, paddingHorizontal }, active ? styles.active : styles.inactive]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { fontSize, lineHeight: fontSize * 1.4 },
          { color: active ? colors.accent200 : colors.neutral300 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.rPill,
    borderWidth: 1,
  },
  inactive: {
    borderColor: colors.neutral800,
    backgroundColor: colors.transparent,
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: colors.accent900,
  },
  label: {
    fontFamily: fonts.regular,
  },
});
