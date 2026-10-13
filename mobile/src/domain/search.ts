/** Recherche — specs/docs/08 §8.1 et docs/04 (recherches récentes). */
import type { MediaType } from './types';

export type SearchTab = 'all' | MediaType | 'person';

export const SEARCH_TABS: readonly { key: SearchTab; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
  { key: 'person', label: 'Personnes' },
];

export const MAX_RECENT_SEARCHES = 6;
/** Délai entre la dernière frappe et la recherche. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Ajoute une requête en tête des récentes : sans doublon, 6 au plus. */
export function addRecentSearch(recents: readonly string[], query: string): string[] {
  const q = query.trim();
  if (!q) return [...recents];
  return [q, ...recents.filter((r) => r !== q)].slice(0, MAX_RECENT_SEARCHES);
}

export const TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Film',
  tv: 'Série',
  anime: 'Animé',
};

/** Sous-titre d'une ligne de titre : « 2026 · Film ». */
export function titleRowSubtitle(year: number | undefined, type: MediaType): string {
  return year ? `${year} · ${TYPE_LABELS[type]}` : TYPE_LABELS[type];
}

/** Sous-titre d'une ligne de personne : « Personne · Dune, Euphoria ». */
export function personRowSubtitle(knownFor: readonly string[]): string {
  const titles = knownFor.slice(0, 2).join(', ');
  return titles ? `Personne · ${titles}` : 'Personne';
}

/** « 1 résultat », « 1 240 résultats » (prototype : `advHeader`). */
export function resultsCountLabel(count: number): string {
  return `${count.toLocaleString('fr-CA')} résultat${count > 1 ? 's' : ''}`;
}
