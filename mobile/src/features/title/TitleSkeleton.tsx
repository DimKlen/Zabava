import { StyleSheet, View } from 'react-native';

import { SkeletonBox } from '@/components/Skeleton';
import { radii } from '@/theme/tokens';

import { InfoSection } from './InfoSection';

const LOGO_COUNT = 4;
const SYNOPSIS_LINES = ['100%', '100%', '62%'] as const;

/**
 * Corps d'une fiche pendant son chargement : la forme des sections qui arrivent (notes,
 * actions, bandeau ou onglets, Où regarder, synopsis), sous l'en-tête déjà affiché.
 */
export function TitleBodySkeleton({ series = false }: { series?: boolean }) {
  return (
    <View testID="title-skeleton">
      <View style={styles.ratings}>
        <SkeletonBox width={148} height={32} radius={radii.rPill} />
        <SkeletonBox width={168} height={32} radius={radii.rPill} />
      </View>
      <View style={styles.actions}>
        <SkeletonBox height={46} radius={radii.rMd} style={styles.action} />
        <SkeletonBox height={46} radius={radii.rMd} style={styles.action} />
      </View>
      {series ? (
        <View style={styles.tabs}>
          <SkeletonBox width={84} height={18} radius={radii.rXs} />
          <SkeletonBox width={48} height={18} radius={radii.rXs} />
        </View>
      ) : (
        <SkeletonBox height={48} radius={radii.rLg} style={styles.banner} />
      )}
      <InfoSection title="Où regarder">
        <View style={styles.logos}>
          {Array.from({ length: LOGO_COUNT }, (_, index) => (
            <SkeletonBox key={index} width={48} height={48} radius={24} />
          ))}
        </View>
      </InfoSection>
      <InfoSection title="Synopsis">
        <View style={styles.lines}>
          {SYNOPSIS_LINES.map((width, index) => (
            <SkeletonBox key={index} width={width} height={13} radius={radii.rXs} />
          ))}
        </View>
      </InfoSection>
    </View>
  );
}

/** Méta et genres de l'en-tête pas encore reçus. */
export function HeaderTextSkeleton({ withTitle = false }: { withTitle?: boolean }) {
  return (
    <View style={styles.headerLines} testID="title-header-skeleton">
      {withTitle ? <SkeletonBox width="80%" height={26} radius={radii.rXs} /> : null}
      <SkeletonBox width="70%" height={13} radius={radii.rXs} />
      <SkeletonBox width="50%" height={13} radius={radii.rXs} />
    </View>
  );
}

const styles = StyleSheet.create({
  ratings: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  action: {
    flex: 1,
  },
  banner: {
    marginTop: 12,
    marginHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  logos: {
    flexDirection: 'row',
    gap: 14,
  },
  lines: {
    gap: 8,
  },
  headerLines: {
    gap: 6,
    marginTop: 6,
  },
});
