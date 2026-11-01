/** Fiche film : méta, bandeau de statut, Équipe et Infos — specs/docs/07 §7.1, docs/01 §5. */
import { t } from '@/i18n';

import {
  countryLabel,
  isAfterToday,
  movieState,
  type MovieAvailability,
  type MovieState,
} from './availability';
import { formatLongDate, formatRuntime, formatShortDate } from './format';

export type MovieMetaInput = { year?: number; runtime?: number; certification?: string };

/** « 2024 · 2 h 46 · 13+ », en omettant les valeurs absentes. */
export function movieMeta({ year, runtime, certification }: MovieMetaInput): string {
  return [year, runtime ? formatRuntime(runtime) : undefined, certification]
    .filter((part) => part !== undefined && part !== '')
    .join(' · ');
}

export type MovieStatus = { state: MovieState; digital: boolean; text: string };

export function movieStatus(movie: MovieAvailability, now: Date): MovieStatus {
  const state = movieState(movie, now);
  switch (state) {
    case 'upcoming':
      return {
        state,
        digital: false,
        text: movie.releaseTheatrical
          ? t('common.movie.inTheatersOn', { date: formatShortDate(movie.releaseTheatrical) })
          : t('common.movie.noDateYet'),
      };
    case 'cinema':
      return { state, digital: false, text: t('common.movie.inCinemaNow') };
    case 'avail':
      // Une date numérique à venir (offre en précommande) ne dit pas « depuis ».
      return movie.releaseDigital && !isAfterToday(movie.releaseDigital, now)
        ? {
            state,
            digital: true,
            text: t('common.movie.digitalSince', { date: formatShortDate(movie.releaseDigital) }),
          }
        : { state, digital: false, text: t('common.movie.streaming') };
    case 'unknown':
      return { state, digital: false, text: t('common.movie.noDateYet') };
  }
}

/**
 * « Où regarder » sans aucune offre : encore au cinéma et date de sortie numérique à venir,
 * avec son pays quand ce n'est pas le mien (TMDB n'a souvent que la date américaine).
 */
export function noOfferText(
  movie: MovieAvailability & { releaseDigitalCountry?: string },
  region: string | undefined,
  now: Date,
): string {
  const parts: string[] = [];
  if (movieState(movie, now) === 'cinema') parts.push(t('common.movie.onlyCinema'));
  if (isAfterToday(movie.releaseDigital, now)) {
    const country = movie.releaseDigitalCountry
      ? countryLabel([movie.releaseDigitalCountry], region)
      : undefined;
    const date = formatLongDate(movie.releaseDigital);
    parts.push(
      country
        ? t('common.movie.digitalOnIn', { date, country })
        : t('common.movie.digitalOn', { date }),
    );
  }
  return parts.length > 0 ? parts.join(' ') : t('common.movie.availabilityUnknown');
}

export type InfoRow = {
  key: string;
  value: string;
  /** Personnes cliquables (fiche personne) ; `value` reste le texte de repli. */
  people?: { id: number; name: string }[];
  /** Studios cliquables (liste de leurs titres). */
  studios?: { id: number; name: string }[];
};

function rows(entries: [string, string | undefined][]): InfoRow[] {
  return entries.flatMap(([key, value]) => (value ? [{ key, value }] : []));
}

/** Ligne de noms cliquables (fiche personne) quand chaque nom a son identifiant. */
export function personRow(key: string, names: string[], ids: number[]): InfoRow[] {
  if (names.length === 0) return [];
  const people = names.flatMap((name, index) =>
    ids[index] === undefined ? [] : [{ id: ids[index], name }],
  );
  return [
    { key, value: names.join(', '), people: people.length === names.length ? people : undefined },
  ];
}

export function movieCrew(movie: {
  directors: string[];
  directorIds?: number[];
  writers: string[];
  writerIds?: number[];
}): InfoRow[] {
  return [
    ...personRow(t('common.crew.direction'), movie.directors, movie.directorIds ?? []),
    ...personRow(t('common.crew.writing'), movie.writers, movie.writerIds ?? []),
  ];
}

export type MovieInfoInput = {
  originalTitle?: string;
  releaseTheatrical?: string;
  originalLanguage?: string;
  country?: string;
  studio?: string;
};

/** Lignes « Infos ». */
export function movieInfos(movie: MovieInfoInput): InfoRow[] {
  return rows([
    [t('common.info.originalTitle'), movie.originalTitle],
    [
      t('common.info.release'),
      movie.releaseTheatrical ? formatLongDate(movie.releaseTheatrical) : undefined,
    ],
    [t('common.info.originalLanguage'), movie.originalLanguage],
    [t('common.info.country'), movie.country],
    [t('common.info.studio'), movie.studio],
  ]);
}
