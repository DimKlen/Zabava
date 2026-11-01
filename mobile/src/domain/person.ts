/** Fiche personne — specs/docs/07 §7.3. */
import { currentLanguage, t } from '@/i18n';

import type { MediaType } from './types';

/** Genre TMDB : 1 = femme, 2 = homme, 0 ou 3 = inconnu / non binaire. */
export type TmdbGender = number | undefined;

/** Pays de naissance TMDB (en anglais) → français. Inconnu : laissé tel quel. */
const COUNTRIES_FR: Record<string, string> = {
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

/** Pays de naissance TMDB (en anglais) → code ISO, pour les langues autres que le français. */
const COUNTRY_CODES: Record<string, string> = {
  USA: 'US',
  'U.S.A.': 'US',
  US: 'US',
  'United States': 'US',
  'United States of America': 'US',
  UK: 'GB',
  'United Kingdom': 'GB',
  Ireland: 'IE',
  Canada: 'CA',
  France: 'FR',
  Belgium: 'BE',
  Switzerland: 'CH',
  Germany: 'DE',
  Austria: 'AT',
  Italy: 'IT',
  Spain: 'ES',
  Portugal: 'PT',
  Netherlands: 'NL',
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Finland: 'FI',
  Iceland: 'IS',
  Poland: 'PL',
  Greece: 'GR',
  Russia: 'RU',
  Ukraine: 'UA',
  Israel: 'IL',
  Turkey: 'TR',
  Egypt: 'EG',
  Morocco: 'MA',
  Algeria: 'DZ',
  Tunisia: 'TN',
  'South Africa': 'ZA',
  Nigeria: 'NG',
  India: 'IN',
  China: 'CN',
  'Hong Kong': 'HK',
  Taiwan: 'TW',
  Japan: 'JP',
  'South Korea': 'KR',
  Korea: 'KR',
  Philippines: 'PH',
  Thailand: 'TH',
  Australia: 'AU',
  'New Zealand': 'NZ',
  Mexico: 'MX',
  Brazil: 'BR',
  Argentina: 'AR',
  Chile: 'CL',
  Colombia: 'CO',
  Cuba: 'CU',
  'Puerto Rico': 'PR',
};

/** Nom d'un pays de naissance dans la langue courante ; inconnu ou non géré : le nom TMDB tel quel. */
function countryName(name: string): string {
  const language = currentLanguage();
  if (language === 'fr') return COUNTRIES_FR[name] ?? name;
  const code = COUNTRY_CODES[name];
  if (!code) return name;
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? name;
  } catch {
    return name;
  }
}

const CITIES_FR: Record<string, string> = {
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
  const city = currentLanguage() === 'fr' ? (CITIES_FR[first] ?? first) : first;
  if (parts.length === 1) return countryName(city);
  return `${city}, ${countryName(last)}`;
}

/** « 27 décembre 1995 », « 1er septembre 1996 » (date ISO sans heure : pas de décalage de fuseau). */
export function longIsoDate(iso: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12) return undefined;
  const language = currentLanguage();
  const text = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return language === 'fr' && day === 1 ? text.replace(/^1/, '1er') : text;
}

type GenderSuffix = 'F' | 'M' | 'X';

function genderSuffix(gender: TmdbGender): GenderSuffix {
  if (gender === 1) return 'F';
  if (gender === 2) return 'M';
  return 'X';
}

/** « Né le 27 décembre 1995 à New York, États-Unis » ; sans données : texte de repli. */
export function birthLine(
  gender: TmdbGender,
  birthday: string | undefined,
  place: string | undefined,
): string {
  const date = birthday ? longIsoDate(birthday) : undefined;
  const where = birthPlace(place);
  const suffix = genderSuffix(gender);
  if (date && where) return t(`common.person.born${suffix}`, { date, place: where });
  if (date) return t(`common.person.bornDate${suffix}`, { date });
  if (where) return t(`common.person.bornPlace${suffix}`, { place: where });
  return t('common.person.bornUnknown');
}

export type PersonRole = { title: string; character?: string };

/** Sans biographie TMDB : « Zendaya est connue pour Dune (Chani), Euphoria (Rue)… ». */
export function generatedBiography(
  name: string,
  gender: TmdbGender,
  roles: readonly PersonRole[],
): string | undefined {
  if (roles.length === 0) return undefined;
  const works = roles
    .map((role) => (role.character ? `${role.title} (${role.character})` : role.title))
    .join(', ');
  return t(`common.person.bio${genderSuffix(gender)}`, { name, works });
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
