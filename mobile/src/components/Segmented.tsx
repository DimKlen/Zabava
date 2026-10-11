import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Option<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  options: readonly Option<K>[];
  value: K;
  onChange: (key: K) => void;
};

/** Contrôle segmenté `.seg` (À voir | Vus). */
export function Segmented<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View accessibilityRole="radiogroup" style={styles.seg}>
      {options.map((option, index) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [
              styles.option,
              index > 0 && styles.separator,
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text style={[styles.label, { color: selected ? colors.accent : colors.text }]}>
              {option.label}
            </Text>
            {/* Contour intérieur de l'option choisie (box-shadow inset 1px). */}
            {selected ? <View pointerEvents="none" style={styles.selectedRing} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.rMd,
  },
  option: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  separator: {
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  pressed: {
    backgroundColor: colors.textA07,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
  },
  selectedRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
});
