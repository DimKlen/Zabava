/** Liste des plateformes : une seule entrée par service, les grands services d'abord, recherche. */
import type { Provider } from './types';

/** Une plateforme affichée et tous les identifiants TMDB qu'elle regroupe. */
export type ProviderGroup = Provider & { ids: readonly number[] };

/**
 * Grands services, du plus utilisé et du plus gros catalogue au moins : montrés par défaut
 * (clés de groupe). Les autres plateformes de la région restent trouvables par la recherche.
 */
const FEATURED = [
  'netflix',
  'amazon prime video',
  'disney plus',
  'hbo max',
  'crave',
  'canal plus',
  'apple tv',
  'paramount plus',
  'hulu',
  'peacock',
  'crunchyroll',
  'animation digital network',
  'icitoutv',
  'm6 plus',
  'arte',
  'youtube',
  'google play movies',
  'fandango at home',
  'mubi',
  'rakuten tv',
  'tubi tv',
  'pluto tv',
  'cbc gem',
];

/** Formule avec publicités (« Amazon Prime Video with Ads ») et services masqués (Cosmo Go). */
const HIDDEN = /\bwith ads$|^cosmo ?go$/i;

/** Sans grand service connu dans la région : les premières plateformes par priorité. */
const FALLBACK_COUNT = 12;

/** Boutique ou ancien nom d'un service déjà listé : une seule entrée (Amazon, Apple…). */
const ALIASES: Record<string, string> = {
  'amazon video': 'amazon prime video',
  'apple tv store': 'apple tv',
  'apple tv plus': 'apple tv',
  max: 'hbo max',
  'canal vod': 'canal plus',
};

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
const ownKey = (name: string) =>
  normalize(baseProviderName(name)).replace(/\+/g, ' plus').replace(/\s+/g, ' ').trim();

/** Clé du service : la boutique « Amazon Video » rejoint « Amazon Prime Video ». */
function groupKey(name: string): string {
  const key = ownKey(name);
  return ALIASES[key] ?? key;
}

/**
 * Une entrée par service, dans l'ordre reçu (priorité d'affichage). Le nom est le plus
 * simple ; le logo est celui de la version de base quand elle existe, sinon d'une version
 * qui n'est pas une revente.
 */
/** Pays où au moins une des offres propose le titre, sans doublon (ordre des codes). */
export function mergedCountries(providers: readonly Provider[]): string[] | undefined {
  const countries = new Set(providers.flatMap((provider) => provider.countries ?? []));
  return countries.size > 0 ? [...countries].sort() : undefined;
}

export function groupProviders(providers: readonly Provider[]): ProviderGroup[] {
  const groups = new Map<string, Provider[]>();
  for (const provider of providers) {
    if (HIDDEN.test(provider.name.trim())) continue;
    const key = groupKey(provider.name);
    groups.set(key, [...(groups.get(key) ?? []), provider]);
  }
  return [...groups].flatMap(([key, members]) => {
    const first = members[0];
    if (!first) return [];
    // Le service lui-même plutôt que sa boutique (« Amazon Prime Video », pas « Amazon Video »).
    const main = members.find((member) => ownKey(member.name) === key) ?? first;
    const name = baseProviderName(main.name);
    const logo =
      members.find((member) => member.name.trim() === name) ??
      members.find((member) => !RESELLER.test(member.name)) ??
      main;
    return [
      {
        ...logo,
        id: first.id,
        name,
        ids: members.map((member) => member.id),
        countries: mergedCountries(members),
      },
    ];
  });
}

/** Une plateforme est cochée dès qu'un de ses identifiants est dans le profil. */
export function isGroupSelected(group: ProviderGroup, selectedIds: readonly number[]): boolean {
  return group.ids.some((id) => selectedIds.includes(id));
}

/**
 * Grille par défaut : les grands services de la région dans l'ordre de `FEATURED`, puis
 * les plateformes déjà cochées ailleurs (pour pouvoir les retirer).
 */
export function featuredProviders(
  groups: readonly ProviderGroup[],
  selectedIds: readonly number[],
): ProviderGroup[] {
  const rank = (group: ProviderGroup) => FEATURED.indexOf(groupKey(group.name));
  const featured = groups.filter((group) => rank(group) >= 0).sort((a, b) => rank(a) - rank(b));
  const base = featured.length >= FALLBACK_COUNT / 2 ? featured : groups.slice(0, FALLBACK_COUNT);
  const selected = groups.filter(
    (group) => !base.includes(group) && isGroupSelected(group, selectedIds),
  );
  return [...base, ...selected];
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
