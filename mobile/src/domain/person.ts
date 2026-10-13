/** Fiche personne — specs/docs/07 §7.3. */
import type { MediaType } from './types';

/** Genre TMDB : 1 = femme, 2 = homme, 0 ou 3 = inconnu / non binaire. */
export type TmdbGender = number | undefined;

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Pays de naissance TMDB (en anglais) → français. Inconnu : laissé tel quel. */
const COUNTRIES: Record<string, string> = {
  USA: 'États-Unis',
  'U.S.A.': 'États-Unis',
  US: 'États-Unis',
  'United States': 'États-Unis',
  'United States of America': 'États-Unis',
  UK: 'Royaume-Uni',
  'United Kingdom': 'Royaume-Uni',
  England: 'Angleterre',
  Scotland: 'Écosse',
  Wales: 'Pays de Galles',
  'Northern Ireland': 'Irlande du Nord',
  Ireland: 'Irlande',
  Canada: 'Canada',
  France: 'France',
  Belgium: 'Belgique',
  Switzerland: 'Suisse',
  Germany: 'Allemagne',
  'West Germany': 'Allemagne de l’Ouest',
  Austria: 'Autriche',
  Italy: 'Italie',
  Spain: 'Espagne',
  Portugal: 'Portugal',
  Netherlands: 'Pays-Bas',
  Sweden: 'Suède',
  Norway: 'Norvège',
  Denmark: 'Danemark',
  Finland: 'Finlande',
  Iceland: 'Islande',
  Poland: 'Pologne',
  Greece: 'Grèce',
  Russia: 'Russie',
  USSR: 'URSS',
  Ukraine: 'Ukraine',
  Israel: 'Israël',
  Turkey: 'Turquie',
  Egypt: 'Égypte',
  Morocco: 'Maroc',
  Algeria: 'Algérie',
  Tunisia: 'Tunisie',
  'South Africa': 'Afrique du Sud',
  Nigeria: 'Nigeria',
  India: 'Inde',
  China: 'Chine',
  'Hong Kong': 'Hong Kong',
  Taiwan: 'Taïwan',
  Japan: 'Japon',
  'South Korea': 'Corée du Sud',
  Korea: 'Corée du Sud',
  Philippines: 'Philippines',
  Thailand: 'Thaïlande',
  Australia: 'Australie',
  'New Zealand': 'Nouvelle-Zélande',
  Mexico: 'Mexique',
  Brazil: 'Brésil',
  Argentina: 'Argentine',
  Chile: 'Chili',
  Colombia: 'Colombie',
  Cuba: 'Cuba',
  'Puerto Rico': 'Porto Rico',
};

const CITIES: Record<string, string> = {
  'New York City': 'New York',
  London: 'Londres',
};

/** « New York City, New York, USA » → « New York, États-Unis ». */
export function birthPlace(place: string | undefined): string | undefined {
  const parts = (place ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (first === undefined || last === undefined) return undefined;
  const city = CITIES[first] ?? first;
  if (parts.length === 1) return COUNTRIES[city] ?? city;
  return `${city}, ${COUNTRIES[last] ?? last}`;
}

/** « 27 décembre 1995 », « 1er septembre 1996 » (date ISO sans heure : pas de décalage de fuseau). */
export function longIsoDate(iso: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return undefined;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return undefined;
  const day = Number(match[3]);
  return `${day === 1 ? '1er' : day} ${month} ${match[1]}`;
}

function bornWord(gender: TmdbGender): string {
  if (gender === 1) return 'Née';
  if (gender === 2) return 'Né';
  return 'Né·e';
}

/** « Né le 27 décembre 1995 à New York, États-Unis » ; sans données : texte de repli. */
export function birthLine(
  gender: TmdbGender,
  birthday: string | undefined,
  place: string | undefined,
): string {
  const date = birthday ? longIsoDate(birthday) : undefined;
  const where = birthPlace(place);
  if (!date && !where) return 'Date et lieu de naissance non renseignés';
  const parts = [bornWord(gender)];
  if (date) parts.push(`le ${date}`);
  if (where) parts.push(`à ${where}`);
  return parts.join(' ');
}

export type PersonRole = { title: string; character?: string };

/** Sans biographie TMDB : « Zendaya est connue pour Dune (Chani), Euphoria (Rue)… ». */
export function generatedBiography(
  name: string,
  gender: TmdbGender,
  roles: readonly PersonRole[],
): string | undefined {
  if (roles.length === 0) return undefined;
  const known = gender === 1 ? 'connue' : gender === 2 ? 'connu' : 'connu·e';
  const works = roles
    .map((role) => (role.character ? `${role.title} (${role.character})` : role.title))
    .join(', ');
  return `${name} est ${known} pour ${works}…`;
}

export type FilmographyTab = 'movie' | 'tv';
export type FilmographySort = 'pop' | 'recent';

export type Credit = {
  id: string;
  type: MediaType;
  popularity?: number;
  /** AAAA-MM-JJ ; absent pour un projet sans date. */
  releaseDate?: string;
};

/**
 * Films, ou Séries (séries et animés réunis). Popularité décroissante, ou date
 * décroissante (titres sans date à la fin).
 */
export function filmography<T extends Credit>(
  credits: readonly T[],
  tab: FilmographyTab,
  sort: FilmographySort,
): T[] {
  const ofTab = credits.filter((c) => (tab === 'movie' ? c.type === 'movie' : c.type !== 'movie'));
  if (sort === 'pop') {
    return [...ofTab].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }
  return [...ofTab].sort((a, b) => {
    if (!a.releaseDate) return b.releaseDate ? 1 : 0;
    if (!b.releaseDate) return -1;
    return b.releaseDate.localeCompare(a.releaseDate);
  });
}
