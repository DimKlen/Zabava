import { router } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';

import { useBadgeData, type BadgeData } from '@/api/badges';
import type { PosterTitle } from '@/api/catalog';
import { toggleInList, withLibraryType, type ListTitle } from '@/api/libraryActions';
import { useProfile } from '@/api/profile';
import { Poster } from '@/components/Poster';
import { posterBadge } from '@/domain/badge';

import { useInList } from './useLibraryMembership';

type Props = {
  title: PosterTitle;
  style?: StyleProp<ViewStyle>;
};

/** Ce qu'il faut pour ajouter le titre à Ma liste avec son badge. */
export function toListTitle(title: PosterTitle, badge?: BadgeData | null): ListTitle {
  return withLibraryType({
    id: title.id,
    tmdbId: title.tmdbId,
    type: title.type,
    title: title.title,
    posterPath: title.posterPath,
    releaseTheatrical: badge?.releaseTheatrical,
    availability: badge?.availability,
    network: badge?.network,
    ended: badge?.ended,
  });
}

/**
 * Affiche du catalogue (Découvrir, genre, personne, recherche avancée) : badge de
 * disponibilité, « + » d'ajout rapide, tap → fiche.
 */
export function CatalogPoster({ title, style }: Props) {
  const inList = useInList(title);
  const badgeData = useBadgeData(title.id).data;
  const myProviderIds = useProfile().data?.providerIds ?? [];
  const badge = badgeData
    ? posterBadge({ type: title.type, ...badgeData }, myProviderIds, new Date())
    : null;

  return (
    <Poster
      title={title}
      badge={badge}
      showAdd
      inList={inList}
      onPress={() => router.push(`/title/${title.type}/${title.tmdbId}`)}
      onToggle={() => toggleInList(toListTitle(title, badgeData))}
      style={style}
    />
  );
}
