import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

export type TabOption<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  tabs: readonly TabOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** default : gap 22 · search : gap 20, texte 14, défilant · compact : gap 20 (onboarding). */
  variant?: 'default' | 'search' | 'compact';
  style?: StyleProp<ViewStyle>;
};

/** Onglets soulignés. Changement instantané, sans animation. */
export function UnderlineTabs<K extends string>({
  tabs,
  value,
  onChange,
  variant = 'default',
  style,
}: Props<K>) {
  const isSearch = variant === 'search';
  const gap = variant === 'default' ? 22 : 20;
  const fontSize = isSearch ? 14 : 15;

  const items = tabs.map((tab) => {
    const active = tab.key === value;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(tab.key)}
        // Visuel ≈ 40 pt de haut : la zone tactile est portée à 44 pt minimum.
        hitSlop={{ top: 3, bottom: 3, left: gap / 2, right: gap / 2 }}
        style={styles.tab}
      >
        <Text
          style={[
            styles.label,
            {
              fontSize,
              lineHeight: fontSize * 1.3,
              color: active ? colors.text : colors.neutral500,
            },
          ]}
        >
          {tab.label}
        </Text>
        <View style={[styles.bar, active && styles.barActive]} />
      </Pressable>
    );
  });

  if (isSearch) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        contentContainerStyle={[styles.row, { gap }]}
        style={style}
      >
        {items}
      </ScrollView>
    );
  }

  return (
    <View accessibilityRole="tablist" style={[styles.row, { gap }, style]}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenX,
  },
  tab: {
    paddingVertical: 10,
  },
  label: {
    fontFamily: fonts.medium,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.transparent,
  },
  barActive: {
    backgroundColor: colors.accent,
  },
});
