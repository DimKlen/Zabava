import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { FlatList, StyleSheet, View } from 'react-native';

import { searchRows, useSearch, type PersonResult, type TitleResult } from '@/api/search';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { SkeletonSearchRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import type { ResultOrder } from '@/domain/resultSort';
import { SEARCH_TABS, type SearchTab } from '@/domain/search';
import { searchQuery } from '@/domain/social/username';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import type { Membership } from '../catalog/useLibraryMembership';
import { MemberResults } from './MemberResults';
import { PersonRow, TitleRow } from './ResultRows';
import { ResultSortBar } from './ResultSortBar';
import { pressTitle, previewOf } from '../title/openTitle';
import { pressPerson } from '../person/openPerson';

const SKELETON_ROWS = 3;

type Props = {
  /** Requête envoyée (après le délai de frappe). */
  query: string;
  /** La saisie diffère de la requête : on attend la fin de la frappe. */
  typing: boolean;
  tab: SearchTab;
  order: ResultOrder;
  onOrderChange: (order: ResultOrder) => void;
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
  order,
  onOrderChange,
  onChangeTab,
  onOpenTitle,
  onToggleTitle,
  onOpenPerson,
  onAdvanced,
  isInList,
}: Props) {
  const members = tab === 'members';
  // Onglet Membres : pas de recherche du catalogue.
  const search = useSearch(members ? '' : query, members ? 'all' : tab);
  const rows = searchRows(search.data?.pages, order);

  // Le tri ne concerne que les résultats du catalogue, pas les membres ni les personnes seules.
  const showsSort = tab !== 'members' && tab !== 'person' && rows.length > 0 && !typing;

  let body;
  if (members) {
    body = <MemberResults query={searchQuery(query)} typing={typing} />;
  } else if (typing || (!search.data && !showsLoadError(search))) {
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
            <PersonRow
              person={item.person}
              onPress={() => onOpenPerson(item.person)}
              onPressIn={() => pressPerson(item.person)}
            />
          ) : (
            <TitleRow
              title={item.title}
              inList={isInList(item.title)}
              onPress={() => onOpenTitle(item.title)}
              onPressIn={() => pressTitle(previewOf(item.title, 'w92'))}
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
      {showsSort ? <ResultSortBar order={order} onChange={onOrderChange} /> : null}
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
