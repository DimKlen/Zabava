import { CaretLeftIcon, FilmStripIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flattenPages, useGenreTitles } from '@/api/discover';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { PosterGrid } from '@/components/PosterGrid';
import { Text } from '@/components/Text';
import { genreCountLabel, genreLabel, type GenreKey } from '@/domain/advancedSearch';
import type { MediaType } from '@/domain/types';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { CatalogPoster } from '../catalog/CatalogPoster';
import { GridSkeleton, GridFooter } from '../catalog/GridSkeleton';
import { useLibraryMembership, useMyProviderIds } from '../catalog/useLibraryMembership';

type Props = { type: MediaType; genre: GenreKey };

/** Liste par genre (specs/docs/07 §7.4) : populaires d'abord, chargement infini. */
export function GenreScreen({ type, genre }: Props) {
  const insets = useSafeAreaInsets();
  const query = useGenreTitles(type, genre);
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

const styles = StyleSheet.create({
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
