/** Liste des plateformes : une seule entrée par service, les plus connues, et recherche par nom. */
import type { Provider } from './types';

/** Une plateforme affichée et tous les identifiants TMDB qu'elle regroupe. */
export type ProviderGroup = Provider & { ids: readonly number[] };

/** Plateformes proposées dans la grille (les plus connues de la région). */
export const TOP_PROVIDERS = 50;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Revente d'un service par une autre boutique : « AMC+ Amazon Channel ». */
const RESELLER =
  /\s+(amazon channel|apple tv channel|roku premium channel|youtube primetime channel)$/i;
/** Formules d'un même service : « Paramount Plus Premium », « Peacock Premium Plus ». */
const TIER =
  /\s+(premium plus|premium|essential|standard with ads|basic with ads|with ads|kids|free)$/i;

/** Nom sans revendeur ni formule, casse d'origine : « Paramount Plus Essential » → « Paramount Plus ». */
export function baseProviderName(name: string): string {
  let base = name.trim();
  for (let previous = ''; previous !== base;) {
    previous = base;
    base = base.replace(RESELLER, '').replace(TIER, '').trim();
  }
  return base === '' ? name.trim() : base;
}

/** « Paramount+ » et « Paramount Plus » sont le même service. */
const groupKey = (name: string) =>
  normalize(baseProviderName(name)).replace(/\+/g, ' plus').replace(/\s+/g, ' ').trim();

/**
 * Une entrée par service, dans l'ordre reçu (priorité d'affichage). Le nom est le plus
 * simple ; le logo est celui de la version de base quand elle existe, sinon d'une version
 * qui n'est pas une revente.
 */
export function groupProviders(providers: readonly Provider[]): ProviderGroup[] {
  const groups = new Map<string, Provider[]>();
  for (const provider of providers) {
    const key = groupKey(provider.name);
    groups.set(key, [...(groups.get(key) ?? []), provider]);
  }
  return [...groups.values()].flatMap((members) => {
    const first = members[0];
    if (!first) return [];
    const name = baseProviderName(first.name);
    const logo =
      members.find((member) => member.name.trim() === name) ??
      members.find((member) => !RESELLER.test(member.name)) ??
      first;
    return [{ ...logo, id: first.id, name, ids: members.map((member) => member.id) }];
  });
}

/** Une plateforme est cochée dès qu'un de ses identifiants est dans le profil. */
export function isGroupSelected(group: ProviderGroup, selectedIds: readonly number[]): boolean {
  return group.ids.some((id) => selectedIds.includes(id));
}

/** Les plus connues, plus celles déjà cochées plus bas dans la liste (pour pouvoir les retirer). */
export function topProviders(
  groups: readonly ProviderGroup[],
  selectedIds: readonly number[],
  limit = TOP_PROVIDERS,
): ProviderGroup[] {
  return groups.filter((group, index) => index < limit || isGroupSelected(group, selectedIds));
}

/** Coche tout le groupe, ou le retire en entier s'il était coché. */
export function toggleGroup(selectedIds: readonly number[], group: ProviderGroup): number[] {
  if (isGroupSelected(group, selectedIds)) {
    return selectedIds.filter((id) => !group.ids.includes(id));
  }
  return [...selectedIds, ...group.ids.filter((id) => !selectedIds.includes(id))];
}

/** Filtre par nom, sans accents ni casse ; une requête vide garde tout. */
export function searchProviders<T extends Provider>(providers: readonly T[], query: string): T[] {
  const needle = normalize(query);
  if (needle === '') return [...providers];
  return providers.filter((provider) => normalize(provider.name).includes(needle));
}
