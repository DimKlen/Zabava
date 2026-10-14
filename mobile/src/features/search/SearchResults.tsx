import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { FlatList, StyleSheet, View } from 'react-native';

import { searchRows, useSearch, type PersonResult, type TitleResult } from '@/api/search';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { SkeletonSearchRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { SEARCH_TABS, type SearchTab } from '@/domain/search';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import type { Membership } from '../catalog/useLibraryMembership';
import { PersonRow, TitleRow } from './ResultRows';

const SKELETON_ROWS = 3;

type Props = {
  /** Requête envoyée (après le délai de frappe). */
  query: string;
  /** La saisie diffère de la requête : on attend la fin de la frappe. */
  typing: boolean;
  tab: SearchTab;
  onChangeTab: (tab: SearchTab) => void;
  onOpenTitle: (title: TitleResult) => void;
  onToggleTitle: (title: TitleResult) => void;
  onOpenPerson: (person: PersonResult) => void;
  onAdvanced: () => void;
  isInList: Membership;
};

/** Recherche avec saisie : onglets, résultats paginés, squelettes, état sans résultat. */
export function SearchResults({
  query,
  typing,
  tab,
  onChangeTab,
  onOpenTitle,
  onToggleTitle,
  onOpenPerson,
  onAdvanced,
  isInList,
}: Props) {
  const search = useSearch(query, tab);
  const rows = searchRows(search.data?.pages);

  let body;
  if (typing || (!search.data && !showsLoadError(search))) {
    body = (
      <View style={styles.skeletons}>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <SkeletonSearchRow key={i} />
        ))}
      </View>
    );
  } else if (showsLoadError(search)) {
    body = <LoadError onRetry={() => void search.refetch()} />;
  } else if (rows.length === 0) {
    body = (
      <View style={styles.none}>
        <MagnifyingGlassIcon size={36} color={colors.neutral600} />
        <Text style={styles.noneText}>Aucun résultat pour «&nbsp;{query}&nbsp;»</Text>
        <Button
          variant="primary"
          height={44}
          label="Essayer la recherche avancée"
          onPress={onAdvanced}
          style={styles.noneButton}
        />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        // Les lignes dépendent aussi de Ma liste (coche du « + »).
        extraData={isInList}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          search.isFetchingNextPage ? (
            <View style={styles.skeletons}>
              <SkeletonSearchRow />
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          item.kind === 'person' ? (
            <PersonRow person={item.person} onPress={() => onOpenPerson(item.person)} />
          ) : (
            <TitleRow
              title={item.title}
              inList={isInList(item.title)}
              onPress={() => onOpenTitle(item.title)}
              onToggle={() => onToggleTitle(item.title)}
            />
          )
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <UnderlineTabs tabs={SEARCH_TABS} value={tab} onChange={onChangeTab} variant="search" />
      </View>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletons: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  list: {
    paddingTop: 6,
    paddingBottom: 40,
  },
  none: {
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  noneText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
  noneButton: {
    marginTop: 6,
  },
});
