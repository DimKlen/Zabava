import { StyleSheet, View } from 'react-native';

import { useGridPosterWidth } from '@/components/PosterGrid';
import { SkeletonPoster } from '@/components/Skeleton';
import { spacing } from '@/theme/tokens';

const ROWS = 3;
const COLUMNS = 3;

/** Grille d'affiches en chargement : 3 rangées de 3. */
export function GridSkeleton({ paddingTop = 0 }: { paddingTop?: number }) {
  return (
    <View style={[styles.grid, { paddingTop }]}>
      {Array.from({ length: ROWS }, (_, row) => (
        <SkeletonRow key={row} />
      ))}
    </View>
  );
}

/** Rangée de squelettes sous la grille pendant le chargement de la page suivante. */
export function GridFooter() {
  return (
    <View style={styles.footer}>
      <SkeletonRow />
    </View>
  );
}

function SkeletonRow() {
  const width = useGridPosterWidth();
  return (
    <View style={styles.row}>
      {Array.from({ length: COLUMNS }, (_, i) => (
        <SkeletonPoster key={i} style={{ width }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.gridGap,
    paddingHorizontal: spacing.screenX,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.gridGap,
  },
  footer: {
    paddingTop: spacing.gridGap,
  },
});
