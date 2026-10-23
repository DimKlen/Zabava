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
/** Rangées rendues d'emblée : un écran de téléphone en montre trois à quatre. */
const INITIAL_ROWS = 4;
/** Affiches en 2:3, titre superposé : la hauteur d'une rangée est connue d'avance. */
const POSTER_RATIO = 3 / 2;

/** Largeur d'une affiche de grille : (largeur − 32 − 16) / 3 ≈ 114,7 à 390 pt. */
export function useGridPosterWidth(): number {
  const { width } = useWindowDimensions();
  return (width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
}

/**
 * Place d'une rangée sans la mesurer (`getItemLayout`) : `index` est celui de la rangée
 * (numColumns), `top` le padding haut plus la hauteur de l'en-tête, `extra` ce qui suit
 * l'affiche (progression des profils), `gap` l'écart vertical entre rangées.
 */
export function gridRowLayout(
  index: number,
  posterWidth: number,
  top: number,
  extra = 0,
  gap: number = GAP,
) {
  const length = posterWidth * POSTER_RATIO + extra + gap;
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
  /** Écart vertical entre rangées : 8 par défaut, 12 sur les profils. */
  rowGap?: number;
  /** Hauteur fixe sous chaque affiche (progression des séries En cours d'un profil). */
  rowExtra?: number;
};

/** Grille d'affiches 3 colonnes, gap 8, marges 16. */
export function PosterGrid<T>({
  renderPoster,
  paddingTop = 0,
  paddingBottom = 0,
  contentContainerStyle,
  ListHeaderComponent,
  rowGap = GAP,
  rowExtra = 0,
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
      // Rangées proches de l'écran seulement : une filmographie compte des centaines
      // d'affiches, chacune avec son badge à charger.
      initialNumToRender={INITIAL_ROWS}
      maxToRenderPerBatch={2}
      windowSize={5}
      {...rest}
      ListHeaderComponent={header}
      getItemLayout={(_data, index) =>
        gridRowLayout(index, posterWidth, paddingTop + headerHeight, rowExtra, rowGap)
      }
      numColumns={COLUMNS}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={rowGap === GAP ? RowGap : WideRowGap}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }, contentContainerStyle]}
      renderItem={({ item }) => renderPoster(item, posterWidth)}
    />
  );
}

function RowGap() {
  return <View style={styles.rowGap} />;
}

/** Écart des grilles de profil (specs/social/docs/03 › ProfileLists : 12). */
function WideRowGap() {
  return <View style={styles.wideRowGap} />;
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
  wideRowGap: {
    height: 12,
  },
});
