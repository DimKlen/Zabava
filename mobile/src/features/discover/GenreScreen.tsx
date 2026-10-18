import { CaretLeftIcon, FilmStripIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flattenPages, useGenreTitles } from '@/api/discover';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { PosterGrid } from '@/components/PosterGrid';
import { Text } from '@/components/Text';
import {
  DEFAULT_GENRE_FILTERS,
  GENRE_MIN_RATING,
  GENRE_SORTS,
  genreCountLabel,
  genreLabel,
  type GenreFilters,
  type GenreKey,
} from '@/domain/advancedSearch';
import type { MediaType } from '@/domain/types';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { CatalogPoster } from '../catalog/CatalogPoster';
import { GridSkeleton, GridFooter } from '../catalog/GridSkeleton';
import { useLibraryMembership, useMyProviderIds } from '../catalog/useLibraryMembership';

type Props = { type: MediaType; genre: GenreKey };

/** Liste par genre (specs/docs/07 §7.4) : tri et filtres, plus récents d'abord, chargement infini. */
export function GenreScreen({ type, genre }: Props) {
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<GenreFilters>(DEFAULT_GENRE_FILTERS);
  const query = useGenreTitles(type, genre, filters);
  const isInList = useLibraryMembership();
  const myProviderIds = useMyProviderIds();
  const titles = flattenPages(query.data?.pages);
  const total = query.data?.pages[0]?.total;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Button
          variant="icon"
          height={44}
          icon={CaretLeftIcon}
          iconSize={22}
          color={colors.text}
          accessibilityLabel="Retour"
          onPress={goBack}
        />
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {genreLabel(genre)}
          </Text>
          {total !== undefined ? (
            <Text style={styles.count}>{genreCountLabel(total, type)}</Text>
          ) : null}
        </View>
      </View>
      <GenreFilterChips filters={filters} onChange={setFilters} />
      {showsLoadError(query) ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <GridSkeleton paddingTop={8} />
      ) : (
        <PosterGrid
          data={titles}
          keyExtractor={(item) => item.id}
          paddingTop={8}
          paddingBottom={40}
          extraData={isInList}
          renderPoster={(item, width) => (
            <CatalogPoster
              title={item}
              inList={isInList(item)}
              myProviderIds={myProviderIds}
              width={width}
            />
          )}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={query.isFetchingNextPage ? <GridFooter /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FilmStripIcon size={40} color={colors.neutral600} />
              <Text style={styles.emptyText}>Aucun titre dans ce genre pour l&apos;instant</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

/** Tri (un seul actif) puis filtres (bascules). */
function GenreFilterChips({
  filters,
  onChange,
}: {
  filters: GenreFilters;
  onChange: (filters: GenreFilters) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      style={styles.chipsRow}
    >
      {GENRE_SORTS.map((sort) => (
        <Chip
          key={sort.key}
          label={sort.label}
          active={filters.sort === sort.key}
          onPress={() => onChange({ ...filters, sort: sort.key })}
        />
      ))}
      <View style={styles.divider} />
      <Chip
        label="Sur mes plateformes"
        active={filters.mine}
        onPress={() => onChange({ ...filters, mine: !filters.mine })}
      />
      <Chip
        label={`Note ${GENRE_MIN_RATING}+`}
        active={filters.minRating > 0}
        onPress={() =>
          onChange({ ...filters, minRating: filters.minRating > 0 ? 0 : GENRE_MIN_RATING })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexGrow: 0,
  },
  chips: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.neutral800,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
  empty: {
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 8,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
});
