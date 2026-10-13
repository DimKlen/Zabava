import { router } from 'expo-router';
import { MagnifyingGlassIcon, SlidersHorizontalIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toggleInList } from '@/api/libraryActions';
import type { PersonResult, TitleResult } from '@/api/search';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { defaultFilters, type AdvancedFilters } from '@/domain/advancedSearch';
import { SEARCH_DEBOUNCE_MS, type SearchTab } from '@/domain/search';
import { useRecentSearches } from '@/store/recentSearches';
import { colors } from '@/theme/tokens';

import { toListTitle } from '../catalog/CatalogPoster';
import { useLibraryMembership } from '../catalog/useLibraryMembership';
import { AdvancedResults } from './AdvancedResults';
import { AdvancedSearchSheet } from './AdvancedSearchSheet';
import { SearchIdle } from './SearchIdle';
import { SearchResults } from './SearchResults';

/**
 * Recherche (specs/docs/08 §8.1). Requête, onglet et filtres avancés vivent le temps
 * de l'écran ; seules les recherches récentes sont persistées.
 */
export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');
  const [filters, setFilters] = useState<AdvancedFilters>(() => defaultFilters(new Date()));
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const addRecent = useRecentSearches((s) => s.add);
  const isInList = useLibraryMembership();
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const field = useRef<TextInput>(null);

  useEffect(() => () => clearTimeout(debounce.current), []);

  const changeText = (value: string) => {
    setText(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(value.trim()), SEARCH_DEBOUNCE_MS);
  };

  /** Recherche immédiate : récente choisie, ou validation au clavier. */
  const searchNow = (value: string) => {
    clearTimeout(debounce.current);
    setText(value);
    setQuery(value.trim());
  };

  const remember = () => addRecent(text);

  const openTitle = (title: TitleResult) => {
    remember();
    router.push(`/title/${title.type}/${title.tmdbId}`);
  };
  const openPerson = (person: PersonResult) => {
    remember();
    router.push(`/person/${person.id}`);
  };
  const toggleTitle = (title: TitleResult) => toggleInList(toListTitle(title));

  const openSheet = () => {
    // Sans focus : Android rouvrirait le clavier sur les résultats à la fermeture de la sheet.
    field.current?.blur();
    setSheetOpen(true);
  };
  const apply = () => {
    setAppliedFilters(filters);
    setSheetOpen(false);
  };

  let body;
  if (appliedFilters) {
    body = (
      <AdvancedResults
        filters={appliedFilters}
        onEdit={openSheet}
        onExit={() => setAppliedFilters(null)}
      />
    );
  } else if (!text.trim()) {
    body = (
      <SearchIdle
        onPickRecent={searchNow}
        onOpenTitle={openTitle}
        onToggleTitle={toggleTitle}
        isInList={isInList}
      />
    );
  } else {
    body = (
      <SearchResults
        query={query}
        typing={text.trim() !== query}
        tab={tab}
        onChangeTab={setTab}
        onOpenTitle={openTitle}
        onToggleTitle={toggleTitle}
        isInList={isInList}
        onOpenPerson={openPerson}
        onAdvanced={openSheet}
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <TextField
          ref={field}
          height={42}
          icon={MagnifyingGlassIcon}
          value={text}
          onChangeText={changeText}
          onSubmitEditing={() => {
            searchNow(text);
            remember();
          }}
          placeholder="Titre, acteur, actrice…"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Rechercher"
          style={styles.field}
        />
        <Button
          variant="icon"
          bordered
          height={42}
          icon={SlidersHorizontalIcon}
          iconSize={18}
          color={colors.text}
          accessibilityLabel="Filtres"
          onPress={openSheet}
        />
        <Button
          variant="ghost"
          height={42}
          label="Annuler"
          onPress={() => router.back()}
          style={styles.cancel}
        />
      </View>
      {body}
      <AdvancedSearchSheet
        visible={sheetOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setSheetOpen(false)}
        onApply={apply}
      />
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
    gap: 8,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 16,
  },
  field: {
    flex: 1,
  },
  cancel: {
    paddingHorizontal: 8,
  },
});
