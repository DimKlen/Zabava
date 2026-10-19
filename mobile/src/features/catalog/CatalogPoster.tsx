import { memo } from 'react';

import { useBadgeData, type BadgeData } from '@/api/badges';
import type { PosterTitle } from '@/api/catalog';
import type { CatalogTitle } from '@/api/discover';
import { toggleInList, withLibraryType, type ListTitle } from '@/api/libraryActions';
import { Poster } from '@/components/Poster';
import { posterBadge } from '@/domain/badge';
import { openTitle, pressTitle, previewOf } from '../title/openTitle';

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

type Props = {
  title: CatalogTitle;
  /** Données de badge chargées à part (filmographie) ; sinon celles jointes au titre. */
  badge?: BadgeData | null;
  inList: boolean;
  myProviderIds: readonly number[];
  width: number;
};

/**
 * Affiche du catalogue (Découvrir, genre, personne, recherche avancée) : badge de
 * disponibilité, « + » d'ajout rapide, tap → fiche. Mémoïsée : une grille redessinée
 * (ajout à Ma liste, page suivante) ne redessine que les affiches qui changent.
 */
export const CatalogPoster = memo(function CatalogPoster({
  title,
  badge = title.badge,
  inList,
  myProviderIds,
  width,
}: Props) {
  const posterBadgeValue = badge
    ? posterBadge({ type: title.type, ...badge }, myProviderIds, new Date())
    : null;
  return (
    <Poster
      title={title}
      badge={posterBadgeValue}
      showAdd
      inList={inList}
      onPress={() => openTitle(previewOf(title, 'w342'))}
      onPressIn={() => pressTitle(previewOf(title, 'w342'))}
      onToggle={() => toggleInList(toListTitle(title, badge))}
      style={{ width }}
    />
  );
});

/** Affiche dont le badge est chargé par lots (`GET /titles/badges`) : filmographie. */
export const LazyBadgePoster = memo(function LazyBadgePoster(props: Omit<Props, 'badge'>) {
  const badge = useBadgeData(props.title.id).data;
  return <CatalogPoster {...props} badge={badge} />;
});
