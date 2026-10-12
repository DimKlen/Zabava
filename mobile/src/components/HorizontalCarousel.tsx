import type { ReactElement } from 'react';
import { FlatList, StyleSheet, type FlatListProps } from 'react-native';

import { spacing } from '@/theme/tokens';

type Props<T> = Omit<
  FlatListProps<T>,
  'horizontal' | 'renderItem' | 'contentContainerStyle' | 'showsHorizontalScrollIndicator'
> & {
  renderItem: (item: T, index: number) => ReactElement;
  /** 10 par défaut, 12 pour le casting. */
  gap?: 10 | 12;
};

/** Carrousel horizontal sans pagination magnétique, padding 16. */
export function HorizontalCarousel<T>({
  renderItem,
  gap = spacing.carouselGap as 10,
  ...rest
}: Props<T>) {
  return (
    <FlatList
      {...rest}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { gap }]}
      renderItem={({ item, index }) => renderItem(item, index)}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screenX,
  },
});
