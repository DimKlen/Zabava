import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Text } from './Text';

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
  const { scroll, measured, viewport, scrolled } = useRevealTab(value);

  const items = tabs.map((tab) => {
    const active = tab.key === value;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(tab.key)}
        onLayout={isSearch ? (e) => measured(tab.key, e.nativeEvent.layout) : undefined}
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
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => viewport(e.nativeEvent.layout.width)}
        onScroll={(e) => scrolled(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        // Recherche : changer d'onglet clavier ouvert, sans un premier tap qui le ferme.
        keyboardShouldPersistTaps="handled"
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

/**
 * Onglets défilants : l'onglet actif est ramené dans le champ s'il en sort (onglet changé par
 * la saisie, comme « @ » qui passe sur Membres, le dernier onglet).
 */
function useRevealTab<K extends string>(value: K) {
  const scroll = useRef<ScrollView>(null);
  const layouts = useRef(new Map<K, LayoutRectangle>());
  const view = useRef({ width: 0, offset: 0 });
  const active = useRef(value);

  useEffect(() => {
    active.current = value;
    revealTab(scroll.current, layouts.current.get(value), view.current);
  }, [value]);

  return {
    scroll,
    measured: (key: K, layout: LayoutRectangle) => {
      layouts.current.set(key, layout);
      if (key === active.current) revealTab(scroll.current, layout, view.current);
    },
    viewport: (width: number) => {
      view.current.width = width;
      revealTab(scroll.current, layouts.current.get(active.current), view.current);
    },
    scrolled: (offset: number) => {
      view.current.offset = offset;
    },
  };
}

/** Défile juste assez pour montrer l'onglet en entier, marges comprises. */
function revealTab(
  scroll: ScrollView | null,
  tab: LayoutRectangle | undefined,
  view: { width: number; offset: number },
) {
  if (!scroll || !tab || view.width === 0) return;
  const start = tab.x - spacing.screenX;
  const end = tab.x + tab.width + spacing.screenX;
  if (start < view.offset) scroll.scrollTo({ x: Math.max(0, start) });
  else if (end > view.offset + view.width) scroll.scrollTo({ x: end - view.width });
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
