import { CaretLeftIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePerson, type PersonDetail } from '@/api/discover';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { PosterGrid } from '@/components/PosterGrid';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import {
  birthLine,
  filmography,
  generatedBiography,
  type FilmographySort,
  type FilmographyTab,
} from '@/domain/person';
import { goBack } from '@/lib/navigation';
import { colors, radii } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { LazyBadgePoster } from '../catalog/CatalogPoster';
import { GridSkeleton } from '../catalog/GridSkeleton';
import { PersonAvatar } from '../catalog/PersonAvatar';
import { useLibraryMembership, useMyProviderIds } from '../catalog/useLibraryMembership';
import { personPreview, type PersonPreview } from './openPerson';
import { PersonBio } from './PersonBio';

const TABS = [
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
] as const;

const SORTS: readonly { key: FilmographySort; label: string }[] = [
  { key: 'pop', label: 'Popularité' },
  { key: 'recent', label: 'Plus récent' },
];

/** Fiche personne (specs/docs/07 §7.3) : identité, biographie, filmographie. */
export function PersonScreen({ id }: { id: number }) {
  const insets = useSafeAreaInsets();
  const query = usePerson(id);

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
      </View>
      {!query.data && showsLoadError(query) ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : (
        <PersonContent person={query.data} preview={personPreview(id)} />
      )}
    </View>
  );
}

/**
 * Même écran du tap à la fiche complète : la photo et le nom (déjà connus par le casting,
 * l'équipe ou la recherche) restent en place, le reste arrive à la place des squelettes.
 */
function PersonContent({ person, preview }: { person?: PersonDetail; preview?: PersonPreview }) {
  const [tab, setTab] = useState<FilmographyTab>('movie');
  const [sort, setSort] = useState<FilmographySort>('pop');
  const titles = person ? filmography(person.credits, tab, sort) : [];
  const isInList = useLibraryMembership();
  const myProviderIds = useMyProviderIds();
  const name = person?.name ?? preview?.name;
  const biography = person
    ? (person.biography ?? generatedBiography(person.name, person.gender, person.roles))
    : undefined;

  const identity = (
    <View style={styles.identity}>
      {name !== undefined ? (
        <PersonAvatar
          name={name}
          profilePath={person?.profilePath ?? preview?.profilePath}
          size={96}
        />
      ) : (
        <SkeletonBox width={96} height={96} radius={48} />
      )}
      <View style={styles.identityText}>
        {name !== undefined ? (
          <Text accessibilityRole="header" style={styles.name}>
            {name}
          </Text>
        ) : (
          <SkeletonBox width="70%" height={24} radius={radii.rXs} />
        )}
        {person ? (
          <Text style={styles.born}>
            {birthLine(person.gender, person.birthday, person.placeOfBirth)}
          </Text>
        ) : (
          <SkeletonBox width="90%" height={13} radius={radii.rXs} style={styles.skeletonLine} />
        )}
      </View>
    </View>
  );

  if (!person) {
    return (
      <PosterGrid
        data={[]}
        renderPoster={() => <View />}
        // Même structure d'en-tête qu'une fois la fiche reçue : la photo n'est pas remontée.
        ListHeaderComponent={<View>{identity}</View>}
        ListHeaderComponentStyle={styles.header}
        ListEmptyComponent={<GridSkeleton paddingTop={12} />}
      />
    );
  }

  const header = (
    <View>
      {identity}
      {biography ? <PersonBio text={biography} /> : null}
      <Text accessibilityRole="header" style={styles.filmography}>
        Filmographie
      </Text>
      <View style={styles.controls}>
        <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} style={styles.tabs} />
        <View style={styles.sorts}>
          {SORTS.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              active={sort === option.key}
              onPress={() => setSort(option.key)}
              height={28}
            />
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <PosterGrid
      data={titles}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ListHeaderComponentStyle={styles.header}
      paddingBottom={40}
      extraData={isInList}
      renderPoster={(item, width) => (
        <LazyBadgePoster
          title={item}
          inList={isInList(item)}
          myProviderIds={myProviderIds}
          width={width}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>Aucun titre dans cette catégorie.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bar: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  header: {
    marginBottom: 12,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  identityText: {
    flex: 1,
  },
  skeletonLine: {
    marginTop: 8,
  },
  name: {
    ...typography.titleXL,
    color: colors.text,
    marginBottom: 4,
  },
  born: {
    ...typography.meta,
    color: colors.neutral400,
  },
  filmography: {
    ...typography.section,
    color: colors.text,
    marginTop: 16,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabs: {
    paddingHorizontal: 0,
  },
  sorts: {
    flexDirection: 'row',
    gap: 6,
  },
  empty: {
    paddingVertical: 24,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.neutral400,
  },
});
