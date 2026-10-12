import type { ReactElement, Ref } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type FlatListProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { spacing } from '@/theme/tokens';

const COLUMNS = 3;
const GAP = spacing.gridGap;
const SIDE = spacing.screenX;

/** Largeur d'une affiche de grille : (largeur − 32 − 16) / 3 ≈ 114,7 à 390 pt. */
export function useGridPosterWidth(): number {
  const { width } = useWindowDimensions();
  return (width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
}

type Props<T> = Omit<
  FlatListProps<T>,
  'renderItem' | 'numColumns' | 'columnWrapperStyle' | 'contentContainerStyle'
> & {
  renderPoster: (item: T, width: number) => ReactElement;
  /** Padding haut et bas du contenu (le padding horizontal est fixé à 16). */
  paddingTop?: number;
  paddingBottom?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Pour remonter en haut au re-tap de l'onglet (useScrollToTop). */
  ref?: Ref<FlatList<T>>;
};

/** Grille d'affiches 3 colonnes, gap 8, marges 16. */
export function PosterGrid<T>({
  renderPoster,
  paddingTop = 0,
  paddingBottom = 0,
  contentContainerStyle,
  ...rest
}: Props<T>) {
  const posterWidth = useGridPosterWidth();
  return (
    <FlatList
      {...rest}
      numColumns={COLUMNS}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={RowGap}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }, contentContainerStyle]}
      renderItem={({ item }) => renderPoster(item, posterWidth)}
    />
  );
}

function RowGap() {
  return <View style={styles.rowGap} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SIDE,
  },
  row: {
    gap: GAP,
  },
  rowGap: {
    height: GAP,
  },
});
