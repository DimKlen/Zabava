/** Recherche — specs/docs/08 §8.1 et docs/04 (recherches récentes). */
import { t } from '@/i18n';
import { tPlural } from '@/lib/plural';

import type { MediaType } from './types';

/** `members` : membres de Zabava (specs/social/docs/04 §4.6) ; « Tout » n'en contient pas. */
export type SearchTab = 'all' | MediaType | 'person' | 'members';
/** Onglets de la recherche du catalogue (`GET /search`). */
export type CatalogTab = Exclude<SearchTab, 'members'>;

export const SEARCH_TABS: readonly { key: SearchTab; label: string }[] = (
  ['all', 'movie', 'tv', 'anime', 'person', 'members'] as const
).map((key) => ({
  key,
  get label() {
    return t(`common.searchTab.${key}`);
  },
}));

/** « @ » en premier caractère : la recherche passe sur Membres. */
export function tabForInput(tab: SearchTab, text: string): SearchTab {
  return text.startsWith('@') ? 'members' : tab;
}

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
  get movie() {
    return t('common.type.movie');
  },
  get tv() {
    return t('common.type.tv');
  },
  get anime() {
    return t('common.type.anime');
  },
};

/** Sous-titre d'une ligne de titre : « 2026 · Film ». */
export function titleRowSubtitle(year: number | undefined, type: MediaType): string {
  return year ? `${year} · ${TYPE_LABELS[type]}` : TYPE_LABELS[type];
}

/** Sous-titre d'une ligne de personne : « Personne · Dune, Euphoria ». */
export function personRowSubtitle(knownFor: readonly string[]): string {
  const titles = knownFor.slice(0, 2).join(', ');
  return titles ? t('common.person.knownFor', { titles }) : t('common.person.label');
}

/** « 1 résultat », « 1 240 résultats » (prototype : `advHeader`). */
export function resultsCountLabel(count: number): string {
  return tPlural('common.results', count);
}
