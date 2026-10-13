import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useScrollToTop } from 'expo-router';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { discoverListQuery, type CatalogTitle } from '@/api/discover';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { LoadError } from '@/components/LoadError';
import { SkeletonPoster } from '@/components/Skeleton';
import { DISCOVER_SECTIONS, type DiscoverSection } from '@/domain/discover';
import type { MediaType } from '@/domain/types';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { CatalogPoster } from '../catalog/CatalogPoster';
import { GenreGrid } from './GenreGrid';

const POSTER_WIDTH = 112;
const SKELETON_COUNT = 4;

/** Contenu d'un onglet de Découvrir : carrousels puis Par genre. */
export function DiscoverTab({ type }: { type: MediaType }) {
  const sections = DISCOVER_SECTIONS[type];
  const results = useQueries({
    queries: sections.map((section) => discoverListQuery(section.list, type)),
  });
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all(results.map((result) => result.refetch()));
    setRefreshing(false);
  };

  const allFailed = results.every((result) => result.isError);

  return (
    <ScrollView
      ref={scrollRef}
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
    >
      {allFailed ? (
        <LoadError onRetry={() => void refresh()} />
      ) : (
        sections.map((section, index) => {
          const result = results[index];
          return result ? (
            <CarouselSection key={section.list} section={section} result={result} />
          ) : null;
        })
      )}
      <GenreGrid type={type} />
    </ScrollView>
  );
}

type SectionProps = {
  section: DiscoverSection;
  result: UseQueryResult<CatalogTitle[]>;
};

/** Section de 20 affiches ; masquée si vide ou en erreur. */
function CarouselSection({ section, result }: SectionProps) {
  if (result.isPending) {
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
        keyExtractor={(item) => item.id}
        initialNumToRender={4}
        renderItem={(item) => <CatalogPoster title={item} style={styles.poster} />}
      />
    </View>
  );
}

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
