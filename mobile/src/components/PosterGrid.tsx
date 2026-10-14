import { createElement, isValidElement, useState, type ReactElement, type Ref } from 'react';
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
/** Affiches en 2:3, titre superposé : la hauteur d'une rangée est connue d'avance. */
const POSTER_RATIO = 3 / 2;

/** Largeur d'une affiche de grille : (largeur − 32 − 16) / 3 ≈ 114,7 à 390 pt. */
export function useGridPosterWidth(): number {
  const { width } = useWindowDimensions();
  return (width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
}

/**
 * Place d'une rangée sans la mesurer (`getItemLayout`) : `index` est celui de la rangée
 * (numColumns), `top` le padding haut plus la hauteur de l'en-tête.
 */
export function gridRowLayout(index: number, posterWidth: number, top: number) {
  const length = posterWidth * POSTER_RATIO + GAP;
  return { index, length, offset: top + length * index };
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
  ListHeaderComponent,
  ...rest
}: Props<T>) {
  const posterWidth = useGridPosterWidth();
  const [headerHeight, setHeaderHeight] = useState(0);
  const header = ListHeaderComponent ? (
    <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
      {isValidElement(ListHeaderComponent)
        ? ListHeaderComponent
        : createElement(ListHeaderComponent)}
    </View>
  ) : null;
  return (
    <FlatList
      {...rest}
      ListHeaderComponent={header}
      getItemLayout={(_data, index) => gridRowLayout(index, posterWidth, paddingTop + headerHeight)}
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
