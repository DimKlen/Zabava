import { CaretLeftIcon, FilmStripIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flattenPages, useStudioTitles } from '@/api/discover';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { PosterGrid } from '@/components/PosterGrid';
import { Text } from '@/components/Text';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { CatalogPoster } from '../catalog/CatalogPoster';
import { GridFooter, GridSkeleton } from '../catalog/GridSkeleton';
import { useLibraryMembership, useMyProviderIds } from '../catalog/useLibraryMembership';

type Props = { id: number; name: string };

/** Autres animés d'un studio, les plus pertinents (populaires) d'abord, chargement infini. */
export function StudioScreen({ id, name }: Props) {
  const insets = useSafeAreaInsets();
  const query = useStudioTitles(id);
  const isInList = useLibraryMembership();
  const myProviderIds = useMyProviderIds();
  const titles = flattenPages(query.data?.pages);

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
        <Text accessibilityRole="header" style={styles.title}>
          {name}
        </Text>
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
              <Text style={styles.emptyText}>Aucun animé pour ce studio pour l&apos;instant</Text>
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
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
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
