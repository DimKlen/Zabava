import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { flattenPages, useAdvancedResults } from '@/api/discover';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { PosterGrid } from '@/components/PosterGrid';
import { Text } from '@/components/Text';
import type { AdvancedFilters } from '@/domain/advancedSearch';
import { sortResults, type ResultOrder } from '@/domain/resultSort';
import { resultsCountLabel } from '@/domain/search';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { CatalogPoster } from '../catalog/CatalogPoster';
import { GridFooter, GridSkeleton } from '../catalog/GridSkeleton';
import { useLibraryMembership, useMyProviderIds } from '../catalog/useLibraryMembership';
import { ResultSortBar } from './ResultSortBar';

type Props = {
  filters: AdvancedFilters;
  order: ResultOrder;
  onOrderChange: (order: ResultOrder) => void;
  onEdit: () => void;
  onExit: () => void;
};

/** Mode « recherche avancée appliquée » : en-tête, grille d'affiches, chargement infini. */
export function AdvancedResults({ filters, order, onOrderChange, onEdit, onExit }: Props) {
  const results = useAdvancedResults(filters, true);
  const isInList = useLibraryMembership();
  const myProviderIds = useMyProviderIds();
  const pages = results.data?.pages;
  const titles = useMemo(() => sortResults(flattenPages(pages), order), [pages, order]);
  const total = results.data?.pages[0]?.total;

  let body;
  if (showsLoadError(results)) {
    body = <LoadError onRetry={() => void results.refetch()} />;
  } else if (!results.data) {
    body = <GridSkeleton paddingTop={4} />;
  } else {
    body = (
      <PosterGrid
        data={titles}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        paddingTop={4}
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
          if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={results.isFetchingNextPage ? <GridFooter /> : null}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun titre ne correspond à ces filtres.</Text>
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recherche avancée</Text>
          {total !== undefined ? (
            <Text style={styles.count}>{resultsCountLabel(total)}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button variant="ghost" height={36} label="Modifier" onPress={onEdit} />
          <Button
            variant="ghost"
            height={36}
            label="Effacer"
            color={colors.neutral400}
            onPress={onExit}
          />
        </View>
      </View>
      <ResultSortBar order={order} onChange={onOrderChange} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  empty: {
    paddingVertical: 32,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.neutral400,
  },
});
