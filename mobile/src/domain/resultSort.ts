/** Tri des résultats de recherche (classique et avancée), sur le modèle du tri de la liste de films. */

export type ResultSort = 'relevance' | 'release' | 'rating';

export const RESULT_SORTS: readonly { value: ResultSort; label: string }[] = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'release', label: 'Date de sortie' },
  { value: 'rating', label: 'Mieux notés' },
];

export type ResultOrder = { sort: ResultSort; reversed: boolean };

/** Par défaut : les plus pertinents d'abord. */
export const DEFAULT_RESULT_ORDER: ResultOrder = { sort: 'relevance', reversed: false };

/** Libellés du sens de chaque tri : [sens par défaut, sens inversé]. */
const DIRECTION_LABELS: Record<ResultSort, readonly [string, string]> = {
  relevance: ['Plus pertinents', 'Moins pertinents'],
  release: ['Plus récents', 'Plus anciens'],
  rating: ['Mieux notés', 'Moins bien notés'],
};

export function resultDirectionLabel(sort: ResultSort, reversed: boolean): string {
  return DIRECTION_LABELS[sort][reversed ? 1 : 0];
}

export type Sortable = { year?: number; releaseDate?: string; voteAverage?: number };

/** Date de sortie, sinon 1er janvier de l'année ; `undefined` sans aucune date. */
function releaseKey(item: Sortable): number | undefined {
  if (item.releaseDate) {
    const time = new Date(item.releaseDate).getTime();
    if (!Number.isNaN(time)) return time;
  }
  return item.year ? Date.UTC(item.year, 0, 1) : undefined;
}

function ratingKey(item: Sortable): number | undefined {
  return item.voteAverage && item.voteAverage > 0 ? item.voteAverage : undefined;
}

/**
 * Trie les résultats. La pertinence est l'ordre reçu (inversé : du dernier au premier) ; la date et la
 * note vont du plus haut au plus bas (inversé : l'inverse). Le tri est stable, et les titres sans date
 * ou sans note restent à la fin dans les deux sens.
 */
export function sortResults<T extends Sortable>(
  items: readonly T[],
  { sort, reversed }: ResultOrder,
): T[] {
  if (sort === 'relevance') return reversed ? [...items].reverse() : [...items];
  const key = sort === 'release' ? releaseKey : ratingKey;
  const sign = reversed ? 1 : -1;
  return items
    .map((item, index) => ({ item, index, value: key(item) }))
    .sort((a, b) => {
      if (a.value === undefined || b.value === undefined) {
        if (a.value === b.value) return a.index - b.index;
        return a.value === undefined ? 1 : -1;
      }
      return sign * (a.value - b.value) || a.index - b.index;
    })
    .map(({ item }) => item);
}
