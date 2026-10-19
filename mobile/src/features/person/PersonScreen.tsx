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
      {query.data ? (
        <PersonContent person={query.data} />
      ) : showsLoadError(query) ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : (
        <PersonSkeleton preview={personPreview(id)} />
      )}
    </View>
  );
}

function PersonContent({ person }: { person: PersonDetail }) {
  const [tab, setTab] = useState<FilmographyTab>('movie');
  const [sort, setSort] = useState<FilmographySort>('pop');
  const titles = filmography(person.credits, tab, sort);
  const isInList = useLibraryMembership();
  const myProviderIds = useMyProviderIds();
  const biography =
    person.biography ?? generatedBiography(person.name, person.gender, person.roles);

  const header = (
    <View>
      <View style={styles.identity}>
        <PersonAvatar name={person.name} profilePath={person.profilePath} size={96} />
        <View style={styles.identityText}>
          <Text accessibilityRole="header" style={styles.name}>
            {person.name}
          </Text>
          <Text style={styles.born}>
            {birthLine(person.gender, person.birthday, person.placeOfBirth)}
          </Text>
        </View>
      </View>
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

/**
 * Chargement. Ouverte depuis un nom (casting, équipe, recherche), la fiche montre tout de
 * suite la photo et le nom déjà connus ; le reste est en squelette.
 */
function PersonSkeleton({ preview }: { preview?: PersonPreview }) {
  return (
    <View>
      <View style={[styles.identity, styles.skeletonIdentity]}>
        {preview ? (
          <PersonAvatar name={preview.name} profilePath={preview.profilePath} size={96} />
        ) : (
          <SkeletonBox width={96} height={96} radius={48} />
        )}
        <View style={styles.identityText}>
          {preview ? (
            <Text accessibilityRole="header" style={styles.name}>
              {preview.name}
            </Text>
          ) : (
            <SkeletonBox width="70%" height={24} radius={radii.rXs} />
          )}
          <SkeletonBox width="90%" height={13} radius={radii.rXs} style={styles.skeletonLine} />
        </View>
      </View>
      <GridSkeleton paddingTop={24} />
    </View>
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
  skeletonIdentity: {
    paddingHorizontal: 16,
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
