import { useQueries, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useScrollToTop } from 'expo-router';
import { memo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { discoverListQuery, type CatalogTitle } from '@/api/discover';
import { feedKey } from '@/api/social';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { SkeletonPoster } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { DISCOVER_SECTIONS, type DiscoverSection } from '@/domain/discover';
import type { MediaType } from '@/domain/types';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { CatalogPoster } from '../catalog/CatalogPoster';
import {
  useLibraryMembership,
  useMyProviderIds,
  type Membership,
} from '../catalog/useLibraryMembership';
import { ActivityCarousel } from '../social/ActivityCarousel';
import { GenreGrid } from './GenreGrid';

const POSTER_WIDTH = 112;
const SKELETON_COUNT = 4;

type Row = { section: DiscoverSection; result: UseQueryResult<CatalogTitle[]> };

/**
 * Contenu d'un onglet de Découvrir : carrousels puis Par genre. Les listes sont demandées
 * toutes ensemble (requêtes légères), mais seules les sections proches de l'écran sont
 * dessinées (liste verticale virtualisée).
 */
export function DiscoverTab({ type }: { type: MediaType }) {
  const sections = DISCOVER_SECTIONS[type];
  const results = useQueries({
    queries: sections.map((section) => discoverListQuery(section.list, type)),
  });
  const isInList = useLibraryMembership();
  const myProviderIds = useMyProviderIds();
  const listRef = useRef<FlatList<Row>>(null);
  useScrollToTop(listRef);
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      ...results.map((result) => result.refetch()),
      queryClient.refetchQueries({ queryKey: feedKey }),
    ]);
    setRefreshing(false);
  };

  const allFailed = results.every((result) => showsLoadError(result));
  const rows: Row[] = allFailed
    ? []
    : sections.flatMap((section, index) => {
        const result = results[index];
        return result ? [{ section, result }] : [];
      });

  return (
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={(row) => row.section.list}
      extraData={isInList}
      renderItem={({ item }) => (
        <CarouselSection
          section={item.section}
          result={item.result}
          isInList={isInList}
          myProviderIds={myProviderIds}
        />
      )}
      initialNumToRender={3}
      maxToRenderPerBatch={1}
      windowSize={5}
      ListHeaderComponent={
        <>
          {/* Tout en haut, avant les autres carrousels (specs/social/docs/04 §4.10). */}
          <ActivityCarousel />
          {allFailed ? <LoadError onRetry={() => void refresh()} /> : null}
        </>
      }
      ListFooterComponent={<GenreGrid type={type} />}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
    />
  );
}

type SectionProps = Row & {
  isInList: Membership;
  myProviderIds: readonly number[];
};

/** Section de 20 affiches ; masquée si vide ou en erreur. */
const CarouselSection = memo(function CarouselSection({
  section,
  result,
  isInList,
  myProviderIds,
}: SectionProps) {
  // Premier chargement, ou nouvelle tentative après une erreur.
  if (!result.data && (result.isPending || result.isFetching)) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>{section.title}</Text>
        <View style={styles.skeletonRow}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonPoster key={i} style={styles.poster} />
          ))}
        </View>
      </View>
    );
  }
  const titles = result.data ?? [];
  if (titles.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {section.title}
      </Text>
      <HorizontalCarousel
        data={titles}
        extraData={isInList}
        keyExtractor={(item) => item.id}
        // Affiches proches de l'écran seulement : 20 par carrousel sinon.
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        renderItem={(item) => (
          <CatalogPoster
            title={item}
            inList={isInList(item)}
            myProviderIds={myProviderIds}
            width={POSTER_WIDTH}
          />
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  section: {
    marginTop: spacing.discoverSectionGap,
  },
  title: {
    ...typography.section,
    color: colors.text,
    paddingHorizontal: spacing.screenX,
    marginBottom: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.carouselGap,
    paddingHorizontal: spacing.screenX,
    overflow: 'hidden',
  },
  poster: {
    width: POSTER_WIDTH,
  },
});
