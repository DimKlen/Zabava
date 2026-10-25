import { FilmStripIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { LoadError } from '@/components/LoadError';
import { PosterGrid, useGridPosterWidth } from '@/components/PosterGrid';
import { Segmented } from '@/components/Segmented';
import { SkeletonPoster } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import {
  MOVIE_SEGMENTS,
  PROFILE_TABS,
  SERIES_SEGMENTS,
  type ProfileGridItem,
  type ProfileSegment,
} from '@/domain/social/profileLists';
import type { MediaType } from '@/domain/types';
import { colors, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { useLibraryMembership } from '../catalog/useLibraryMembership';
import { PROGRESS_HEIGHT, ProfilePoster } from './ProfilePoster';

type Props = {
  /** Barre, en-tête, boutons : tout ce qui précède les listes. */
  header: ReactNode;
  /** À la place des listes (pas encore amis) ; null = listes visibles. */
  notice?: ReactNode;
  tab: MediaType;
  segment: ProfileSegment;
  onTab: (tab: MediaType) => void;
  onSegment: (segment: ProfileSegment) => void;
  /** undefined : chargement. */
  items: ProfileGridItem[] | undefined;
  error?: boolean;
  onRetry?: () => void;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Profil : en-tête, onglets Films / Séries / Animés, segment, grille (docs/03 › ProfileLists). */
export function ProfileContent({
  header,
  notice,
  tab,
  segment,
  onTab,
  onSegment,
  items,
  error = false,
  onRetry,
  onEndReached,
  refreshing = false,
  onRefresh,
}: Props) {
  const isInList = useLibraryMembership();
  const showLists = !notice;
  const segments = tab === 'movie' ? MOVIE_SEGMENTS : SERIES_SEGMENTS;

  let empty: ReactNode = null;
  if (showLists) {
    if (error) {
      empty = (
        <View style={styles.fullWidth}>
          <LoadError onRetry={() => onRetry?.()} />
        </View>
      );
    } else if (!items) empty = <ProfileGridSkeleton />;
    else empty = <NothingHere />;
  }

  return (
    <PosterGrid
      data={showLists && !error ? (items ?? []) : []}
      keyExtractor={(item) => item.id}
      extraData={isInList}
      rowGap={12}
      rowExtra={segment === 'in_progress' ? PROGRESS_HEIGHT : 0}
      paddingBottom={40}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {showLists ? (
            <>
              <UnderlineTabs tabs={PROFILE_TABS} value={tab} onChange={onTab} style={styles.tabs} />
              <View style={styles.segment}>
                <Segmented options={segments} value={segment} onChange={onSegment} />
              </View>
            </>
          ) : (
            notice
          )}
        </View>
      }
      ListEmptyComponent={empty ? <>{empty}</> : null}
      renderPoster={(item, width) => (
        <ProfilePoster item={item} inList={isInList(item)} width={width} />
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    />
  );
}

/** 6 squelettes d'affiche pendant le chargement. */
function ProfileGridSkeleton() {
  const width = useGridPosterWidth();
  return (
    <View style={styles.skeleton}>
      {[0, 1].map((row) => (
        <View key={row} style={styles.skeletonRow}>
          {[0, 1, 2].map((column) => (
            <SkeletonPoster key={column} style={{ width }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function NothingHere() {
  return (
    <View style={styles.empty}>
      <FilmStripIcon size={36} color={colors.neutral600} />
      <Text style={styles.emptyText}>Rien ici pour l&apos;instant</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  // L'en-tête porte ses propres marges de 16 : il annule celles de la grille.
  header: {
    marginHorizontal: -spacing.screenX,
    paddingBottom: 12,
  },
  tabs: {
    paddingTop: 14,
  },
  // Composants pleine largeur (erreur) : sans les marges de la grille.
  fullWidth: {
    marginHorizontal: -spacing.screenX,
  },
  segment: {
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
  },
  skeleton: {
    gap: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.gridGap,
  },
  empty: {
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 40 - 12,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
});
